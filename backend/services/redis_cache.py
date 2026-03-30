"""
Redis Cache Servisi
AI maliyetini %70 azaltır — aynı keyword/ASIN için tekrar AI çağrısı yapma
"""
import os
import json
import hashlib
from typing import Optional

REDIS_URL = os.getenv("REDIS_URL", "")

# Redis bağlantısı — yoksa sessizce geç
try:
    import redis.asyncio as aioredis
    _redis_client = None
    REDIS_AVAILABLE = bool(REDIS_URL)
except ImportError:
    REDIS_AVAILABLE = False
    print("⚠️ redis not installed: pip install redis")

# TTL ayarları (saniye)
TTL = {
    "keyword_analyze":   6  * 3600,   # 6 saat  — keyword analizi
    "niche_score":       12 * 3600,   # 12 saat — nis skoru
    "ai_buyer_intent":   24 * 3600,   # 24 saat — Gemini buyer intent
    "ai_listing":        48 * 3600,   # 48 saat — listing optimizer
    "trend":             3  * 3600,   # 3 saat  — Google Trends
    "demand_forecast":   6  * 3600,   # 6 saat  — talep tahmini
    "default":           6  * 3600,   # 6 saat  — varsayılan
}

# İstatistikler
_stats = {
    "hits": 0,
    "misses": 0,
    "sets": 0,
    "errors": 0,
}

def get_redis_stats() -> dict:
    total = _stats["hits"] + _stats["misses"]
    return {
        **_stats,
        "total_requests": total,
        "hit_rate_pct": int((_stats["hits"] / total * 100) if total > 0 else 0),
        "redis_available": REDIS_AVAILABLE,
        "estimated_credits_saved": _stats["hits"],
    }

def make_cache_key(prefix: str, *args) -> str:
    """Tutarlı cache key üret"""
    raw = f"{prefix}:" + ":".join(str(a).lower().strip() for a in args)
    # Uzun key'leri hash'le
    if len(raw) > 100:
        return f"{prefix}:{hashlib.md5(raw.encode()).hexdigest()}"
    return raw

async def get_redis():
    """Redis bağlantısı al — lazy init"""
    global _redis_client
    if not REDIS_AVAILABLE:
        return None
    if _redis_client is None:
        try:
            _redis_client = aioredis.from_url(
                REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=3,
                socket_timeout=3,
            )
            await _redis_client.ping()
            print("✅ Redis bağlantısı kuruldu")
        except Exception as e:
            print(f"⚠️ Redis bağlantı hatası: {e}")
            _redis_client = None
    return _redis_client

async def cache_get(key: str) -> Optional[dict]:
    """Redis'ten veri al"""
    r = await get_redis()
    if not r:
        _stats["misses"] += 1
        return None
    try:
        raw = await r.get(key)
        if raw:
            _stats["hits"] += 1
            print(f"[REDIS HIT] {key}")
            return json.loads(raw)
        _stats["misses"] += 1
        return None
    except Exception as e:
        _stats["errors"] += 1
        print(f"Redis get error: {e}")
        return None

async def cache_set(key: str, data: dict, ttl_type: str = "default") -> bool:
    """Redis'e veri yaz"""
    r = await get_redis()
    if not r:
        return False
    try:
        ttl = TTL.get(ttl_type, TTL["default"])
        await r.setex(key, ttl, json.dumps(data, ensure_ascii=False))
        _stats["sets"] += 1
        print(f"[REDIS SET] {key} (TTL: {ttl//3600}h)")
        return True
    except Exception as e:
        _stats["errors"] += 1
        print(f"Redis set error: {e}")
        return False

async def cache_delete(key: str) -> bool:
    """Cache'den sil (force refresh)"""
    r = await get_redis()
    if not r:
        return False
    try:
        await r.delete(key)
        return True
    except Exception:
        return False

async def cache_flush_pattern(pattern: str) -> int:
    """Pattern'e uyan tüm key'leri sil"""
    r = await get_redis()
    if not r:
        return 0
    try:
        keys = await r.keys(pattern)
        if keys:
            await r.delete(*keys)
        return len(keys)
    except Exception:
        return 0

# ─── Decorator ───────────────────────────────────────────────────────────────
def redis_cached(prefix: str, ttl_type: str = "default"):
    """
    Fonksiyon decorator — otomatik cache.
    Kullanım:
        @redis_cached("keyword_analyze", "keyword_analyze")
        async def analyze_keyword(keyword, market):
            ...
    """
    def decorator(func):
        async def wrapper(*args, **kwargs):
            key = make_cache_key(prefix, *args, *kwargs.values())
            cached = await cache_get(key)
            if cached:
                return cached
            result = await func(*args, **kwargs)
            if result:
                await cache_set(key, result, ttl_type)
            return result
        return wrapper
    return decorator
