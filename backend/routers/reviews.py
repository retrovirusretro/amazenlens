from fastapi import APIRouter, HTTPException, Query
from services.review_analyzer import analyze_reviews, get_mock_analysis, get_top_reviews, analyze_pain_points, score_review_helpfulness
import httpx
import os
from urllib.parse import quote

router = APIRouter(prefix="/api/reviews", tags=["Reviews"])

SCRAPERAPI_KEY = os.getenv("SCRAPERAPI_KEY", "")


async def fetch_amazon_reviews_scraperapi(asin: str) -> list[dict]:
    """
    ScraperAPI ile Amazon yorumlarını çek.
    1. autoparse=true dene — yapılandırılmış JSON döner, BeautifulSoup gerekmez
    2. Başarısız olursa device_type=mobile + BeautifulSoup fallback
    """
    if not SCRAPERAPI_KEY:
        return []

    amazon_url = f"https://www.amazon.com/product-reviews/{asin}/?sortBy=recent&reviewerType=all_reviews"

    # ── Adım 1: autoparse=true ile JSON dene ─────────────────────────────────
    autoparse_url = (
        f"https://api.scraperapi.com/"
        f"?api_key={SCRAPERAPI_KEY}"
        f"&url={quote(amazon_url, safe='')}"
        f"&autoparse=true"
        f"&device_type=mobile"
    )

    try:
        async with httpx.AsyncClient(timeout=30, verify=False) as client:
            res = await client.get(autoparse_url)
            if res.status_code == 200:
                try:
                    data = res.json()
                    raw_reviews = data.get("reviews") or data.get("customer_reviews") or []
                    if raw_reviews:
                        reviews = []
                        for r in raw_reviews[:25]:
                            body = r.get("body") or r.get("text") or r.get("review_text", "")
                            if not body:
                                continue
                            rating_raw = r.get("rating") or r.get("stars", "0")
                            try:
                                rating = float(str(rating_raw).split()[0])
                            except Exception:
                                rating = 0.0
                            reviews.append({
                                "text": body,
                                "title": r.get("title", ""),
                                "rating": rating,
                                "author": r.get("author") or r.get("reviewer_name", ""),
                                "date": r.get("date", ""),
                                "verified": r.get("verified_purchase", False),
                            })
                        if reviews:
                            print(f"ScraperAPI autoparse: {len(reviews)} reviews for {asin}")
                            return reviews
                except Exception:
                    pass  # JSON değilse HTML fallback'e geç
    except Exception as e:
        print(f"ScraperAPI autoparse error for {asin}: {e}")

    # ── Adım 2: mobile HTML + BeautifulSoup fallback ──────────────────────────
    mobile_url = (
        f"https://api.scraperapi.com/"
        f"?api_key={SCRAPERAPI_KEY}"
        f"&url={quote(amazon_url, safe='')}"
        f"&device_type=mobile"
    )

    try:
        async with httpx.AsyncClient(timeout=30, verify=False) as client:
            res = await client.get(mobile_url)
            if res.status_code != 200:
                print(f"ScraperAPI mobile status: {res.status_code}")
                return []

            html = res.text
            if "review" not in html.lower():
                print(f"ScraperAPI: No reviews in HTML for {asin}")
                return []

            from bs4 import BeautifulSoup
            soup = BeautifulSoup(html, "lxml")
            reviews = []

            for div in soup.select('[data-hook="review"]')[:25]:
                body_el = div.select_one('[data-hook="review-body"]')
                title_el = div.select_one('[data-hook="review-title"]')
                rating_el = div.select_one('[data-hook="review-star-rating"]')
                author_el = div.select_one('.a-profile-name')
                date_el = div.select_one('[data-hook="review-date"]')

                body = body_el.get_text(strip=True) if body_el else ""
                if not body:
                    continue

                rating_text = rating_el.get_text(strip=True) if rating_el else "0"
                try:
                    rating = float(rating_text.split()[0])
                except Exception:
                    rating = 0.0

                reviews.append({
                    "text": body,
                    "title": title_el.get_text(strip=True) if title_el else "",
                    "rating": rating,
                    "author": author_el.get_text(strip=True) if author_el else "",
                    "date": date_el.get_text(strip=True) if date_el else "",
                    "verified": False,
                })

            print(f"ScraperAPI mobile HTML: {len(reviews)} reviews for {asin}")
            return reviews

    except Exception as e:
        print(f"ScraperAPI mobile error for {asin}: {e}")
        return []


