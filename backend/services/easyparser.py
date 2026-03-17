import httpx
import os
import time
from dotenv import load_dotenv

load_dotenv()

EASYPARSER_API_KEY = os.getenv("EASYPARSER_API_KEY")
BASE_URL = "https://realtime.easyparser.com/v1/request"

# In-memory cache — aynı ASIN için tekrar API çağrısı yapma
_cache = {}
CACHE_TTL = 3600  # 1 saat

def get_cache(key: str):
    if key in _cache:
        data, ts = _cache[key]
        if time.time() - ts < CACHE_TTL:
            print(f"[CACHE HIT] {key}")
            return data
        del _cache[key]
    return None

def set_cache(key: str, data):
    _cache[key] = (data, time.time())
    print(f"[CACHE SET] {key} — toplam {len(_cache)} kayıt")

async def search_products(keyword: str, page: int = 1):
    cache_key = f"search:{keyword}:{page}"
    cached = get_cache(cache_key)
    if cached:
        return cached
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(BASE_URL, params={
                "api_key": EASYPARSER_API_KEY, "platform": "AMZ",
                "operation": "SEARCH", "domain": ".com",
                "keyword": keyword, "page": page
            })
            if response.status_code == 200:
                result = format_search_results(response.json())
                set_cache(cache_key, result)
                return result
            print(f"Easyparser error: {response.status_code}")
            return get_mock_search(keyword)
    except Exception as e:
        print(f"Easyparser exception: {e}")
        return get_mock_search(keyword)

async def get_product(asin: str):
    cache_key = f"product:{asin}"
    cached = get_cache(cache_key)
    if cached:
        return cached
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(BASE_URL, params={
                "api_key": EASYPARSER_API_KEY, "platform": "AMZ",
                "operation": "DETAIL", "domain": ".com", "asin": asin
            })
            if response.status_code == 200:
                result = format_product(response.json(), asin)
                set_cache(cache_key, result)
                return result
            print(f"Easyparser error: {response.status_code}")
            return get_mock_product(asin)
    except Exception as e:
        print(f"Easyparser exception: {e}")
        return get_mock_product(asin)

async def check_availability(asin: str):
    product = await get_product(asin)
    return {
        "asin": asin,
        "available": product.get("in_stock", True),
        "price": product.get("price", 0),
        "title": product.get("title", ""),
        "image": product.get("image", ""),
    }

def format_search_results(data: dict):
    results = []
    result = data.get("result", {})
    items = result.get("search_results", []) if isinstance(result, dict) else (result if isinstance(result, list) else [])
    for item in items:
        image = item.get("image", "")
        if image and not image.startswith("http"):
            image = f"https://m.media-amazon.com/images/I/{image}.jpg"
        price_data = item.get("price", {})
        price = price_data.get("value", price_data.get("current", 0)) if isinstance(price_data, dict) else (price_data or 0)
        results.append({
            "asin": item.get("asin", ""),
            "title": item.get("title", ""),
            "price": price,
            "rating": item.get("rating", item.get("stars", 0)),
            "reviews_count": item.get("reviews", item.get("ratings_total", 0)),
            "image": image,
            "url": f"https://amazon.com/dp/{item.get('asin', '')}",
            "bestseller_rank": item.get("bsr", 0),
            "in_stock": item.get("in_stock", True),
            "category": item.get("category", ""),
        })
    return {"results": results, "total": len(results), "mock": False}

