# Niş Skoru — Hazır Kod Örnekleri
# Kaynak: Akademik power-law modeli + Keepa Python kütüphanesi
# github.com/akaszynski/keepa kullanımı

import numpy as np
from typing import List, Dict, Optional

# ──────────────────────────────────────────────
# 1. BSR → AYLIK SATIŞ TAHMİNİ
# Kaynak: Power-law formülü (akademik)
# Jungle Scout / AMZScout'un kullandığı yöntem
# ──────────────────────────────────────────────

CATEGORY_SALES_PARAMS = {
    "Electronics":            (3100, 0.85),
    "Home & Kitchen":         (2800, 0.82),
    "Sports & Outdoors":      (1900, 0.78),
    "Toys & Games":           (2200, 0.80),
    "Health & Personal Care": (1700, 0.76),
    "Beauty":                 (2000, 0.79),
    "Clothing":               (2500, 0.83),
    "Books":                  (4500, 0.90),
    "Pet Supplies":           (1800, 0.77),
    "Office Products":        (1600, 0.75),
    "Tools & Home":           (1500, 0.74),
    "Kitchen":                (2600, 0.82),
    "Garden":                 (1400, 0.73),
    "default":                (2000, 0.80),
}

def bsr_to_monthly_sales(bsr: int, category: str = "default") -> int:
    """
    BSR'dan aylık satış tahmini.
    
    Args:
        bsr: Best Seller Rank (örn: 5000)
        category: Amazon kategorisi
    
    Returns:
        Tahmini aylık satış adedi
    """
    if bsr <= 0:
        return 0
    
    k, alpha = CATEGORY_SALES_PARAMS.get(category, CATEGORY_SALES_PARAMS["default"])
    sales = int(k * (bsr ** -alpha))
    
    # Makul sınırlar
    return max(0, min(sales, 100000))


# ──────────────────────────────────────────────
# 2. GİNİ KATSAYISI (Pazar Yoğunlaşma Ölçümü)
# Kaynak: Ekonomi literatürü
# Kullanım: Niş rekabet skoru
# ──────────────────────────────────────────────

def gini_coefficient(revenues: List[float]) -> float:
    """
    Gini katsayısı ile pazar konsantrasyon ölçümü.
    
    Sonuç yorumu:
    - Gini < 0.3  → Dağılmış pazar → GİRİLEBİLİR ✅
    - 0.3 - 0.5   → Orta yoğunluk → DİKKATLİ
    - Gini > 0.5  → Konsantre pazar → RİSKLİ ⚠️
    - Gini > 0.7  → Tekelci pazar → KAÇIN 🔴
    """
    if not revenues or len(revenues) < 2:
        return 0.0
    
    arr = np.array(sorted(revenues), dtype=float)
    n = len(arr)
    
    if arr.sum() == 0:
        return 0.0
    
    index = np.arange(1, n + 1)
    gini = (2 * np.sum(index * arr) - (n + 1) * arr.sum()) / (n * arr.sum())
    
    return round(float(gini), 4)


# ──────────────────────────────────────────────
# 3. REVIEW VELOCITY INDEX (RVI)
# Kaynak: AmazenLens özgün metodoloji
# ──────────────────────────────────────────────

def calculate_rvi(
    current_reviews: int,
    reviews_30_ago: int,
    reviews_90_ago: int
) -> dict:
    """
    Review Velocity Index — Ürünün büyüme hızını ölçer.
    Keepa verisi ile hesaplanır.
    """
    if current_reviews <= 0:
        return {"score": 0, "trend": "unknown", "monthly_velocity": 0}
    
    monthly_velocity = max(0, current_reviews - reviews_30_ago)
    quarterly_avg = max(0, (current_reviews - reviews_90_ago) / 3)
    
    # Trend analizi
    if quarterly_avg == 0:
        trend = "new_product"
    elif monthly_velocity > quarterly_avg * 1.3:
        trend = "accelerating"   # İvmeleniyor — çok iyi
    elif monthly_velocity > quarterly_avg * 0.7:
        trend = "stable"         # Stabil
    else:
        trend = "decelerating"   # Yavaşlıyor — dikkat
    
    # Skor (0-100)
    if quarterly_avg > 0:
        score = min(int((monthly_velocity / quarterly_avg) * 50), 100)
    else:
        score = 50
    
    return {
        "monthly_velocity": monthly_velocity,
        "quarterly_avg": round(quarterly_avg, 1),
        "trend": trend,
        "score": score
    }