@router.get("/analyze/{asin}")
async def analyze_product_reviews(asin: str, title: str = Query(""), lang: str = Query("tr")):
    """ASIN için Love/Hate yorum analizi yap — ScraperAPI ile gerçek veriler"""
    lang = lang.split("-")[0] if lang else "tr"  # "en-US" → "en"
    try:
        # Önce Supabase cache kontrol et
        reviews = []
        cached_result = None

        try:
            from supabase import create_client
            import json
            from datetime import datetime, timedelta

            sb = create_client(
                os.getenv("SUPABASE_URL", ""),
                os.getenv("SUPABASE_SERVICE_KEY", "")
            )

            cache_asin_lang = f"{asin}_{lang}"
            row = sb.table("review_cache").select("*").eq("asin", cache_asin_lang).maybe_single().execute()
            if row.data:
                cached_at = datetime.fromisoformat(row.data["cached_at"].replace("Z", "+00:00"))
                if datetime.now().astimezone() - cached_at < timedelta(days=7):
                    print(f"Review cache hit for {asin} ({lang})")
                    cached_result = json.loads(row.data["result"])
        except Exception as e:
            print(f"Cache read error: {e}")

        if cached_result:
            return cached_result

        # ScraperAPI'den gerçek yorumları çek
        reviews = await fetch_amazon_reviews_scraperapi(asin)

        # Claude ile analiz et (lang parametresiyle)
        result = await analyze_reviews(asin, reviews, title, lang)

        # mock değilse Supabase'e kaydet
        if not result.get("mock") and reviews:
            try:
                import json
                from datetime import datetime
                sb.table("review_cache").upsert({
                    "asin": f"{asin}_{lang}",
                    "result": json.dumps(result),
                    "cached_at": datetime.utcnow().isoformat(),
                    "review_count": len(reviews),
                }).execute()
            except Exception as e:
                print(f"Cache write error: {e}")

        return result

    except Exception as e:
        print(f"Analyze error: {e}")
        return get_mock_analysis(asin, title)


@router.post("/features")
async def extract_review_features(data: dict):
    """spaCy NLP ile review'lardan ürün özelliği/şikayet/övgü çıkar"""
    reviews = data.get("reviews", [])
    lang = data.get("lang", "en")
    if not reviews:
        raise HTTPException(status_code=400, detail="reviews gerekli")
    try:
        from services.review_features import extract_features
        return extract_features(reviews, lang=lang)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/helpfulness")
async def review_helpfulness(data: dict):
    """
    Review listesinden en yardımlı 20 yorumu öne çıkar.
    Kaynak: arXiv:2412.02884 — %96.91 doğruluk
    """
    reviews = data.get("reviews", [])
    n = data.get("n", 20)
    if not reviews:
        raise HTTPException(status_code=400, detail="Reviews gerekli")
    try:
        top = get_top_reviews(reviews, n=n)
        pain = analyze_pain_points(reviews)
        return {
            "top_reviews": top,
            "total_input": len(reviews),
            "top_count": len(top),
            "pain_points": pain,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/score-single")
async def score_single_review(review: dict):
    """Tek bir yorum için helpfulness skoru hesapla"""
    try:
        score = score_review_helpfulness(review)
        return {"helpfulness_score": score, "review": review}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── HuggingFace Sentiment Endpoints ─────────────────────────────────────────

@router.post("/sentiment")
async def hf_sentiment(data: dict):
    """
    HuggingFace XLM-RoBERTa ile sentiment analizi.
    100 dil destegi, ucretsiz.
    """
    text = data.get("text", "")
    if not text:
        raise HTTPException(status_code=400, detail="text gerekli")
    try:
        from services.hf_sentiment_service import analyze_sentiment
        return await analyze_sentiment(text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/absa")
async def hf_absa(data: dict):
    """
    ABSA — 5 boyutlu review analizi.
    Boyutlar: fiyat, kalite, kargo, dayaniklilik, musteri hizmetleri
    """
    reviews = data.get("reviews", [])
    if not reviews:
        raise HTTPException(status_code=400, detail="reviews gerekli")
    try:
        from services.hf_sentiment_service import analyze_reviews_absa
        return await analyze_reviews_absa(reviews)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/insights")
async def hf_insights(data: dict):
    """
    Review'lardan actionable insights cikar.
    Guclu/zayif yonler + firsat analizi
    """
    reviews = data.get("reviews", [])
    if not reviews:
        raise HTTPException(status_code=400, detail="reviews gerekli")
    try:
        from services.hf_sentiment_service import get_review_insights
        return await get_review_insights(reviews)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analyze-hf/{asin}")
async def analyze_with_hf(asin: str, title: str = Query("")):
    """
    ASIN icin HF tabanli review analizi.
    Claude yerine ucretsiz HF modeli kullanir.
    """
    try:
        # ScraperAPI'den review cek
        reviews = await fetch_amazon_reviews_scraperapi(asin)

        # Mock review'lar (ScraperAPI yoksa)
        if not reviews:
            reviews = [
                {"text": f"Great product for {title}, very good quality and fast shipping"},
                {"text": f"The price is a bit high but quality is excellent"},
                {"text": f"Delivery was slow but product works well"},
                {"text": f"Good value for money, durable material"},
                {"text": f"Customer service was helpful when I had issues"},
            ]

        from services.hf_sentiment_service import get_review_insights
        insights = await get_review_insights(reviews)

        from services.review_analyzer import get_mock_analysis
        mock = get_mock_analysis(asin, title)

        return {
            **mock,
            "hf_insights": insights,
            "sentiment_pct": insights.get("sentiment_pct", mock.get("sentiment_score", 70)),
            "powered_by": "HuggingFace XLM-RoBERTa (free)",
        }

    except Exception as e:
        print(f"HF analyze error: {e}")
        from services.review_analyzer import get_mock_analysis
        return get_mock_analysis(asin, title)