def format_product(data: dict, asin: str):
    # Fiyat
    price_data = data.get("price", {})
    price_val = price_data.get("value", price_data.get("current", 0)) if isinstance(price_data, dict) else (price_data or 0)

    # Satıcı sayısı
    sellers_count = (
        data.get("sellers_count") or data.get("number_of_sellers") or
        data.get("seller_count") or data.get("offers_count") or
        len(data.get("offers", [])) or None
    )

    # FBA / FBM
    fulfillment = data.get("fulfillment") or data.get("fulfillment_type") or data.get("fulfilled_by") or ""
    if isinstance(fulfillment, dict):
        fulfillment = fulfillment.get("type", fulfillment.get("by", ""))
    fstr = str(fulfillment).upper()
    if "FBA" in fstr or "AMAZON" in fstr:
        fba_status = "FBA"
    elif "FBM" in fstr or "MERCHANT" in fstr or "SELLER" in fstr:
        fba_status = "FBM"
    else:
        fba_status = None

    # Buybox
    buybox = data.get("buybox", data.get("buy_box", {}))
    buybox_seller = ""
    if isinstance(buybox, dict):
        buybox_seller = buybox.get("seller_name", buybox.get("merchant", ""))
        if not fba_status:
            bf = str(buybox.get("fulfillment", buybox.get("fulfilled_by", ""))).upper()
            if "FBA" in bf or "AMAZON" in bf: fba_status = "FBA"
            elif "FBM" in bf or "MERCHANT" in bf: fba_status = "FBM"

    # Varyantlar
    raw_variants = data.get("variants") or data.get("variations") or data.get("asin_variants") or []
    variants = []
    if isinstance(raw_variants, list):
        for v in raw_variants[:20]:
            if isinstance(v, dict):
                v_asin = v.get("asin", v.get("id", ""))
                v_price = v.get("price", 0)
                if isinstance(v_price, dict): v_price = v_price.get("value", 0)
                if v_asin:
                    variants.append({
                        "asin": v_asin,
                        "title": v.get("title", v.get("name", v.get("value", ""))),
                        "image": v.get("image", v.get("image_url", "")),
                        "price": v_price,
                        "is_current": v_asin == asin
                    })

    # Görsel
    image = data.get("image", data.get("image_url", data.get("main_image", "")))
    if image and not image.startswith("http"):
        image = f"https://m.media-amazon.com/images/I/{image}.jpg"

    additional_images = data.get("images", data.get("gallery_images", []))
    if isinstance(additional_images, list):
        additional_images = [
            img if img.startswith("http") else f"https://m.media-amazon.com/images/I/{img}.jpg"
            for img in additional_images[:5] if img
        ]

    # BSR
    bsr = data.get("bsr", data.get("bestseller_rank", 0))
    if isinstance(bsr, list) and bsr:
        bsr = bsr[0].get("rank", 0) if isinstance(bsr[0], dict) else bsr[0]

    return {
        "asin": asin,
        "title": data.get("title", ""),
        "price": price_val,
        "rating": data.get("rating", data.get("rating_value", 0)),
        "reviews_count": data.get("reviews", data.get("reviews_count", data.get("ratings_total", 0))),
        "image": image,
        "images": additional_images,
        "url": f"https://amazon.com/dp/{asin}",
        "bestseller_rank": bsr,
        "in_stock": data.get("in_stock", True),
        "dimensions": data.get("dimensions", {"weight": 0.5}),
        "category": data.get("category", data.get("category_name", "")),
        "sellers_count": sellers_count,
        "fba_status": fba_status,
        "buybox_seller": buybox_seller,
        "variants": variants,
        "variant_types": data.get("variant_types", data.get("variation_attributes", [])),
        "brand": data.get("brand", data.get("brand_name", "")),
        "features": data.get("features", data.get("bullet_points", [])),
        "description": data.get("description", ""),
        "mock": False
    }

def get_mock_search(keyword: str):
    return {
        "results": [
            {"asin": "B00MOCK001", "title": f"{keyword} - Premium Product", "price": 29.99,
             "rating": 4.5, "reviews_count": 1250, "image": "https://placehold.co/200x200?text=Product",
             "url": "https://amazon.com/dp/B00MOCK001", "bestseller_rank": 1250, "in_stock": True, "category": ""},
            {"asin": "B00MOCK002", "title": f"{keyword} - Budget Option", "price": 14.99,
             "rating": 4.2, "reviews_count": 856, "image": "https://placehold.co/200x200?text=Product",
             "url": "https://amazon.com/dp/B00MOCK002", "bestseller_rank": 3400, "in_stock": True, "category": ""},
            {"asin": "B00MOCK003", "title": f"{keyword} - Unavailable", "price": 0,
             "rating": 4.0, "reviews_count": 423, "image": "https://placehold.co/200x200?text=Unavailable",
             "url": "https://amazon.com/dp/B00MOCK003", "bestseller_rank": 0, "in_stock": False, "category": ""}
        ],
        "total": 3, "mock": True
    }

def get_mock_product(asin: str):
    seed = sum(ord(c) for c in asin)
    mock_variants = []
    for i, color in enumerate(["Siyah", "Beyaz", "Mavi"][:3]):
        mock_variants.append({
            "asin": f"B0MOCK{(seed % 1000):04d}{i}",
            "title": color,
            "image": f"https://placehold.co/80x80?text={color[0]}",
            "price": round(29.99 + i * 2, 2),
            "is_current": i == 0
        })
    return {
        "asin": asin, "title": "Mock Product Title", "price": 29.99,
        "rating": 4.5, "reviews_count": 1250,
        "image": "https://placehold.co/200x200?text=Product", "images": [],
        "url": f"https://amazon.com/dp/{asin}", "bestseller_rank": 1250,
        "in_stock": True, "dimensions": {"weight": 0.5},
        "category": "Sports & Outdoors",
        "sellers_count": (seed % 12) + 1,
        "fba_status": "FBA" if seed % 2 == 0 else "FBM",
        "buybox_seller": "Amazon.com",
        "variants": mock_variants,
        "variant_types": ["Renk"],
        "brand": "Mock Brand",
        "features": ["Yüksek kaliteli malzeme", "Kolay kullanım", "1 yıl garanti"],
        "description": "", "mock": True
    }
