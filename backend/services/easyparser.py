import httpx
import certifi
import os
import time
import json
from dotenv import load_dotenv
from datetime import datetime, timedelta, timezone

load_dotenv()

EASYPARSER_API_KEY = os.getenv("EASYPARSER_API_KEY")
BASE_URL = "https://realtime.easyparser.com/v1/request"

# Cache TTL ayarlari
CACHE_TTL_PRODUCT = 24 * 3600   # Urun detay: 24 saat
CACHE_TTL_SEARCH  = 6  * 3600   # Arama sonucu: 6 saat

# Token istatistikleri
_stats = {"cache_hits": 0, "api_calls": 0, "credits_saved": 0}

def get_easyparser_stats():
    total = _stats["cache_hits"] + _stats["api_calls"]
    return {
        **_stats,
        "total_requests": total,
        "cache_hit_rate_pct": int((_stats["cache_hits"] / total * 100) if total > 0 else 0),
    }

# ─── Supabase Cache ───────────────────────────────────────────────────────────
try:
    from database.supabase import get_supabase
    SUPABASE_AVAILABLE = True
except Exception:
    SUPABASE_AVAILABLE = False

# In-memory fallback (Supabase yoksa)
_mem_cache = {}

async def cache_get(key: str, ttl: int) -> dict | None:
    """Supabase veya memory cache'den veri al"""
    # 1. Supabase dene
    if SUPABASE_AVAILABLE:
        try:
            sb = get_supabase()
            res = sb.table("easyparser_cache").select("data,updated_at").eq("cache_key", key).execute()
            if res.data:
                row = res.data[0]
                updated = datetime.fromisoformat(row["updated_at"].replace("Z", "+00:00"))
                age = (datetime.now(updated.tzinfo) - updated).total_seconds()
                if age < ttl:
                    _stats["cache_hits"] += 1
                    _stats["credits_saved"] += 1
                    print(f"[SUPABASE CACHE HIT] {key} ({int(age/3600)}h old)")
                    return row["data"]
        except Exception as e:
            print(f"Supabase cache get error: {e}")

    # 2. Memory fallback
    if key in _mem_cache:
        data, ts = _mem_cache[key]
        if time.time() - ts < ttl:
            _stats["cache_hits"] += 1
            _stats["credits_saved"] += 1
            print(f"[MEMORY CACHE HIT] {key}")
            return data
        del _mem_cache[key]
    return None

async def cache_set(key: str, data: dict):
    """Supabase ve memory cache'e yaz"""
    # Memory'e yaz
    _mem_cache[key] = (data, time.time())

    # Supabase'e yaz
    if SUPABASE_AVAILABLE:
        try:
            sb = get_supabase()
            sb.table("easyparser_cache").upsert({
                "cache_key": key,
                "data": data,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }).execute()
            print(f"[SUPABASE CACHE SET] {key}")
        except Exception as e:
            print(f"Supabase cache set error: {e}")

async def search_products(keyword: str, page: int = 1, marketplace: str = ".com"):
    cache_key = f"search:{keyword}:{marketplace}:{page}"

    # Cache kontrol
    cached = await cache_get(cache_key, CACHE_TTL_SEARCH)
    if cached:
        return cached

    if not EASYPARSER_API_KEY:
        return get_mock_search(keyword)

    try:
        _stats["api_calls"] += 1
        async with httpx.AsyncClient(timeout=30, verify=certifi.where()) as client:
            response = await client.get(BASE_URL, params={
                "api_key": EASYPARSER_API_KEY, "platform": "AMZ",
                "operation": "SEARCH", "domain": marketplace,
                "keyword": keyword, "page": page
            })
            if response.status_code == 200:
                result = format_search_results(response.json())
                await cache_set(cache_key, result)
                return result
            print(f"Easyparser error: {response.status_code} — {response.text[:200]}")
            return get_mock_search(keyword)
    except Exception as e:
        print(f"Easyparser exception: {e}")
        return get_mock_search(keyword)