# ──────────────────────────────────────────────
# 4. KEEPA API KULLANIMI
# pip install keepa
# ──────────────────────────────────────────────

def get_keepa_product_data(asin: str, api_key: str) -> dict:
    """
    Keepa'dan tarihsel ürün verisi çek.
    Requires: pip install keepa
    """
    try:
        import keepa
        
        api = keepa.Keepa(api_key)
        products = api.query(
            asin,
            stats=90,      # Son 90 gün istatistikleri
            history=True,  # Tam geçmiş
            buybox=1,      # Buy Box geçmişi
            rating=1,      # Rating geçmişi
        )
        
        if not products:
            return {}
        
        product = products[0]
        stats = product.get("stats", {})
        
        # BSR geçmişi
        bsr_history = []
        if "data" in product and "df_SALES" in product["data"]:
            bsr_df = product["data"]["df_SALES"]
            if bsr_df is not None and not bsr_df.empty:
                bsr_history = bsr_df["value"].tolist()[-30:]  # Son 30 veri noktası
        
        return {
            "asin": asin,
            "title": product.get("title", ""),
            "bsr_current": stats.get("current", [None]*4)[3],
            "bsr_avg_30": stats.get("avg30", [None]*4)[3],
            "bsr_avg_90": stats.get("avg90", [None]*4)[3],
            "price_current": stats.get("current", [None])[0],
            "price_avg_90": stats.get("avg90", [None])[0],
            "rating_current": product.get("rating", 0) / 10,  # Keepa 0-50 scale
            "review_count": product.get("csvReviewCount", 0),
            "bsr_history": bsr_history,
            "tokens_left": api.tokens_left,
        }
    except ImportError:
        return {"error": "pip install keepa gerekli"}
    except Exception as e:
        return {"error": str(e)}


# ──────────────────────────────────────────────
# 5. TAM NİŞ SKORU HESABI
# ──────────────────────────────────────────────

