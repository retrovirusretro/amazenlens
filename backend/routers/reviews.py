from fastapi import APIRouter, HTTPException, Query
from services.review_analyzer import analyze_reviews, get_mock_analysis
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
