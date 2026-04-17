from fastapi import APIRouter, HTTPException, Query, Request
from services.easyparser import search_products, get_product, check_availability, get_easyparser_stats
from services.niche_calculator import calculate_niche_score, calculate_niche_score_with_keepa
from typing import List
from slowapi import Limiter
from slowapi.util import get_remote_address
import asyncio
import random

limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/api/amazon", tags=["Amazon"])

QUICK_PICKS_KEYWORDS = [
    "yoga mat", "silikon mutfak seti", "led masa lambası",
    "resistance bands", "bambu kesme tahtası", "bluetooth kulaklık",
    "protein shaker", "laptop stand", "cable organizer",
    "foam roller", "water bottle", "desk organizer",
]

@router.get("/search")
async def search(keyword: str = Query(...), page: int = Query(1)):
    result = await search_products(keyword, page)
    products = result.get("results", [])

    for product in products:
        try:
            niche = calculate_niche_score(product)
            product["niche_score"] = niche.get("total_score", 0)
        except Exception:
            product["niche_score"] = 0

    # Keepa ile BSR zenginleştirme — best-effort, 8 sn timeout
    try:
        from services.keepa_service import enrich_search_with_bsr
        bsr_map = await asyncio.wait_for(
            enrich_search_with_bsr(products[:10]),
            timeout=8.0
        )
        for product in products:
            asin = product.get("asin", "")
            if asin in bsr_map and bsr_map[asin]:
                product["bestseller_rank"] = bsr_map[asin]
    except asyncio.TimeoutError:
        print(f"[Search] BSR enrichment timeout — BSR'sız döndürülüyor")
    except Exception as e:
        print(f"[Search] BSR enrichment hata: {e}")

    return result

@router.get("/product/{asin}")
async def product_detail(asin: str):
    product = await get_product(asin)
    if not product:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")
    niche = calculate_niche_score(product)
    product["niche_score"] = niche
    return product

@router.post("/unavailable-scanner")
async def unavailable_scanner(asins: List[str]):
    if len(asins) > 100:
        raise HTTPException(status_code=400, detail="Maksimum 100 ASIN")
    results = [await check_availability(asin) for asin in asins]
    unavailable = [r for r in results if not r["available"]]
    available = [r for r in results if r["available"]]
    return {"total": len(asins), "unavailable_count": len(unavailable),
            "available_count": len(available), "unavailable": unavailable, "available": available}

@router.get("/niche-score/{asin}")
@limiter.limit("10/minute")
async def niche_score(request: Request, asin: str, use_keepa: bool = Query(True)):
    """
    use_keepa=true  → Gerçek BSR geçmişi + Gini + RVI (1 Keepa token)
    use_keepa=false → Hızlı, token harcamaz
    """
    product = await get_product(asin)
    if not product:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")

    if use_keepa:
        score = await calculate_niche_score_with_keepa(product)
    else:
        score = calculate_niche_score(product)

    return {"asin": asin, "title": product.get("title"), "price": product.get("price"), "niche_score": score}

@router.get("/quick-picks")
async def quick_picks(limit: int = Query(6)):
    from datetime import date
    from services.redis_cache import cache_get
    import logging
    logger = logging.getLogger(__name__)

    # Redis cache'den oku (scheduler her sabah 06:00 UTC doldurur)
    cached = await cache_get("quick_picks:daily")
    if cached and cached.get("picks"):
        picks = cached["picks"][:limit]
        return {**cached, "picks": picks}

    # Cache boşsa: scheduler logic'ini inline çalıştır (gerçek EasyParser verisi)
    logger.warning("[QuickPicks] Redis cache boş — gerçek veri için scheduler çalıştırılıyor")
    try:
        from services.scheduler_service import run_quick_picks
        payload = await run_quick_picks()
        if payload and payload.get("picks"):
            picks = payload["picks"][:limit]
            return {**payload, "picks": picks}
    except Exception as e:
        logger.error(f"[QuickPicks] Gerçek veri alınamadı: {e}")

    # API de başarısız olduysa boş sonuç döndür — asla mock değil
    return {
        "picks": [],
        "total": 0,
        "date": str(date.today()),
        "keywords_scanned": [],
        "error": "data_unavailable",
        "message": "Veriler hazırlanıyor, lütfen kısa süre içinde tekrar deneyin."
    }


@router.get("/cache/stats")
async def easyparser_cache_stats():
    """Tum cache istatistikleri — Easyparser + Keepa + Redis"""
    from services.keepa_service import get_token_stats
    from services.redis_cache import get_redis_stats
    return {
        "easyparser": get_easyparser_stats(),
        "keepa": get_token_stats(),
        "redis": get_redis_stats(),
    }

@router.get("/debug/service-status")
async def service_status():
    """Tüm veri kaynaklarının gerçek/mock durumunu döndür"""
    import os
    from services.keepa_service import get_token_stats, KEEPA_API_KEY, KEEPA_AVAILABLE, TOKEN_GUARD, _get_keepa_api
    from services.redis_cache import cache_get as redis_get

    # EasyParser durumu
    ep_key = os.getenv("EASYPARSER_API_KEY", "")
    ep_stats = get_easyparser_stats()
    ep_status = "real" if ep_key else "mock_no_key"

    # Keepa durumu
    keepa_stats = get_token_stats()
    keepa_api = _get_keepa_api()
    tokens_left = keepa_api.tokens_left if keepa_api else 0
    keepa_status = "real" if (KEEPA_AVAILABLE and KEEPA_API_KEY and tokens_left >= TOKEN_GUARD) else (
        "mock_no_tokens" if (KEEPA_AVAILABLE and KEEPA_API_KEY) else "mock_no_key"
    )

    # QuickPicks cache durumu
    qp_cached = await redis_get("quick_picks:daily")
    qp_status = "real_cached" if (qp_cached and not qp_cached.get("mock")) else (
        "mock_cached" if (qp_cached and qp_cached.get("mock")) else "no_cache"
    )

    return {
        "easyparser": {
            "status": ep_status,
            "has_key": bool(ep_key),
            "stats": ep_stats,
        },
        "keepa": {
            "status": keepa_status,
            "has_key": bool(KEEPA_API_KEY),
            "available": KEEPA_AVAILABLE,
            "tokens_left": tokens_left,
            "token_guard": TOKEN_GUARD,
            "stats": keepa_stats,
        },
        "quick_picks": {
            "status": qp_status,
            "cache_date": qp_cached.get("date") if qp_cached else None,
            "picks_count": len(qp_cached.get("picks", [])) if qp_cached else 0,
        },
    }

@router.post("/cache/flush")
async def flush_cache(pattern: str = "keyword_analyze:*"):
    """Redis cache temizle"""
    from services.redis_cache import cache_flush_pattern
    count = await cache_flush_pattern(pattern)
    return {"flushed": count, "pattern": pattern}

@router.delete("/cache/{asin}")
async def clear_product_cache(asin: str):
    """Belirli bir ASIN cache'ini temizle (force refresh)"""
    from services.easyparser import cache_set, _mem_cache
    key = f"product:{asin.upper()}"
    if key in _mem_cache:
        del _mem_cache[key]
    try:
        from database.supabase import get_supabase
        get_supabase().table("easyparser_cache").delete().eq("cache_key", key).execute()
    except Exception:
        pass
    return {"cleared": True, "key": key}
