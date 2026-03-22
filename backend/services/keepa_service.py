import os
import asyncio
import json
from datetime import datetime, timedelta
from typing import Optional
import numpy as np

# Supabase cache
try:
    from database.supabase import get_supabase
    SUPABASE_AVAILABLE = True
except Exception:
    SUPABASE_AVAILABLE = False

CACHE_TTL_HOURS = 48   # 48 saat cache — token tasarrufu icin uzatildi

# Token tasarruf istatistikleri
_token_stats = {
    "cache_hits": 0,      # Kac sorgu cache'den karsilandi (0 token)
    "api_calls": 0,       # Kac gercek Keepa API cagrisi yapildi
    "tokens_saved": 0,    # Tahmini kacirilen token
}

def get_token_stats() -> dict:
    """Token tasarruf istatistiklerini don"""
    total = _token_stats["cache_hits"] + _token_stats["api_calls"]
    savings_pct = int((_token_stats["cache_hits"] / total * 100) if total > 0 else 0)
    return {
        **_token_stats,
        "total_requests": total,
        "cache_hit_rate_pct": savings_pct,
        "estimated_tokens_saved": _token_stats["cache_hits"],
    }

# ─── Keepa Python wrapper ────────────────────────────────────────────────────
# pip install keepa
try:
    import keepa
    KEEPA_AVAILABLE = True
except ImportError:
    KEEPA_AVAILABLE = False
    print("⚠️ keepa not installed: pip install keepa")

KEEPA_API_KEY = os.getenv("KEEPA_API_KEY", "")

# ─── BSR → Satış Tahmini (Power-Law Formülü) ────────────────────────────────
# Kaynak: Akademik power-law modeli (Jungle Scout / AMZScout yöntemi)
CATEGORY_SALES_PARAMS = {
    "Electronics":             (3100, 0.85),
    "Home & Kitchen":          (2800, 0.82),
    "Sports & Outdoors":       (1900, 0.78),
    "Toys & Games":            (2200, 0.80),
    "Health & Personal Care":  (1700, 0.76),
    "Beauty":                  (2000, 0.79),
    "Clothing":                (2500, 0.83),
    "Books":                   (4500, 0.90),
    "Pet Supplies":            (1800, 0.77),
    "Office Products":         (1600, 0.75),
    "Tools & Home Improvement":(1500, 0.74),
    "Garden & Outdoor":        (1400, 0.73),
    "Baby":                    (2100, 0.80),
    "Grocery":                 (3000, 0.84),
    "Automotive":              (1300, 0.72),
    "default":                 (2000, 0.80),
}

def bsr_to_monthly_sales(bsr: int, category: str = "default") -> int:
    """
    BSR'dan aylık satış tahmini.
    Kaynak: Power-law formülü — akademik literatür
    """
    if bsr <= 0:
        return 0
    k, alpha = CATEGORY_SALES_PARAMS.get(category, CATEGORY_SALES_PARAMS["default"])
    sales = int(k * (bsr ** -alpha))
    return max(0, min(sales, 100000))


# ─── Gini Katsayısı (Pazar Rekabet Ölçümü) ──────────────────────────────────
# Kaynak: Ekonomi literatürü
# Gini < 0.3 → Dağılmış pazar → GİRİLEBİLİR ✅
# Gini > 0.6 → Konsantre pazar → RİSKLİ ⚠️
def gini_coefficient(revenues: list) -> float:
    if not revenues or len(revenues) < 2:
        return 0.0
    arr = np.array(sorted(revenues), dtype=float)
    n = len(arr)
    if arr.sum() == 0:
        return 0.0
    index = np.arange(1, n + 1)
    gini = (2 * np.sum(index * arr) - (n + 1) * arr.sum()) / (n * arr.sum())
    return round(float(gini), 4)

def gini_to_score(gini: float) -> int:
    """Gini katsayısını 0-25 arası rekabet skoruna çevir (düşük Gini = iyi)"""
    if gini < 0.3:
        return 25   # Dağılmış pazar — girilebilir
    elif gini < 0.45:
        return 18
    elif gini < 0.6:
        return 10
    else:
        return 3    # Tekelci pazar — kaçın