def calculate_niche_score(
    product_data: dict,
    competitor_revenues: List[float] = None
) -> dict:
    """
    100 puanlık niş skoru hesaplama.
    
    4 Bileşen (her biri 25 puan):
    1. Hacim & Talep
    2. Lojistik
    3. Rekabet
    4. Karlılık
    """
    
    # ─── 1. Hacim & Talep (25 puan) ───
    bsr = product_data.get("bsr", 99999)
    category = product_data.get("category", "default")
    monthly_sales = bsr_to_monthly_sales(bsr, category)
    
    if monthly_sales > 1000:
        volume_score = 25
    elif monthly_sales > 500:
        volume_score = 20
    elif monthly_sales > 200:
        volume_score = 15
    elif monthly_sales > 50:
        volume_score = 10
    else:
        volume_score = 5
    
    # ─── 2. Lojistik (25 puan) ───
    weight = product_data.get("weight_kg", 1.0)
    dimensions = product_data.get("dimensions_cm", {})
    
    logistics_score = 0
    
    # Ağırlık skoru
    if weight < 0.5:
        logistics_score += 10
    elif weight < 1.0:
        logistics_score += 8
    elif weight < 2.0:
        logistics_score += 6
    elif weight < 5.0:
        logistics_score += 3
    else:
        logistics_score += 1
    
    # FBA uygunluğu (boyut)
    max_dim = max(
        dimensions.get("length", 30),
        dimensions.get("width", 20),
        dimensions.get("height", 10)
    ) if dimensions else 30
    
    if max_dim <= 45:  # Standard size FBA
        logistics_score += 15
    elif max_dim <= 60:
        logistics_score += 10
    else:
        logistics_score += 3
    
    # ─── 3. Rekabet (25 puan) ───
    competing_products = product_data.get("total_results", 5000)
    avg_reviews = product_data.get("avg_reviews_top10", 500)
    
    competition_score = 0
    
    # Rakip sayısı skoru
    if competing_products < 100:
        competition_score += 12
    elif competing_products < 500:
        competition_score += 9
    elif competing_products < 1000:
        competition_score += 6
    elif competing_products < 5000:
        competition_score += 3
    else:
        competition_score += 1
    
    # Ortalama yorum sayısı skoru
    if avg_reviews < 100:
        competition_score += 13  # Az review = kolay rekabet
    elif avg_reviews < 500:
        competition_score += 9
    elif avg_reviews < 1000:
        competition_score += 6
    elif avg_reviews < 2000:
        competition_score += 3
    else:
        competition_score += 1
    
    # Gini katsayısı bonus
    if competitor_revenues and len(competitor_revenues) >= 3:
        gini = gini_coefficient(competitor_revenues)
        if gini < 0.3:
            competition_score = min(competition_score + 5, 25)
    
    # ─── 4. Karlılık (25 puan) ───
    price = product_data.get("price", 0)
    cost = product_data.get("sourcing_cost", 0)
    fba_fee = product_data.get("fba_fee", 0)
    
    profit_score = 0
    
    # Fiyat aralığı skoru ($15-$50 ideal)
    if 15 <= price <= 50:
        profit_score += 8
    elif 10 <= price <= 80:
        profit_score += 5
    elif price > 80:
        profit_score += 3
    else:
        profit_score += 1
    
    # Kar marjı skoru
    if cost > 0 and fba_fee > 0:
        net_profit = price - cost - fba_fee
        margin = (net_profit / price) * 100 if price > 0 else 0
        
        if margin >= 50:
            profit_score += 17
        elif margin >= 35:
            profit_score += 13
        elif margin >= 20:
            profit_score += 8
        elif margin >= 10:
            profit_score += 4
        else:
            profit_score += 1
    else:
        profit_score += 8  # Veri yoksa ortalama puan
    
    # ─── TOPLAM SKOR ───
    total = volume_score + logistics_score + competition_score + profit_score
    
    # Karar
    if total >= 80:
        verdict = "🟢 Mükemmel — Hemen gir!"
        color = "green"
    elif total >= 60:
        verdict = "🟡 İyi — Araştır"
        color = "yellow"
    elif total >= 40:
        verdict = "🟠 Orta — Dikkatli ol"
        color = "orange"
    else:
        verdict = "🔴 Zayıf — Kaçın"
        color = "red"
    
    return {
        "total_score": total,
        "verdict": verdict,
        "color": color,
        "breakdown": {
            "volume": volume_score,
            "logistics": logistics_score,
            "competition": competition_score,
            "profitability": profit_score
        },
        "details": {
            "monthly_sales_estimate": monthly_sales,
            "competing_products": competing_products,
        }
    }


# Test
if __name__ == "__main__":
    test_product = {
        "bsr": 5000,
        "category": "Sports & Outdoors",
        "weight_kg": 0.8,
        "dimensions_cm": {"length": 30, "width": 20, "height": 5},
        "total_results": 800,
        "avg_reviews_top10": 350,
        "price": 29.99,
        "sourcing_cost": 5.00,
        "fba_fee": 4.50
    }
    
    result = calculate_niche_score(test_product)
    print(f"Niş Skoru: {result['total_score']}/100")
    print(f"Karar: {result['verdict']}")
    print(f"Detaylar: {result['breakdown']}")
