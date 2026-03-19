import math

# ─────────────────────────────────────────────────────────────────
# Kategori bazlı BSR → Satış tahmini (power-law modeli)
# Sales = k × BSR^(-a)
# ─────────────────────────────────────────────────────────────────
CATEGORY_BSR_PARAMS = {
    "Home & Kitchen":       {"k": 500000, "a": 0.85},
    "Sports & Outdoors":    {"k": 400000, "a": 0.82},
    "Health & Household":   {"k": 450000, "a": 0.83},
    "Beauty & Personal":    {"k": 420000, "a": 0.84},
    "Toys & Games":         {"k": 380000, "a": 0.80},
    "Electronics":          {"k": 600000, "a": 0.90},
    "Clothing":             {"k": 700000, "a": 0.88},
    "Books":                {"k": 300000, "a": 0.75},
    "Pet Supplies":         {"k": 350000, "a": 0.81},
    "Office Products":      {"k": 320000, "a": 0.79},
    "default":              {"k": 400000, "a": 0.82},
}

def bsr_to_monthly_sales(bsr: int, category: str = "default") -> int:
    """BSR'dan aylık tahmini satış hesabı — power-law modeli"""
    if bsr <= 0:
        return 0
    params = CATEGORY_BSR_PARAMS.get(category, CATEGORY_BSR_PARAMS["default"])
    daily = params["k"] * (bsr ** -params["a"])
    monthly = daily * 30
    return max(1, int(monthly))

def review_velocity_index(reviews: int, product_age_days: int = 180) -> float:
    """
    Review Velocity Index — aylık ortalama review kazanım hızı.
    Düşük RVI = henüz kalabalıklaşmamış pazar = giriş fırsatı.
    """
    if product_age_days <= 0:
        return reviews / 6  # varsayılan 6 ay
    return (reviews / product_age_days) * 30  # aylık hız

def demand_trend_score(bsr: int, bsr_30d_ago: int = None) -> dict:
    """
    BSR değişim trendi.
    BSR düşüyorsa → talep artıyor (pozitif)
    BSR yükseliyorsa → talep azalıyor (negatif)
    """
    if bsr_30d_ago is None:
        # Keepa yoksa mock: BSR'a göre tahmin et
        if bsr < 1000: trend = "yükselen"
        elif bsr < 10000: trend = "stabil"
        else: trend = "belirsiz"
        return {"trend": trend, "change_pct": None, "score": 5 if bsr < 5000 else 3}

    if bsr_30d_ago > 0:
        change_pct = ((bsr_30d_ago - bsr) / bsr_30d_ago) * 100
    else:
        change_pct = 0

    if change_pct > 20:
        trend, score = "hızlı yükselen", 10
    elif change_pct > 5:
        trend, score = "yükselen", 7
    elif change_pct > -5:
        trend, score = "stabil", 5
    elif change_pct > -20:
        trend, score = "düşen", 2
    else:
        trend, score = "hızlı düşen", 0

    return {"trend": trend, "change_pct": round(change_pct, 1), "score": score}


