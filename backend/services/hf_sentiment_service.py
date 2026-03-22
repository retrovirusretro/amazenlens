"""
HuggingFace XLM-RoBERTa Sentiment Servisi
Kaynak: cardiffnlp/twitter-xlm-roberta-base-sentiment
- 100 dil destegi (TR dahil)
- Tamamen ucretsiz
- Review ABSA (5 boyut) analizi
"""
import os
import httpx
import asyncio
from typing import Optional

HF_API_TOKEN = os.getenv("HF_API_TOKEN", "")
HF_BASE_URL = "https://api-inference.huggingface.co/models"

# Model secimi
SENTIMENT_MODEL = "cardiffnlp/twitter-xlm-roberta-base-sentiment"
ABSA_MODEL = "yangheng/deberta-v3-base-absa-v1.1"
ZERO_SHOT_MODEL = "facebook/bart-large-mnli"

HEADERS = {"Authorization": f"Bearer {HF_API_TOKEN}"}

# Cache — ayni metin tekrar analiz edilmesin
_cache = {}

# ABSA boyutlari
ABSA_ASPECTS = {
    "price":    ["price", "cost", "value", "expensive", "cheap", "worth", "fiyat", "ucuz", "pahali"],
    "quality":  ["quality", "material", "build", "sturdy", "durable", "kalite", "malzeme"],
    "shipping": ["shipping", "delivery", "arrived", "fast", "slow", "kargo", "teslimat"],
    "durability": ["durability", "lasted", "broke", "broken", "still working", "dayanikli", "bozuldu"],
    "service":  ["service", "support", "return", "refund", "customer", "musteri", "destek"],
}


async def analyze_sentiment(text: str, model: str = SENTIMENT_MODEL) -> dict:
    """Tek metin icin sentiment analizi"""
    if not HF_API_TOKEN:
        return {"label": "neutral", "score": 0.5, "mock": True}

    cache_key = f"{model}:{text[:100]}"
    if cache_key in _cache:
        return _cache[cache_key]

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            res = await client.post(
                f"{HF_BASE_URL}/{model}",
                headers=HEADERS,
                json={"inputs": text[:512]},
            )
            if res.status_code == 200:
                data = res.json()
                # Model yukleniyor olabilir
                if isinstance(data, dict) and "error" in data:
                    if "loading" in data.get("error", "").lower():
                        await asyncio.sleep(10)
                        res = await client.post(
                            f"{HF_BASE_URL}/{model}",
                            headers=HEADERS,
                            json={"inputs": text[:512]},
                        )
                        data = res.json()

                if isinstance(data, list) and data:
                    scores = data[0] if isinstance(data[0], list) else data
                    best = max(scores, key=lambda x: x.get("score", 0))
                    label_map = {
                        "POSITIVE": "positive", "LABEL_2": "positive",
                        "NEGATIVE": "negative", "LABEL_0": "negative",
                        "NEUTRAL":  "neutral",  "LABEL_1": "neutral",
                    }
                    result = {
                        "label": label_map.get(best["label"].upper(), best["label"].lower()),
                        "score": round(best["score"], 3),
                        "all_scores": {
                            label_map.get(s["label"].upper(), s["label"].lower()): round(s["score"], 3)
                            for s in scores
                        }
                    }
                    _cache[cache_key] = result
                    return result

    except Exception as e:
        print(f"HF sentiment error: {e}")

    return {"label": "neutral", "score": 0.5, "mock": True}