# ─── Review Velocity Index (RVI) ────────────────────────────────────────────
def calculate_rvi(
    current_reviews: int,
    reviews_30_ago: int,
    reviews_90_ago: int
) -> dict:
    """
    Review Velocity Index — Pazar büyüme hızını ölçer.
    Keepa review geçmişiyle hesaplanır.
    """
    if current_reviews <= 0:
        return {"rvi": 0, "trend": "unknown", "monthly_velocity": 0, "score": 0}

    monthly_velocity = max(0, current_reviews - reviews_30_ago)
    quarterly_avg = max(0, (current_reviews - reviews_90_ago) / 3)

    if quarterly_avg == 0:
        trend = "new"
    elif monthly_velocity > quarterly_avg * 1.3:
        trend = "accelerating"   # İvmeleniyor — rekabet artıyor
    elif monthly_velocity < quarterly_avg * 0.7:
        trend = "decelerating"   # Yavaşlıyor — pazar doyuyor olabilir
    else:
        trend = "stable"

    # RVI skoru: düşük hız = girilebilir pazar (0-25)
    # RVI < 10/ay → pazar henüz kalabalıklaşmadı
    if monthly_velocity < 5:
        score = 25
    elif monthly_velocity < 15:
        score = 20
    elif monthly_velocity < 50:
        score = 12
    elif monthly_velocity < 150:
        score = 6
    else:
        score = 2

    return {
        "rvi": monthly_velocity,
        "quarterly_avg": round(quarterly_avg, 1),
        "trend": trend,
        "score": score
    }


# ─── Keepa Token'ı Keepa Unix timestamp'e çevir ─────────────────────────────
def keepa_time_to_datetime(keepa_time: int) -> datetime:
    """Keepa zaman damgasını Python datetime'a çevir"""
    return datetime(2011, 1, 1) + timedelta(minutes=keepa_time)

def extract_bsr_history(product: dict, category_idx: int = 0) -> list:
    """Keepa ürün datasından BSR geçmişini çıkar"""
    try:
        csv = product.get("csv", [])
        if not csv or len(csv) <= 3:
            return []
        # BSR genellikle csv[3]'te
        bsr_data = csv[3]
        if not bsr_data:
            return []
        # Çift indexli: [time1, value1, time2, value2, ...]
        history = []
        for i in range(0, len(bsr_data) - 1, 2):
            t = bsr_data[i]
            v = bsr_data[i + 1]
            if t and v and v > 0:
                history.append({
                    "date": keepa_time_to_datetime(t).strftime("%Y-%m-%d"),
                    "bsr": v
                })
        return history[-90:]  # Son 90 nokta
    except Exception as e:
        print(f"BSR history error: {e}")
        return []

def extract_review_history(product: dict) -> list:
    """Keepa ürün datasından review geçmişini çıkar"""
    try:
        csv = product.get("csv", [])
        if not csv or len(csv) <= 16:
            return []
        review_data = csv[16]
        if not review_data:
            return []
        history = []
        for i in range(0, len(review_data) - 1, 2):
            t = review_data[i]
            v = review_data[i + 1]
            if t and v and v >= 0:
                history.append({
                    "date": keepa_time_to_datetime(t).strftime("%Y-%m-%d"),
                    "reviews": v
                })
        return history[-90:]
    except Exception as e:
        print(f"Review history error: {e}")
        return []

def extract_price_history(product: dict) -> list:
    """Amazon fiyat geçmişini çıkar"""
    try:
        csv = product.get("csv", [])
        if not csv or len(csv) <= 0:
            return []
        price_data = csv[0]  # Amazon fiyatı
        if not price_data:
            return []
        history = []
        for i in range(0, len(price_data) - 1, 2):
            t = price_data[i]
            v = price_data[i + 1]
            if t and v and v > 0:
                history.append({
                    "date": keepa_time_to_datetime(t).strftime("%Y-%m-%d"),
                    "price": round(v / 100, 2)  # Keepa fiyatları cent cinsinden
                })
        return history[-90:]
    except Exception as e:
        print(f"Price history error: {e}")
        return []


# ─── Ana Keepa Sorgu Fonksiyonu ──────────────────────────────────────────────
# ─── Supabase Cache ────────────────────────────────────────────────────────
async def _get_cache(asin: str) -> dict | None:
    """Supabase'den cache'li veriyi getir (24 saat geçerliyse)"""
    if not SUPABASE_AVAILABLE:
        return None
    try:
        supabase = get_supabase()
        result = supabase.table("keepa_cache").select("*").eq("asin", asin).execute()
        if not result.data:
            return None
        row = result.data[0]
        updated_at = datetime.fromisoformat(row["updated_at"].replace("Z", "+00:00"))
        age_hours = abs((datetime.now().astimezone() - updated_at).total_seconds() / 3600)
        if age_hours > CACHE_TTL_HOURS:
            return None  # Cache süresi dolmuş
        data = row["data"]
        data["cached"] = True
        data["cache_age_hours"] = round(age_hours, 1)
        return data
    except Exception as e:
        print(f"Cache get error: {e}")
        return None

