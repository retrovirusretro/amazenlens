import math
from services.keepa_service import (
    bsr_to_monthly_sales,
    gini_coefficient,
    gini_to_score,
    calculate_rvi,
    get_keepa_data,
)

def review_velocity_index(reviews: int, product_age_days: int = 180) -> float:
    if product_age_days <= 0:
        return reviews / 6
    return (reviews / product_age_days) * 30

def demand_trend_score(bsr: int, bsr_30d_ago: int = None) -> dict:
    if bsr_30d_ago is None:
        if bsr < 1000: trend = "yükselen"
        elif bsr < 10000: trend = "stabil"
        else: trend = "belirsiz"
        return {"trend": trend, "change_pct": None, "score": 5 if bsr < 5000 else 3}
    change_pct = ((bsr_30d_ago - bsr) / bsr_30d_ago * 100) if bsr_30d_ago > 0 else 0
    if change_pct > 20:    trend, score = "hızlı yükselen", 10
    elif change_pct > 5:   trend, score = "yükselen", 7
    elif change_pct > -5:  trend, score = "stabil", 5
    elif change_pct > -20: trend, score = "düşen", 2
    else:                   trend, score = "hızlı düşen", 0
    return {"trend": trend, "change_pct": round(change_pct, 1), "score": score}


def calculate_niche_score(product: dict, keepa_data: dict = None) -> dict:
    dimensions_data = product.get("dimensions", {})
    weight = dimensions_data.get("weight", 0)
    title = product.get("title", "").lower()
    price = product.get("price", 0) or 0
    reviews = product.get("reviews_count", product.get("reviews", 9999)) or 9999
    bsr = product.get("bestseller_rank", product.get("bsr", 999999)) or 999999
    rating = product.get("rating", 0) or 0
    category = product.get("category", "default")

    # Keepa verisi varsa kullan
    keepa_enhanced = False
    gini = 0.5
    real_rvi = None
    real_bsr_trend = None
    monthly_sales = 0

    if keepa_data and not keepa_data.get("mock", True):
        keepa_enhanced = True
        keepa_bsr = keepa_data.get("current_bsr", 0)
        if keepa_bsr and keepa_bsr > 0:
            bsr = keepa_bsr
        monthly_sales = keepa_data.get("monthly_sales_estimate", 0)
        gini = keepa_data.get("gini", 0.5)
        real_rvi = keepa_data.get("rvi", {})
        real_bsr_trend = keepa_data.get("bsr_trend", "stable")
        keepa_reviews = keepa_data.get("current_reviews", 0)
        if keepa_reviews > 0:
            reviews = keepa_reviews

    if not monthly_sales:
        monthly_sales = bsr_to_monthly_sales(bsr, category)
    est_monthly_revenue = round(monthly_sales * price, 2)

    # RVI
    if real_rvi:
        rvi_val = real_rvi.get("rvi", 0)
        rvi_score = real_rvi.get("score", 5)
        rvi_trend = real_rvi.get("trend", "stable")
        rvi_label = (
            "Düşük (giriş fırsatı)" if rvi_val < 10 else
            "Orta" if rvi_val < 30 else
            "Yüksek" if rvi_val < 60 else
            "Çok Yüksek (pazar doldu)"
        )
    else:
        rvi_val = review_velocity_index(reviews)
        if rvi_val < 10:   rvi_label, rvi_score, rvi_trend = "Düşük (giriş fırsatı)", 10, "stable"
        elif rvi_val < 30: rvi_label, rvi_score, rvi_trend = "Orta", 6, "stable"
        elif rvi_val < 60: rvi_label, rvi_score, rvi_trend = "Yüksek", 3, "stable"
        else:              rvi_label, rvi_score, rvi_trend = "Çok Yüksek (pazar doldu)", 0, "saturated"

    # Trend
    if real_bsr_trend:
        trend_map = {
            "improving": {"trend": "yükselen", "score": 8, "change_pct": None},
            "stable":    {"trend": "stabil",   "score": 5, "change_pct": None},
            "declining": {"trend": "düşen",    "score": 2, "change_pct": None},
        }
        trend_data = trend_map.get(real_bsr_trend, {"trend": "belirsiz", "score": 4, "change_pct": None})
    else:
        trend_data = demand_trend_score(bsr)

    # 1. HACİM & DEPOLAMA (0-25)
    storage_score = 0
    if weight <= 0.5:  storage_score += 25
    elif weight <= 1:  storage_score += 20
    elif weight <= 2:  storage_score += 15
    elif weight <= 5:  storage_score += 8
    elif weight <= 10: storage_score += 3
    if bsr < 1000:     storage_score = min(25, storage_score + 5)
    elif bsr < 10000:  storage_score = min(25, storage_score + 3)
    elif bsr < 100000: storage_score = min(25, storage_score + 1)
    storage_score = min(25, storage_score)

    # 2. LOJİSTİK (0-25)
    logistics_score = 0
    if weight <= 0.5:  logistics_score += 10
    elif weight <= 1:  logistics_score += 8
    elif weight <= 2:  logistics_score += 6
    elif weight <= 5:  logistics_score += 4
    elif weight <= 10: logistics_score += 2
    logistics_score += 5
    fragile_keywords = ["glass", "ceramic", "mirror", "crystal", "porcelain", "cam", "seramik"]
    is_fragile = any(kw in title for kw in fragile_keywords)
    if not is_fragile:
        logistics_score += 5
    logistics_score += 5
    logistics_score = min(25, logistics_score)

    # 3. REKABET (0-25)
    competition_score = 0
    if keepa_enhanced:
        competition_score += gini_to_score(gini)
    else:
        competition_score += min(7, rvi_score)
    if bsr < 5000:    competition_score += 8
    elif bsr < 20000: competition_score += 6
    elif bsr < 50000: competition_score += 4
    else:             competition_score += 2
    big_brands = ["nike", "apple", "amazon", "samsung", "sony", "adidas",
                  "philips", "bosch", "ikea", "dyson", "logitech", "microsoft"]
    has_big_brand = any(brand in title for brand in big_brands)
    if not has_big_brand:
        competition_score += 5
    patent_keywords = ["®", "™", "patent"]
    has_patent = any(kw in title for kw in patent_keywords)
    if not has_patent:
        competition_score += 5
    competition_score = min(25, competition_score)

    # 4. KARLILIK (0-25)
    profit_score = 0
    if 15 <= price <= 50:   profit_score += 8
    elif 10 <= price < 15:  profit_score += 5
    elif 50 < price <= 80:  profit_score += 5
    elif price > 80:        profit_score += 3
    elif price < 10:        profit_score += 1
    alibaba_price = price * 0.15
    fba_fee = price * 0.15 + 2.5
    net_profit = price - alibaba_price - fba_fee
    margin = (net_profit / price * 100) if price > 0 else 0
    if margin >= 50:   profit_score += 10
    elif margin >= 35: profit_score += 7
    elif margin >= 20: profit_score += 4
    elif margin >= 10: profit_score += 2
    profit_score += min(7, trend_data["score"])
    profit_score = min(25, profit_score)

    score = storage_score + logistics_score + competition_score + profit_score

    # Red Flags
    seasonal_keywords = ["christmas", "halloween", "easter", "valentine", "thanksgiving",
                         "summer", "winter", "holiday", "seasonal", "noel", "yılbaşı"]
    is_seasonal = any(kw in title for kw in seasonal_keywords)
    low_dev_keywords = ["basic", "simple", "standard", "generic", "plain"]
    is_low_dev = any(kw in title for kw in low_dev_keywords) or (reviews > 5000 and rating >= 4.5)
    flags = {
        "big_brand": has_big_brand,
        "seasonal": is_seasonal,
        "low_development": is_low_dev,
        "patent_risk": has_patent,
        "fragile": is_fragile,
        "heavy": weight > 10,
    }

    # Unmet Demand
    unmet_demand = False
    unmet_signals = []
    unmet_score_val = 0
    if reviews < 200 and bsr < 10000:
        unmet_demand = True; unmet_signals.append("Az rakip var ama yüksek talep — erken girme fırsatı!"); unmet_score_val += 40
    if 0 < rating < 4.0 and bsr < 20000:
        unmet_demand = True; unmet_signals.append(f"Düşük müşteri memnuniyeti ({rating}★) — daha iyi ürünle pazar al!"); unmet_score_val += 35
    if price > 40 and reviews < 500:
        unmet_demand = True; unmet_signals.append("Premium segment boş — yüksek fiyatlı az rakip var!"); unmet_score_val += 25
    if bsr < 5000 and reviews < 100:
        unmet_demand = True; unmet_signals.append("Yükselen trend! Az review'a rağmen çok satıyor."); unmet_score_val += 50
    if rvi_val < 10 and bsr < 30000:
        unmet_demand = True; unmet_signals.append(f"Düşük review hızı (RVI: {round(rvi_val, 1)}) — pazar henüz kalabalıklaşmadı."); unmet_score_val += 20
    if keepa_enhanced and gini < 0.3 and bsr < 20000:
        unmet_demand = True; unmet_signals.append(f"Gini: {gini} — pazar dağılmış, dominant oyuncu yok! ✅"); unmet_score_val += 30

    if unmet_score_val >= 50:   unmet_level = "yüksek"
    elif unmet_score_val >= 25: unmet_level = "orta"
    elif unmet_score_val > 0:   unmet_level = "düşük"
    else:                       unmet_level = "yok"

    # 3 Prong
    prong_high_price = price >= 25
    prong_dev_potential = not is_low_dev and reviews < 1000
    prong_low_review_ok = reviews < 500
    prong_score = sum([prong_high_price, prong_dev_potential, prong_low_review_ok])
    prong_verdict = {3: "✅ 3/3 — Mükemmel ürün adayı!", 2: "🟡 2/3 — İyi potansiyel",
                     1: "🟠 1/3 — Zayıf aday", 0: "🔴 0/3 — Uygun değil"}.get(prong_score, "")

    if score >= 90:   verdict, color, recommendation = "MÜKEMMEL NİŞ", "green", "Hemen gir — bu bir fırsat penceresi!"
    elif score >= 70: verdict, color, recommendation = "İYİ NİŞ", "yellow", "Araştır ve gir — potansiyel var."
    elif score >= 50: verdict, color, recommendation = "ORTA NİŞ", "orange", "Dikkatli ol — riskler var."
    else:             verdict, color, recommendation = "ZAYIF NİŞ", "red", "Kaçın — bu niş karlı değil."

    result = {
        "total_score": score,
        "verdict": verdict,
        "color": color,
        "recommendation": recommendation,
        "dimensions": {
            "volume": storage_score,
            "logistics": logistics_score,
            "competition": competition_score,
            "profitability": profit_score,
        },
        "estimated_margin": round(margin, 1),
        "net_profit": round(net_profit, 2),
        "monthly_sales_estimate": monthly_sales,
        "est_monthly_revenue": est_monthly_revenue,
        "review_velocity": {"rvi": round(rvi_val, 1), "label": rvi_label, "score": rvi_score, "trend": rvi_trend},
        "demand_trend": trend_data,
        "flags": flags,
        "unmet_demand": {"detected": unmet_demand, "level": unmet_level, "score": unmet_score_val, "signals": unmet_signals},
        "prong_test": {"score": prong_score, "verdict": prong_verdict, "high_price": prong_high_price,
                       "dev_potential": prong_dev_potential, "low_review_ok": prong_low_review_ok},
    }

    if keepa_enhanced:
        result["keepa"] = {
            "enhanced": True,
            "gini": gini,
            "gini_label": keepa_data.get("gini_label", ""),
            "bsr_trend": real_bsr_trend,
            "price_stats": keepa_data.get("price_stats", {}),
            "bsr_history": keepa_data.get("bsr_history", [])[-30:],
            "price_history": keepa_data.get("price_history", [])[-30:],
        }

    return result


async def calculate_niche_score_with_keepa(product: dict) -> dict:
    """Keepa'dan otomatik veri çekip Niş Skoru hesaplar. 1 token harcar."""
    asin = product.get("asin", "")
    category = product.get("category", "default")
    keepa_data = None
    if asin:
        try:
            keepa_data = await get_keepa_data(asin, category)
        except Exception as e:
            print(f"Keepa fetch error: {e}")
    return calculate_niche_score(product, keepa_data)