def calculate_niche_score(product: dict) -> dict:
    dimensions_data = product.get("dimensions", {})
    weight = dimensions_data.get("weight", 0)
    title = product.get("title", "").lower()
    price = product.get("price", 0) or 0
    reviews = product.get("reviews_count", product.get("reviews", 9999)) or 9999
    bsr = product.get("bestseller_rank", product.get("bsr", 999999)) or 999999
    rating = product.get("rating", 0) or 0
    category = product.get("category", "default")

    # ─────────────────────────────────────────
    # BSR → Aylık Satış Tahmini (power-law)
    # ─────────────────────────────────────────
    monthly_sales = bsr_to_monthly_sales(bsr, category)
    est_monthly_revenue = round(monthly_sales * price, 2)

    # ─────────────────────────────────────────
    # Review Velocity Index
    # ─────────────────────────────────────────
    rvi = review_velocity_index(reviews)
    # RVI < 10 → az kalabalık, < 30 → orta, > 50 → hızlı doluyor
    if rvi < 10: rvi_label, rvi_score = "Düşük (giriş fırsatı)", 10
    elif rvi < 30: rvi_label, rvi_score = "Orta", 6
    elif rvi < 60: rvi_label, rvi_score = "Yüksek", 3
    else: rvi_label, rvi_score = "Çok Yüksek (pazar doldu)", 0

    # ─────────────────────────────────────────
    # Talep Trendi
    # ─────────────────────────────────────────
    trend_data = demand_trend_score(bsr)

    # ─────────────────────────────────────────
    # 1. HACİM & DEPOLAMA (0-25 puan)
    # ─────────────────────────────────────────
    storage_score = 0
    if weight <= 0.5: storage_score += 25
    elif weight <= 1: storage_score += 20
    elif weight <= 2: storage_score += 15
    elif weight <= 5: storage_score += 8
    elif weight <= 10: storage_score += 3

    if bsr < 1000: storage_score = min(25, storage_score + 5)
    elif bsr < 10000: storage_score = min(25, storage_score + 3)
    elif bsr < 100000: storage_score = min(25, storage_score + 1)

    storage_score = min(25, storage_score)

    # ─────────────────────────────────────────
    # 2. LOJİSTİK (0-25 puan)
    # ─────────────────────────────────────────
    logistics_score = 0
    if weight <= 0.5: logistics_score += 10
    elif weight <= 1: logistics_score += 8
    elif weight <= 2: logistics_score += 6
    elif weight <= 5: logistics_score += 4
    elif weight <= 10: logistics_score += 2

    logistics_score += 5  # FBA uygun varsayılan

    fragile_keywords = ["glass", "ceramic", "mirror", "crystal", "porcelain", "cam", "seramik"]
    is_fragile = any(kw in title for kw in fragile_keywords)
    if not is_fragile:
        logistics_score += 5

    logistics_score += 5  # Alibaba'da var varsayılan
    logistics_score = min(25, logistics_score)

    # ─────────────────────────────────────────
    # 3. REKABET (0-25 puan) — RVI dahil
    # ─────────────────────────────────────────
    competition_score = 0

    # Review sayısı yerine RVI kullan
    competition_score += min(7, rvi_score // 1)

    # Rakip yoğunluğu (BSR bazlı)
    if bsr < 5000: competition_score += 8
    elif bsr < 20000: competition_score += 6
    elif bsr < 50000: competition_score += 4
    else: competition_score += 2

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

    # ─────────────────────────────────────────
    # 4. KARLILIK (0-25 puan) — Trend dahil
    # ─────────────────────────────────────────
    profit_score = 0
    if 15 <= price <= 50: profit_score += 8
    elif 10 <= price < 15: profit_score += 5
    elif 50 < price <= 80: profit_score += 5
    elif price > 80: profit_score += 3
    elif price < 10: profit_score += 1

    alibaba_price = price * 0.15
    fba_fee = price * 0.15 + 2.5
    net_profit = price - alibaba_price - fba_fee
    margin = (net_profit / price * 100) if price > 0 else 0

    if margin >= 50: profit_score += 10
    elif margin >= 35: profit_score += 7
    elif margin >= 20: profit_score += 4
    elif margin >= 10: profit_score += 2

    # Trend skoru karlılığa ekle
    profit_score += min(7, trend_data["score"])
    profit_score = min(25, profit_score)

    score = storage_score + logistics_score + competition_score + profit_score

    # ─────────────────────────────────────────
    # 🚩 RED FLAGS
    # ─────────────────────────────────────────
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

    # ─────────────────────────────────────────
    # 🔥 UNMET DEMAND
    # ─────────────────────────────────────────
    unmet_demand = False
    unmet_signals = []
    unmet_score = 0

    if reviews < 200 and bsr < 10000:
        unmet_demand = True
        unmet_signals.append("Az rakip var ama yüksek talep — erken girme fırsatı!")
        unmet_score += 40

    if 0 < rating < 4.0 and bsr < 20000:
        unmet_demand = True
        unmet_signals.append(f"Düşük müşteri memnuniyeti ({rating}★) — daha iyi ürünle pazar al!")
        unmet_score += 35

    if price > 40 and reviews < 500:
        unmet_demand = True
        unmet_signals.append("Premium segment boş — yüksek fiyatlı az rakip var!")
        unmet_score += 25

    if bsr < 5000 and reviews < 100:
        unmet_demand = True
        unmet_signals.append("Yükselen trend! Az review'a rağmen çok satıyor.")
        unmet_score += 50

    if rvi < 10 and bsr < 30000:
        unmet_demand = True
        unmet_signals.append(f"Düşük review hızı (RVI: {round(rvi, 1)}) — pazar henüz kalabalıklaşmadı.")
        unmet_score += 20

    if unmet_score >= 50: unmet_level = "yüksek"
    elif unmet_score >= 25: unmet_level = "orta"
    elif unmet_score > 0: unmet_level = "düşük"
    else: unmet_level = "yok"

    # ─────────────────────────────────────────
    # 3 PRONG TESTİ
    # ─────────────────────────────────────────
    prong_high_price = price >= 25
    prong_dev_potential = not is_low_dev and reviews < 1000
    prong_low_review_ok = reviews < 500

    prong_score = sum([prong_high_price, prong_dev_potential, prong_low_review_ok])
    prong_verdict = {
        3: "✅ 3/3 — Mükemmel ürün adayı!",
        2: "🟡 2/3 — İyi potansiyel",
        1: "🟠 1/3 — Zayıf aday",
        0: "🔴 0/3 — Uygun değil"
    }.get(prong_score, "")

    # ─────────────────────────────────────────
    # FINAL
    # ─────────────────────────────────────────
    if score >= 90: verdict, color, recommendation = "MÜKEMMEL NİŞ", "green", "Hemen gir — bu bir fırsat penceresi!"
    elif score >= 70: verdict, color, recommendation = "İYİ NİŞ", "yellow", "Araştır ve gir — potansiyel var."
    elif score >= 50: verdict, color, recommendation = "ORTA NİŞ", "orange", "Dikkatli ol — riskler var."
    else: verdict, color, recommendation = "ZAYIF NİŞ", "red", "Kaçın — bu niş karlı değil."

    return {
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
        "review_velocity": {
            "rvi": round(rvi, 1),
            "label": rvi_label,
            "score": rvi_score,
        },
        "demand_trend": trend_data,
        "flags": flags,
        "unmet_demand": {
            "detected": unmet_demand,
            "level": unmet_level,
            "score": unmet_score,
            "signals": unmet_signals,
        },
        "prong_test": {
            "score": prong_score,
            "verdict": prong_verdict,
            "high_price": prong_high_price,
            "dev_potential": prong_dev_potential,
            "low_review_ok": prong_low_review_ok,
        }
    }
