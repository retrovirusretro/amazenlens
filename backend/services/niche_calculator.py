def calculate_niche_score(product: dict) -> dict:
    score = 0
    dimensions_data = product.get("dimensions", {})
    weight = dimensions_data.get("weight", 0)
    title = product.get("title", "").lower()
    price = product.get("price", 0)
    reviews = product.get("reviews", 9999)
    bsr = product.get("bsr", 999999)
    rating = product.get("rating", 0)

    # ─────────────────────────────────────────
    # 1. HACİM & DEPOLAMA (0-25 puan)
    # ─────────────────────────────────────────
    storage_score = 0
    if weight <= 0.5: storage_score += 25
    elif weight <= 1: storage_score += 20
    elif weight <= 2: storage_score += 15
    elif weight <= 5: storage_score += 8
    elif weight <= 10: storage_score += 3
    else: storage_score += 0

    if bsr < 1000: storage_score = min(25, storage_score + 5)
    elif bsr < 10000: storage_score = min(25, storage_score + 3)
    elif bsr < 100000: storage_score = min(25, storage_score + 1)

    storage_score = min(25, storage_score)
    score += storage_score

    # ─────────────────────────────────────────
    # 2. LOJİSTİK (0-25 puan)
    # ─────────────────────────────────────────
    logistics_score = 0
    if weight <= 0.5: logistics_score += 10
    elif weight <= 1: logistics_score += 8
    elif weight <= 2: logistics_score += 6
    elif weight <= 5: logistics_score += 4
    elif weight <= 10: logistics_score += 2
    else: logistics_score += 0

    logistics_score += 5  # FBA uygun varsayılan

    fragile_keywords = ["glass", "ceramic", "mirror", "crystal", "porcelain", "cam", "seramik"]
    is_fragile = any(kw in title for kw in fragile_keywords)
    if not is_fragile:
        logistics_score += 5

    logistics_score += 5  # Alibaba'da var varsayılan
    logistics_score = min(25, logistics_score)
    score += logistics_score

    # ─────────────────────────────────────────
    # 3. REKABET (0-25 puan)
    # ─────────────────────────────────────────
    competition_score = 0
    if reviews < 100: competition_score += 7
    elif reviews < 500: competition_score += 5
    elif reviews < 1000: competition_score += 3
    elif reviews < 5000: competition_score += 1
    else: competition_score += 0

    competition_score += 8  # Rakip sayısı varsayılan orta

    big_brands = ["nike", "apple", "amazon", "samsung", "sony", "adidas", "philips", "bosch", "ikea", "dyson"]
    has_big_brand = any(brand in title for brand in big_brands)
    if not has_big_brand:
        competition_score += 5

    patent_keywords = ["®", "™", "patent"]
    has_patent = any(kw in title for kw in patent_keywords)
    if not has_patent:
        competition_score += 5

    competition_score = min(25, competition_score)
    score += competition_score

    # ─────────────────────────────────────────
    # 4. KARLILIK (0-25 puan)
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
    else: profit_score += 0

    profit_score += 7
    profit_score = min(25, profit_score)
    score += profit_score

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
    # 🔥 UNMET DEMAND TESPİTİ
    # ─────────────────────────────────────────
    unmet_demand = False
    unmet_demand_signals = []
    unmet_demand_score = 0

    # Sinyal 1: Az review ama iyi BSR → talep var, rakip az
    if reviews < 200 and bsr < 10000:
        unmet_demand = True
        unmet_demand_signals.append("Az rakip var ama yüksek talep — erken girme fırsatı!")
        unmet_demand_score += 40

    # Sinyal 2: Düşük rating + yüksek satış → iyileştirme fırsatı
    if 0 < rating < 4.0 and bsr < 20000:
        unmet_demand = True
        unmet_demand_signals.append(f"Düşük müşteri memnuniyeti ({rating}★) — daha iyi ürünle pazar al!")
        unmet_demand_score += 35

    # Sinyal 3: Yüksek fiyat + az review → premium segment boş
    if price > 40 and reviews < 500:
        unmet_demand = True
        unmet_demand_signals.append("Premium segment boş — yüksek fiyatlı az rakip var!")
        unmet_demand_score += 25

    # Sinyal 4: Çok iyi BSR ama çok az review → yeni trend
    if bsr < 5000 and reviews < 100:
        unmet_demand = True
        unmet_demand_signals.append("Yükselen trend! Az review'a rağmen çok satıyor.")
        unmet_demand_score += 50

    unmet_demand_level = "yok"
    if unmet_demand_score >= 50: unmet_demand_level = "yüksek"
    elif unmet_demand_score >= 25: unmet_demand_level = "orta"
    elif unmet_demand_score > 0: unmet_demand_level = "düşük"

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
    if score >= 90: verdict, color, recommendation = "MÜKEMMEL NİŞ", "green", "Hemen gir!"
    elif score >= 70: verdict, color, recommendation = "İYİ NİŞ", "yellow", "Araştır ve gir."
    elif score >= 50: verdict, color, recommendation = "ORTA NİŞ", "orange", "Dikkatli ol."
    else: verdict, color, recommendation = "ZAYIF NİŞ", "red", "Kaçın."

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
        "flags": flags,
        "unmet_demand": {
            "detected": unmet_demand,
            "level": unmet_demand_level,
            "score": unmet_demand_score,
            "signals": unmet_demand_signals,
        },
        "prong_test": {
            "score": prong_score,
            "verdict": prong_verdict,
            "high_price": prong_high_price,
            "dev_potential": prong_dev_potential,
            "low_review_ok": prong_low_review_ok,
        }
    }