def _merge_search_into_product(item: dict, asin: str) -> dict:
    """Search sonucunu product formatina donustur"""
    image = item.get("image", "")
    if image and not image.startswith("http"):
        image = f"https://m.media-amazon.com/images/I/{image}.jpg"
    price_data = item.get("price", {})
    price = price_data.get("value", price_data.get("current", 0)) if isinstance(price_data, dict) else (price_data or 0)
    bsr = item.get("bsr", item.get("bestseller_rank", 0))
    if isinstance(bsr, list) and bsr:
        bsr = bsr[0].get("rank", 0) if isinstance(bsr[0], dict) else bsr[0]
    sellers_count = (
        item.get("sellers_count") or
        item.get("number_of_sellers") or
        item.get("offers_count") or
        len(item.get("offers", [])) or None
    )
    fulfillment = item.get("fulfillment") or item.get("fulfilled_by") or ""
    fstr = str(fulfillment).upper()
    if "FBA" in fstr or "AMAZON" in fstr:
        fba_status = "FBA"
    elif "FBM" in fstr or "MERCHANT" in fstr:
        fba_status = "FBM"
    else:
        fba_status = None
    return {
        "asin": asin,
        "title": item.get("title", ""),
        "price": price,
        "rating": item.get("rating", item.get("stars", 0)),
        "reviews_count": item.get("reviews", item.get("ratings_total", 0)),
        "image": image,
        "images": [],
        "url": f"https://amazon.com/dp/{asin}",
        "bestseller_rank": bsr,
        "in_stock": item.get("in_stock", True),
        "dimensions": {"weight": 0.5},
        "category": item.get("category", ""),
        "sellers_count": sellers_count,
        "fba_status": fba_status,
        "buybox_seller": "",
        "variants": [],
        "variant_types": [],
        "brand": item.get("brand", ""),
        "features": [],
        "description": "",
        "mock": False,
        "from_search": True,
    }


async def get_product(asin: str):
    cache_key = f"product:{asin}"

    # Cache kontrol — 24 saat
    cached = await cache_get(cache_key, CACHE_TTL_PRODUCT)
    if cached:
        return cached

    if not EASYPARSER_API_KEY:
        # Easyparser key yoksa ScraperAPI structured dene
        from services.scraperapi_amazon import get_product_scraperapi
        sa_result = await get_product_scraperapi(asin)
        if sa_result and sa_result.get("title") and sa_result.get("price", 0) > 0:
            await cache_set(cache_key, sa_result)
            return sa_result
        return get_mock_product(asin)

    try:
        _stats["api_calls"] += 1
        async with httpx.AsyncClient(timeout=30, verify=certifi.where()) as client:
            # Once DETAIL dene
            response = await client.get(BASE_URL, params={
                "api_key": EASYPARSER_API_KEY, "platform": "AMZ",
                "operation": "DETAIL", "domain": ".com", "asin": asin
            })
            if response.status_code == 200:
                data = response.json()
                result = format_product(data, asin)
                # Baslik bos geldiyse SEARCH ile fallback
                if not result.get("title"):
                    print(f"[DETAIL boş] {asin} — SEARCH fallback deneniyor")
                    search_res = await client.get(BASE_URL, params={
                        "api_key": EASYPARSER_API_KEY, "platform": "AMZ",
                        "operation": "SEARCH", "domain": ".com", "keyword": asin
                    })
                    if search_res.status_code == 200:
                        search_data = search_res.json()
                        items = search_data.get("result", {}).get("search_results", []) if isinstance(search_data.get("result"), dict) else []
                        if items:
                            matched = next((x for x in items if x.get("asin") == asin), items[0] if items else None)
                            if matched:
                                result = _merge_search_into_product(matched, asin)
                                print(f"[SEARCH fallback OK] {asin} — {result.get('title', '')[:50]}")
                # Fiyat hâlâ 0 ise ScraperAPI structured endpoint ile doldur
                if not result.get("price") or result["price"] == 0:
                    print(f"[Easyparser fiyat=0] {asin} — ScraperAPI structured fallback")
                    from services.scraperapi_amazon import get_product_scraperapi
                    sa = await get_product_scraperapi(asin)
                    if sa and sa.get("price", 0) > 0:
                        result["price"] = sa["price"]
                        if not result.get("bestseller_rank") and sa.get("bestseller_rank"):
                            result["bestseller_rank"] = sa["bestseller_rank"]
                        if not result.get("image") and sa.get("image"):
                            result["image"] = sa["image"]
                await cache_set(cache_key, result)
                return result
            print(f"Easyparser error: {response.status_code} — {response.text[:200]}")
            # 402/404'te SEARCH ile fallback
            search_res = await client.get(BASE_URL, params={
                "api_key": EASYPARSER_API_KEY, "platform": "AMZ",
                "operation": "SEARCH", "domain": ".com", "keyword": asin
            })
            if search_res.status_code == 200:
                search_data = search_res.json()
                items = search_data.get("result", {}).get("search_results", []) if isinstance(search_data.get("result"), dict) else []
                matched = next((x for x in items if x.get("asin") == asin), items[0] if items else None)
                if matched:
                    result = _merge_search_into_product(matched, asin)
                    await cache_set(cache_key, result)
                    return result
            return get_mock_product(asin)
    except Exception as e:
        print(f"Easyparser exception: {e}")
        return get_mock_product(asin)