async def analyze_reviews_absa(reviews: list) -> dict:
    """
    Review listesi icin ABSA analizi.
    5 boyut: fiyat, kalite, kargo, dayaniklilik, musteri hizmetleri
    """
    if not reviews:
        return {"aspects": {}, "overall": "neutral", "mock": True}

    # Her review'u analiz et (max 20)
    sample = reviews[:20]

    # Paralel analiz
    tasks = [analyze_sentiment(r.get("text", r) if isinstance(r, dict) else r) for r in sample]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    # Genel sentiment
    scores = []
    for r in results:
        if isinstance(r, dict) and not isinstance(r, Exception):
            if r["label"] == "positive":
                scores.append(r["score"])
            elif r["label"] == "negative":
                scores.append(-r["score"])
            else:
                scores.append(0)

    overall_score = sum(scores) / len(scores) if scores else 0
    if overall_score > 0.1:
        overall = "positive"
    elif overall_score < -0.1:
        overall = "negative"
    else:
        overall = "neutral"

    # Boyut analizi — keyword matching + sentiment
    aspects = {
        "price":      {"positive": 0, "negative": 0, "neutral": 0, "total": 0, "score": 0},
        "quality":    {"positive": 0, "negative": 0, "neutral": 0, "total": 0, "score": 0},
        "shipping":   {"positive": 0, "negative": 0, "neutral": 0, "total": 0, "score": 0},
        "durability": {"positive": 0, "negative": 0, "neutral": 0, "total": 0, "score": 0},
        "service":    {"positive": 0, "negative": 0, "neutral": 0, "total": 0, "score": 0},
    }

    for i, review in enumerate(sample):
        text = (review.get("text", review) if isinstance(review, dict) else review).lower()
        sentiment = results[i] if not isinstance(results[i], Exception) else {"label": "neutral", "score": 0.5}

        for aspect, keywords in ABSA_ASPECTS.items():
            if any(kw in text for kw in keywords):
                label = sentiment.get("label", "neutral")
                aspects[aspect][label] += 1
                aspects[aspect]["total"] += 1
                if label == "positive":
                    aspects[aspect]["score"] += sentiment.get("score", 0.5)
                elif label == "negative":
                    aspects[aspect]["score"] -= sentiment.get("score", 0.5)

    # Normalize skorlar
    for aspect in aspects:
        total = aspects[aspect]["total"]
        if total > 0:
            aspects[aspect]["score"] = round(aspects[aspect]["score"] / total, 2)
            aspects[aspect]["sentiment"] = (
                "positive" if aspects[aspect]["score"] > 0.1
                else "negative" if aspects[aspect]["score"] < -0.1
                else "neutral"
            )
        else:
            aspects[aspect]["sentiment"] = "no_data"

    # Genel sentiment skoru 0-100
    sentiment_pct = int((overall_score + 1) / 2 * 100)

    return {
        "overall": overall,
        "overall_score": round(overall_score, 2),
        "sentiment_pct": sentiment_pct,
        "aspects": aspects,
        "total_analyzed": len(sample),
        "mock": False,
    }


async def bulk_sentiment(texts: list, batch_size: int = 5) -> list:
    """
    Toplu sentiment analizi — rate limit'e takilmamak icin batch'li
    """
    results = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        tasks = [analyze_sentiment(t) for t in batch]
        batch_results = await asyncio.gather(*tasks, return_exceptions=True)
        for r in batch_results:
            if isinstance(r, Exception):
                results.append({"label": "neutral", "score": 0.5, "error": str(r)})
            else:
                results.append(r)
        if i + batch_size < len(texts):
            await asyncio.sleep(1)  # Rate limit koruması
    return results


async def get_review_insights(reviews: list) -> dict:
    """
    Review'lardan actionable insights cikar.
    ABSA + en kritik pozitif/negatif konular
    """
    absa = await analyze_reviews_absa(reviews)

    # En iyi ve en kotu boyutlar
    scored_aspects = [
        (aspect, data["score"])
        for aspect, data in absa["aspects"].items()
        if data["total"] > 0
    ]
    scored_aspects.sort(key=lambda x: x[1], reverse=True)

    strengths = [a for a, s in scored_aspects if s > 0.1]
    weaknesses = [a for a, s in scored_aspects if s < -0.1]

    aspect_tr = {
        "price": "Fiyat",
        "quality": "Kalite",
        "shipping": "Kargo",
        "durability": "Dayaniklilik",
        "service": "Musteri Hizmetleri",
    }

    insights = []
    for weakness in weaknesses[:3]:
        insights.append({
            "type": "opportunity",
            "aspect": weakness,
            "aspect_tr": aspect_tr.get(weakness, weakness),
            "message": f"{aspect_tr.get(weakness, weakness)} konusundaki sikayetleri cozen urun on plana cik",
        })
    for strength in strengths[:2]:
        insights.append({
            "type": "strength",
            "aspect": strength,
            "aspect_tr": aspect_tr.get(strength, strength),
            "message": f"{aspect_tr.get(strength, strength)} guclu yonde — listingde one cikar",
        })

    return {
        **absa,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "insights": insights,
        "hf_model": SENTIMENT_MODEL,
    }