async def _set_cache(asin: str, category: str, data: dict) -> None:
    """Keepa verisini Supabase'e cache'le"""
    if not SUPABASE_AVAILABLE:
        return
    try:
        supabase = get_supabase()
        cache_data = {k: v for k, v in data.items() if k not in ["cached", "cache_age_hours"]}
        supabase.table("keepa_cache").upsert({
            "asin": asin,
            "category": category,
            "data": cache_data,
            "updated_at": datetime.now().isoformat()
        }).execute()
    except Exception as e:
        print(f"Cache set error: {e}")


async def get_keepa_data(asin: str, category: str = "default") -> dict:
    """
    ASIN için Keepa'dan tam veri çek.
    Cache varsa 0 token, yoksa 1 token harcar.
    """
    # Önce cache kontrol et
    cached = await _get_cache(asin)
    if cached:
        print(f"✅ Cache hit: {asin} ({cached.get('cache_age_hours', 0)}h old)")
        _token_stats["cache_hits"] += 1
        _token_stats["tokens_saved"] += 1
        return cached

    if not KEEPA_AVAILABLE or not KEEPA_API_KEY:
        return _mock_keepa_data(asin, category)

    try:
        api = keepa.Keepa(KEEPA_API_KEY)
        products = api.query(
            asin,
            stats=90,        # Son 90 gun istatistikleri — ucretsiz, token maliyeti yok
            history=True,    # Fiyat/BSR/review gecmisi
            days=90,         # OPTIMIZASYON: Sadece son 90 gun — response %60 kuculuyor
            update=24,       # OPTIMIZASYON: 24h'den yeni veri varsa Keepa token harcama
            # offers=20 KALDIRILDI — her offer sorusu extra token, kapali
        )

        _token_stats["api_calls"] += 1
        if not products:
            return _mock_keepa_data(asin, category)

        product = products[0]

        # BSR geçmişi
        bsr_history = extract_bsr_history(product)
        review_history = extract_review_history(product)
        price_history = extract_price_history(product)

        # Mevcut değerler
        stats = product.get("stats", {})
        current_bsr = stats.get("current", [None] * 4)[3] or 0
        current_reviews = stats.get("current", [None] * 17)[16] or 0

        # 30 ve 90 gün önceki review sayısı
        reviews_30_ago = 0
        reviews_90_ago = 0
        if len(review_history) >= 2:
            reviews_30_ago = review_history[max(0, len(review_history) - 30)]["reviews"] if len(review_history) > 30 else review_history[0]["reviews"]
            reviews_90_ago = review_history[0]["reviews"]

        # Hesaplamalar
        monthly_sales = bsr_to_monthly_sales(current_bsr, category)

        # BSR listesinden gelir tahmini (Gini için)
        bsr_values = [b["bsr"] for b in bsr_history if b["bsr"] > 0]
        revenues = [bsr_to_monthly_sales(b, category) * 30 for b in bsr_values[-20:]]
        gini = gini_coefficient(revenues)

        rvi_data = calculate_rvi(current_reviews, reviews_30_ago, reviews_90_ago)

        # BSR trend (son 30 gün vs önceki 30 gün)
        bsr_trend = "stable"
        if len(bsr_history) >= 20:
            recent_bsr = np.mean([b["bsr"] for b in bsr_history[-10:]])
            older_bsr = np.mean([b["bsr"] for b in bsr_history[-20:-10]])
            if recent_bsr < older_bsr * 0.85:
                bsr_trend = "improving"   # BSR düşüyor = satış artıyor
            elif recent_bsr > older_bsr * 1.15:
                bsr_trend = "declining"
            else:
                bsr_trend = "stable"

        # Fiyat istatistikleri
        prices = [p["price"] for p in price_history if p["price"] > 0]
        price_stats = {
            "current": prices[-1] if prices else 0,
            "avg_90d": round(np.mean(prices), 2) if prices else 0,
            "min_90d": min(prices) if prices else 0,
            "max_90d": max(prices) if prices else 0,
        }

        result = {
            "asin": asin,
            "current_bsr": current_bsr,
            "current_reviews": current_reviews,
            "monthly_sales_estimate": monthly_sales,
            "bsr_trend": bsr_trend,
            "bsr_history": bsr_history,
            "review_history": review_history,
            "price_history": price_history,
            "price_stats": price_stats,
            "gini": gini,
            "gini_label": (
                "Girilebilir ✅" if gini < 0.3 else
                "Orta ⚠️" if gini < 0.5 else
                "Riskli 🔴"
            ),
            "rvi": rvi_data,
            "token_cost": 1,
            "mock": False,
            "cached": False,
        }
        # Supabase'e cache'le
        await _set_cache(asin, category, result)
        return result

    except Exception as e:
        print(f"Keepa error for {asin}: {e}")
        return _mock_keepa_data(asin, category)