async def check_availability(asin: str):
    product = await get_product(asin)
    from services.niche_calculator import calculate_niche_score
    niche = calculate_niche_score(product)
    return {
        "asin": asin,
        "available": product.get("in_stock", True),
        "price": product.get("price", 0),
        "title": product.get("title", ""),
        "image": product.get("image", ""),
        "niche_score": niche.get("total_score", 0),
        "bsr": product.get("bestseller_rank", 0),
        "reviews_count": product.get("reviews_count", 0),
        "rating": product.get("rating", 0),
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
        sellers_count = (
            item.get("sellers_count") or
            item.get("number_of_sellers") or
            item.get("offers_count") or
            len(item.get("offers", [])) or None
        )
        fulfillment = item.get("fulfillment") or item.get("fulfilled_by") or ""
        fstr = str(fulfillment).upper()
        if "FBA" in fstr or "AMAZON" in fstr:
            fba_status = "FBA"
        elif "FBM" in fstr or "MERCHANT" in fstr:
            fba_status = "FBM"
        else:
            fba_status = None
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
            "sellers_count": sellers_count,
            "fba_status": fba_status,
        })
    return {"results": results, "total": len(results), "mock": False}

def format_product(data: dict, asin: str):
    price_data = data.get("price", {})
    price_val = price_data.get("value", price_data.get("current", 0)) if isinstance(price_data, dict) else (price_data or 0)

    sellers_count = (
        data.get("sellers_count") or data.get("number_of_sellers") or
        data.get("seller_count") or data.get("offers_count") or
        len(data.get("offers", [])) or None
    )

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

    buybox = data.get("buybox", data.get("buy_box", {}))
    buybox_seller = ""
    if isinstance(buybox, dict):
        buybox_seller = buybox.get("seller_name", buybox.get("merchant", ""))
        if not fba_status:
            bf = str(buybox.get("fulfillment", buybox.get("fulfilled_by", ""))).upper()
            if "FBA" in bf or "AMAZON" in bf: fba_status = "FBA"
            elif "FBM" in bf or "MERCHANT" in bf: fba_status = "FBM"

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

    image = data.get("image", data.get("image_url", data.get("main_image", "")))
    if image and not image.startswith("http"):
        image = f"https://m.media-amazon.com/images/I/{image}.jpg"

    additional_images = data.get("images", data.get("gallery_images", []))
    if isinstance(additional_images, list):
        additional_images = [
            img if img.startswith("http") else f"https://m.media-amazon.com/images/I/{img}.jpg"
            for img in additional_images[:5] if img
        ]

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
            {"asin": "B00MOCK001", "title": f"{keyword} - Premium Product", "price": 29.99, "rating": 4.5, "reviews_count": 1250, "image": "https://placehold.co/200x200?text=Product", "url": "https://amazon.com/dp/B00MOCK001", "bestseller_rank": 1250, "in_stock": True, "category": ""},
            {"asin": "B00MOCK002", "title": f"{keyword} - Budget Option", "price": 14.99, "rating": 4.2, "reviews_count": 856, "image": "https://placehold.co/200x200?text=Product", "url": "https://amazon.com/dp/B00MOCK002", "bestseller_rank": 3400, "in_stock": True, "category": ""},
            {"asin": "B00MOCK003", "title": f"{keyword} - Unavailable", "price": 0, "rating": 4.0, "reviews_count": 423, "image": "https://placehold.co/200x200?text=Unavailable", "url": "https://amazon.com/dp/B00MOCK003", "bestseller_rank": 0, "in_stock": False, "category": ""}
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
