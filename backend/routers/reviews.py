from fastapi import APIRouter, HTTPException, Query
from services.review_analyzer import analyze_reviews, get_mock_analysis, get_top_reviews, analyze_pain_points, score_review_helpfulness
import httpx
import os

router = APIRouter(prefix="/api/reviews", tags=["Reviews"])

EASYPARSER_KEY = os.getenv("EASYPARSER_API_KEY", "")

@router.get("/analyze/{asin}")
async def analyze_product_reviews(asin: str, title: str = Query("")):
    """ASIN için Love/Hate yorum analizi yap"""
    try:
        # Easyparser'dan yorumları çek
        reviews = []
        try:
            async with httpx.AsyncClient(timeout=20) as client:
                res = await client.get(
                    "https://api.easyparser.io/amazon/reviews",
                    params={"asin": asin, "marketplace": "US", "page": 1},
                    headers={"X-API-KEY": EASYPARSER_KEY}
                )
                if res.status_code == 200:
                    data = res.json()
                    reviews = data.get("data", {}).get("reviews", [])
        except Exception as e:
            print(f"Review fetch error: {e}")

        # Claude ile analiz et
        result = await analyze_reviews(asin, reviews, title)
        return result

    except Exception as e:
        print(f"Analyze error: {e}")
        return get_mock_analysis(asin, title)


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
