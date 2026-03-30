"""
ScraperAPI Amazon Structured Data Service
Easyparser fiyat=0 döndürünce fallback olarak devreye giriyor.
Endpoint: https://api.scraperapi.com/structured/amazon/product
"""
import httpx
import os
import re
from dotenv import load_dotenv

load_dotenv()
SCRAPERAPI_KEY = os.getenv("SCRAPERAPI_KEY", "")


def _parse_price(raw) -> float:
    """'$29.99', '29.99', 29.99 → 29.99"""
    if not raw:
        return 0.0
    if isinstance(raw, (int, float)):
        return float(raw)
    cleaned = re.sub(r"[^\d.]", "", str(raw))
    try:
        return float(cleaned)
    except Exception:
        return 0.0


def _map_scraperapi_product(data: dict, asin: str) -> dict:
    """ScraperAPI structured response → bizim format"""
    pricing = data.get("pricing", {})
    price = _parse_price(pricing.get("price") or data.get("price"))

    product_info = data.get("product_information", {})

    # BSR — "Best Sellers Rank" alanında #1,234 gibi geliyor
    bsr_raw = (
        product_info.get("best_sellers_rank")
        or product_info.get("bestsellers_rank")
        or data.get("bestseller_rank", 0)
    )
    bsr = 0
    if bsr_raw:
        nums = re.findall(r"[\d,]+", str(bsr_raw))
        if nums:
            try:
                bsr = int(nums[0].replace(",", ""))
            except Exception:
                bsr = 0

    images = data.get("images", [])
    main_image = images[0] if images else data.get("image", "")

    rating_raw = data.get("rating") or product_info.get("customer_reviews", "")
    rating = 0.0
    if rating_raw:
        m = re.search(r"([\d.]+)", str(rating_raw))
        if m:
            try:
                rating = float(m.group(1))
            except Exception:
                rating = 0.0

    reviews_raw = (
        data.get("total_reviews")
        or data.get("number_of_reviews")
        or product_info.get("number_of_reviews", 0)
    )
    reviews_count = 0
    if reviews_raw:
        nums = re.findall(r"[\d,]+", str(reviews_raw))
        if nums:
            try:
                reviews_count = int(nums[0].replace(",", ""))
            except Exception:
                reviews_count = 0

    return {
        "asin": asin,
        "title": data.get("name") or data.get("title", ""),
        "price": price,
        "rating": rating,
        "reviews_count": reviews_count,
        "image": main_image,
        "images": images[1:6],
        "url": f"https://amazon.com/dp/{asin}",
        "bestseller_rank": bsr,
        "in_stock": True,
        "dimensions": {"weight": 0.5},
        "category": data.get("category", ""),
        "sellers_count": None,
        "fba_status": None,
        "buybox_seller": "",
        "variants": [],
        "variant_types": [],
        "brand": data.get("brand", product_info.get("brand", "")),
        "features": data.get("feature_bullets", []),
        "description": data.get("description", ""),
        "mock": False,
        "source": "scraperapi",
    }


async def get_product_scraperapi(asin: str, country: str = "us") -> dict | None:
    """
    ScraperAPI structured endpoint ile ürün verisi çek.
    Easyparser fiyat=0 veya başlık boş döndürünce fallback olarak kullanılır.
    """
    if not SCRAPERAPI_KEY:
        return None

    url = (
        f"https://api.scraperapi.com/structured/amazon/product"
        f"?api_key={SCRAPERAPI_KEY}"
        f"&asin={asin}"
        f"&country={country}"
    )

    try:
        async with httpx.AsyncClient(timeout=30, verify=False) as client:
            r = await client.get(url)
            if r.status_code == 200:
                data = r.json()
                if data.get("name") or data.get("title"):
                    result = _map_scraperapi_product(data, asin)
                    print(f"[ScraperAPI structured] {asin} — price={result['price']}, title={result['title'][:40]}")
                    return result
            print(f"[ScraperAPI structured] {asin} — HTTP {r.status_code}")
    except Exception as e:
        print(f"[ScraperAPI structured] {asin} error: {e}")

    return None