async def get_keepa_batch(asins: list, category: str = "default") -> list:
    """
    Birden fazla ASIN için Keepa verisi çek.
    Her ASIN 1 token. Rate limit için 1 sn bekle.
    """
    results = []
    for asin in asins[:10]:  # Max 10 ASIN
        data = await get_keepa_data(asin, category)
        results.append(data)
        await asyncio.sleep(0.5)
    return results


def get_token_status() -> dict:
    """Keepa token durumunu kontrol et"""
    if not KEEPA_AVAILABLE or not KEEPA_API_KEY:
        return {"available": False, "tokens_left": 0}
    try:
        api = keepa.Keepa(KEEPA_API_KEY)
        return {
            "available": True,
            "tokens_left": api.tokens_left,
            "refill_rate": api.time_to_refill,
        }
    except Exception as e:
        return {"available": False, "error": str(e)}


# ─── Mock Data (Keepa key yoksa veya hata durumunda) ─────────────────────────
def _mock_keepa_data(asin: str, category: str = "default") -> dict:
    """Geliştirme/test için mock Keepa verisi"""
    import math
    seed = sum(ord(c) for c in asin)

    def seeded_rand(s):
        x = math.sin(s) * 10000
        return x - math.floor(x)

    current_bsr = int(seeded_rand(seed) * 15000) + 500
    current_reviews = int(seeded_rand(seed + 1) * 2000) + 50
    monthly_sales = bsr_to_monthly_sales(current_bsr, category)

    # Mock BSR geçmişi (90 gün)
    bsr_history = []
    base_bsr = current_bsr
    for i in range(90, 0, -10):
        bsr_history.append({
            "date": (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d"),
            "bsr": max(100, int(base_bsr * (1 + seeded_rand(seed + i) * 0.3 - 0.15)))
        })

    # Mock fiyat geçmişi
    base_price = round(15 + seeded_rand(seed + 2) * 60, 2)
    price_history = []
    for i in range(90, 0, -10):
        price_history.append({
            "date": (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d"),
            "price": round(base_price * (1 + seeded_rand(seed + i + 5) * 0.1 - 0.05), 2)
        })

    revenues = [bsr_to_monthly_sales(b["bsr"], category) * 30 for b in bsr_history]
    gini = gini_coefficient(revenues)

    reviews_30_ago = max(0, current_reviews - int(seeded_rand(seed + 3) * 30))
    reviews_90_ago = max(0, current_reviews - int(seeded_rand(seed + 4) * 90))
    rvi_data = calculate_rvi(current_reviews, reviews_30_ago, reviews_90_ago)

    prices = [p["price"] for p in price_history]

    return {
        "asin": asin,
        "current_bsr": current_bsr,
        "current_reviews": current_reviews,
        "monthly_sales_estimate": monthly_sales,
        "bsr_trend": "stable",
        "bsr_history": bsr_history,
        "review_history": [],
        "price_history": price_history,
        "price_stats": {
            "current": prices[-1] if prices else base_price,
            "avg_90d": round(sum(prices) / len(prices), 2) if prices else base_price,
            "min_90d": min(prices) if prices else base_price,
            "max_90d": max(prices) if prices else base_price,
        },
        "gini": gini,
        "gini_label": (
            "Girilebilir ✅" if gini < 0.3 else
            "Orta ⚠️" if gini < 0.5 else
            "Riskli 🔴"
        ),
        "rvi": rvi_data,
        "mock": True,
    }


# ─── Fiyat Savaşı Erken Uyarı Sistemi ───────────────────────────────────────
def detect_price_war(keepa_data: dict) -> dict:
    """
    Keepa fiyat + BSR geçmişinden fiyat savaşı tespiti.
    Sinyaller:
    - Son 30 günde fiyat düşüşü > %15 → ⚠️ Uyarı
    - Son 30 günde fiyat düşüşü > %30 → 🔴 Kritik
    - BSR kötüleşirken fiyat düşüyorsa → satış hacmi düşüyor demek
    """
    price_history = keepa_data.get("price_history", [])
    bsr_history = keepa_data.get("bsr_history", [])
    price_stats = keepa_data.get("price_stats", {})

    if not price_history or len(price_history) < 3:
        return {"detected": False, "level": "unknown", "signals": []}

    prices = [p["price"] for p in price_history if p.get("price", 0) > 0]
    if not prices or len(prices) < 3:
        return {"detected": False, "level": "unknown", "signals": []}

    current_price = prices[-1]
    # 30 gün önceki fiyat (yaklaşık — son %33'lük dilim)
    old_price_idx = max(0, len(prices) - len(prices) // 3)
    old_price = prices[old_price_idx]
    max_price_90d = price_stats.get("max_90d", current_price)

    signals = []
    risk_score = 0

    # Sinyal 1: Son dönem fiyat düşüşü
    if old_price > 0:
        price_drop_pct = ((old_price - current_price) / old_price) * 100
        if price_drop_pct > 30:
            signals.append({
                "type": "critical_price_drop",
                "message": f"🔴 Fiyat son dönemde %{round(price_drop_pct)}düştü — ciddi fiyat savaşı!",
                "value": round(price_drop_pct, 1)
            })
            risk_score += 50
        elif price_drop_pct > 15:
            signals.append({
                "type": "price_drop",
                "message": f"⚠️ Fiyat son dönemde %{round(price_drop_pct)} düştü — rakip baskısı var.",
                "value": round(price_drop_pct, 1)
            })
            risk_score += 25

    # Sinyal 2: Zirve fiyattan uzaklık
    if max_price_90d > 0 and current_price > 0:
        from_peak_pct = ((max_price_90d - current_price) / max_price_90d) * 100
        if from_peak_pct > 35:
            signals.append({
                "type": "far_from_peak",
                "message": f"⚠️ Mevcut fiyat 90 günlük zirvesinin %{round(from_peak_pct)} altında.",
                "value": round(from_peak_pct, 1)
            })
            risk_score += 20

    # Sinyal 3: Fiyat oynaklığı (volatilite)
    if len(prices) >= 5:
        price_std = float(np.std(prices))
        price_mean = float(np.mean(prices))
        volatility = (price_std / price_mean * 100) if price_mean > 0 else 0
        if volatility > 25:
            signals.append({
                "type": "high_volatility",
                "message": f"📊 Fiyat oynaklığı yüksek (%{round(volatility)}) — istikrarsız pazar.",
                "value": round(volatility, 1)
            })
            risk_score += 15

    # Sinyal 4: BSR kötüleşiyor mu?
    if bsr_history and len(bsr_history) >= 6:
        recent_bsr = np.mean([b["bsr"] for b in bsr_history[-3:]])
        older_bsr = np.mean([b["bsr"] for b in bsr_history[:3]])
        if recent_bsr > older_bsr * 1.5:
            signals.append({
                "type": "bsr_declining",
                "message": "📉 BSR kötüleşiyor — fiyat düşse de satışlar artmıyor.",
                "value": round(((recent_bsr - older_bsr) / older_bsr) * 100, 1)
            })
            risk_score += 20

    # Seviye belirle
    if risk_score >= 60:
        level = "critical"
        level_tr = "🔴 Kritik — Fiyat Savaşı Var"
        recommendation = "Bu nişe şu an girme. Fiyatlar dip yapmadan beklemeyi düşün."
    elif risk_score >= 30:
        level = "warning"
        level_tr = "⚠️ Uyarı — Fiyat Baskısı Var"
        recommendation = "Dikkatli ol. Fiyat trendin tersine dönmesini bekle."
    elif risk_score > 0:
        level = "mild"
        level_tr = "🟡 Hafif Risk"
        recommendation = "Normalin dışında bir durum yok ama takipte kal."
    else:
        level = "safe"
        level_tr = "✅ Güvenli — Fiyat Savaşı Yok"
        recommendation = "Fiyatlar stabil. Giriş için iyi sinyal."

    return {
        "detected": risk_score >= 30,
        "level": level,
        "level_tr": level_tr,
        "risk_score": risk_score,
        "recommendation": recommendation,
        "signals": signals,
        "price_current": current_price,
        "price_max_90d": max_price_90d,
    }
