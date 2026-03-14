def calculate_niche_score(product: dict) -> dict:
    score = 0
    details = {}

    # 1. HACİM & DEPOLAMA (0-25 puan)
    storage_score = 0
    dimensions = product.get("dimensions", {})
    weight = dimensions.get("weight", 0)
    
    if weight <= 0.5:
        storage_score += 25
    elif weight <= 1:
        storage_score += 20
    elif weight <= 2:
        storage_score += 15
    elif weight <= 5:
        storage_score += 8
    elif weight <= 10:
        storage_score += 3
    else:
        storage_score += 0

    bsr = product.get("bsr", 999999)
    if bsr < 1000:
        storage_score = min(25, storage_score + 5)
    elif bsr < 10000:
        storage_score = min(25, storage_score + 3)
    elif bsr < 100000:
        storage_score = min(25, storage_score + 1)

    storage_score = min(25, storage_score)
    details["storage"] = storage_score
    score += storage_score

    # 2. LOJİSTİK (0-25 puan)
    logistics_score = 0

    if weight <= 0.5:
        logistics_score += 10
    elif weight <= 1:
        logistics_score += 8
    elif weight <= 2:
        logistics_score += 6
    elif weight <= 5:
        logistics_score += 4
    elif weight <= 10:
        logistics_score += 2
    else:
        logistics_score += 0

    logistics_score += 5  # FBA uygun varsayılan

    title = product.get("title", "").lower()
    fragile_keywords = ["glass", "ceramic", "mirror", "crystal", "porcelain"]
    if not any(kw in title for kw in fragile_keywords):
        logistics_score += 5

    logistics_score += 5  # Alibaba'da bulunuyor varsayılan

    logistics_score = min(25, logistics_score)
    details["logistics"] = logistics_score
    score += logistics_score

    # 3. REKABET (0-25 puan)
    competition_score = 0

    reviews = product.get("reviews", 9999)
    if reviews < 100:
        competition_score += 7
    elif reviews < 500:
        competition_score += 5
    elif reviews < 1000:
        competition_score += 3
    elif reviews < 5000:
        competition_score += 1
    else:
        competition_score += 0

    competition_score += 8  # Rakip sayısı varsayılan orta

    big_brands = ["nike", "apple", "amazon", "samsung", "sony", "adidas"]
    if not any(brand in title for brand in big_brands):
        competition_score += 5

    patent_keywords = ["®", "™", "patent"]
    if not any(kw in title for kw in patent_keywords):
        competition_score += 5

    competition_score = min(25, competition_score)
    details["competition"] = competition_score
    score += competition_score

    # 4. KARLILIK (0-25 puan)
    profit_score = 0

    price = product.get("price", 0)
    if 15 <= price <= 50:
        profit_score += 8
    elif 10 <= price < 15:
        profit_score += 5
    elif 50 < price <= 80:
        profit_score += 5
    elif price > 80:
        profit_score += 3
    elif price < 10:
        profit_score += 1

    alibaba_price = price * 0.15
    fba_fee = 4.50
    net_profit = price - alibaba_price - fba_fee
    margin = (net_profit / price * 100) if price > 0 else 0

    if margin >= 50:
        profit_score += 10
    elif margin >= 35:
        profit_score += 7
    elif margin >= 20:
        profit_score += 4
    elif margin >= 10:
        profit_score += 2
    else:
        profit_score += 0

    profit_score += 7  # Fiyat rekabeti varsayılan

    profit_score = min(25, profit_score)
    details["profit"] = profit_score
    score += profit_score

    # FINAL KARAR
    if score >= 90:
        verdict = "MÜKEMMEL NİŞ"
        color = "green"
        recommendation = "Hemen gir!"
    elif score >= 70:
        verdict = "İYİ NİŞ"
        color = "yellow"
        recommendation = "Araştır ve gir."
    elif score >= 50:
        verdict = "ORTA NİŞ"
        color = "orange"
        recommendation = "Dikkatli ol."
    else:
        verdict = "ZAYIF NİŞ"
        color = "red"
        recommendation = "Kaçın."

    return {
        "total_score": score,
        "verdict": verdict,
        "color": color,
        "recommendation": recommendation,
        "details": details,
        "estimated_margin": round(margin, 1)
    }