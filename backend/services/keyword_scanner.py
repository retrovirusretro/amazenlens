import httpx
import asyncio
import os
from anthropic import Anthropic

anthropic = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

async def get_autocomplete(keyword: str, market: str = "US") -> list:
    domain_map = {"US": "com", "DE": "de", "UK": "co.uk", "FR": "fr"}
    domain = domain_map.get(market, "com")
    url = f"https://completion.amazon.{domain}/api/2017/suggestions"
    params = {
        "mid": "ATVPDKIKX0DER" if market == "US" else "A1PA6795UKMFR9",
        "alias": "aps", "fresh": "0", "ks": "80", "prefix": keyword,
        "event": "onKeyPress", "limit": "11", "b2b": "0", "fb": "1",
        "suggestion-type": ["KEYWORD", "WIDGET"],
    }
    try:
        async with httpx.AsyncClient(timeout=10, verify=False) as client:
            r = await client.get(url, params=params, headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            })
            if r.status_code == 200:
                data = r.json()
                suggestions = data.get("suggestions", [])
                return [s.get("value", "") for s in suggestions if s.get("value")]
    except Exception as e:
        print(f"Autocomplete error ({market}): {e}")
    return []

async def estimate_volume_binary(keyword: str, market: str = "US") -> int:
    """
    TunaYagci/amazon-estimation binary search algoritması.
    Kaynak: github.com/TunaYagci/amazon-estimation
    
    Mantık: keyword'ü harf harf kısaltarak autocomplete'e sor.
    Ne kadar az harfle öneriliyor → o kadar yüksek arama hacmi.
    
    Örnek: "iphone charger" için "i" yazınca çıkıyorsa → hacim 100
    Tam keyword yazınca çıkıyorsa → hacim düşük
    Hiç çıkmıyorsa → hacim 0
    
    O(log n) binary search ile optimize edilmiş.
    """
    if not keyword or len(keyword) < 2:
        return 0

    keyword_lower = keyword.lower().strip()
    n = len(keyword_lower)
    EXPONENTIAL_FACTOR = 1.25

    # Önce tam keyword'ü dene — çıkmıyorsa direkt 0
    full_suggestions = await get_autocomplete(keyword_lower, market)
    full_lower = [s.lower() for s in full_suggestions]
    if keyword_lower not in full_lower:
        return 0

    # Binary search: kaç harfle çıkıyor?
    low, high = 1, n
    first_appear = n  # en az kaç harfle çıktığı

    while low <= high:
        mid = (low + high) // 2
        prefix = keyword_lower[:mid]
        suggestions = await get_autocomplete(prefix, market)
        suggestions_lower = [s.lower() for s in suggestions]

        if keyword_lower in suggestions_lower:
            first_appear = mid
            high = mid - 1  # daha az harfle dene
        else:
            low = mid + 1  # daha fazla harf lazım

    # Skor hesapla: ne kadar az harfle çıkıyorsa o kadar yüksek skor
    # first_appear = 1 → skor 100 (tek harfle çıkıyor = çok popüler)
    # first_appear = n → skor düşük (ancak tam yazınca çıkıyor)
    pct_used = (first_appear - 1) / max(n - 1, 1)
    score = int(100 - pct_used * 80)  # 20-100 arası
    return max(0, min(score, 100))


def estimate_volume(keyword: str, suggestions: list) -> int:
    """
    Hızlı pozisyon bazlı tahmin — binary search yokken fallback.
    Autocomplete listesindeki pozisyona göre hacim tahmini.
    """
    keywords_lower = [s.lower() for s in suggestions]
    keyword_lower = keyword.lower()
    if keyword_lower in keywords_lower:
        pos = keywords_lower.index(keyword_lower)
        if pos == 0: return 90
        if pos <= 2: return 75
        if pos <= 5: return 55
        return 35
    if any(s.lower().startswith(keyword_lower) for s in suggestions[:3]):
        return 65
    return 20

def calc_iq_score(volume: int, competing_products: int) -> int:
    if competing_products <= 0: return 0
    raw = (volume / competing_products) * 10000
    return min(int(raw), 100)

def calc_title_density(keyword: str, titles: list) -> dict:
    keyword_lower = keyword.lower()
    words = keyword_lower.split()
    count = 0
    exact_count = 0
    for title in titles:
        title_lower = title.lower()
        if keyword_lower in title_lower:
            exact_count += 1
            count += 1
        elif all(w in title_lower for w in words):
            count += 1
    total = len(titles)
    return {
        "exact": exact_count,
        "partial": count - exact_count,
        "total": count,
        "density_pct": round((count / total * 100) if total > 0 else 0, 1)
    }

async def expand_with_claude(seed_keyword: str, market: str = "US", existing: list = []) -> dict:
    lang_hint = "German" if market == "DE" else "English"
    existing_str = ", ".join(existing[:10]) if existing else "none"

    prompt = f"""You are an Amazon listing optimization expert and keyword researcher.

Seed keyword: "{seed_keyword}"
Market: Amazon.{market.lower() if market != 'US' else 'com'}
Language: {lang_hint}
Already found keywords: {existing_str}

Generate keyword analysis and READY-TO-USE listing content. Respond ONLY with valid JSON, no markdown, no explanation:

{{
  "long_tail": [
    {{"keyword": "...", "intent": "informational|transactional|navigational", "buyer_score": 0-100, "note": "..."}}
  ],
  "negative_keywords": ["...", "..."],
  "listing_tips": {{
    "title": "EXACT ready-to-use Amazon title (copy-paste ready, 150-200 chars): [Product Type] [Key Feature 1] [Key Feature 2] [Size/Quantity] for [Use Case] - [Benefit]",
    "title_example": "Write a specific example title for '{seed_keyword}' product here",
    "bullets": [
      "✅ BULLET 1: Start with benefit, include key feature and spec",
      "✅ BULLET 2: Second most important feature with proof point",
      "✅ BULLET 3: Use case / compatibility / who it's for",
      "✅ BULLET 4: Quality/material/certification details",
      "✅ BULLET 5: Guarantee / warranty / what's in the box"
    ],
    "backend": "keyword1, keyword2, keyword3, keyword4, keyword5 (10-15 backend search terms)"
  }},
  "cross_market": {{
    "de_equivalent": "German equivalent keyword (single best keyword)",
    "de_notes": "One sentence notes for German market"
  }}
}}

For the title_example, write a SPECIFIC, REAL product title for "{seed_keyword}" — not a template, but an actual title a seller could use today. Include specific features, size, material or quantity.
Generate 15-20 long_tail keywords."""

    try:
        response = anthropic.messages.create(
            model="claude-haiku-4-5",
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}]
        )
        import json
        text = response.content[0].text.strip()
        if "```" in text:
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text)
    except Exception as e:
        print(f"Claude expand error: {e}")
        return {
            "long_tail": [],
            "negative_keywords": [],
            "listing_tips": {"title": "", "title_example": "", "bullets": [], "backend": ""},
            "cross_market": {"de_equivalent": "", "de_notes": ""}
        }

async def analyze_keyword(keyword: str, market: str = "US", include_de: bool = True) -> dict:
    from services.trend_service import get_trend_data, get_related_queries

    tasks = [get_autocomplete(keyword, "US")]
    if include_de:
        tasks.append(get_autocomplete(keyword, "DE"))

    results = await asyncio.gather(*tasks, return_exceptions=True)
    us_suggestions = results[0] if not isinstance(results[0], Exception) else []
    de_suggestions = results[1] if include_de and not isinstance(results[1], Exception) else []

    # TunaYagci binary search ile gerçek hacim skoru
    try:
        us_volume = await estimate_volume_binary(keyword, "US")
        if us_volume == 0:  # binary search 0 döndürdüyse pozisyon bazlı kullan
            us_volume = estimate_volume(keyword, us_suggestions)
        de_volume = await estimate_volume_binary(keyword, "DE") if include_de else 0
        if include_de and de_volume == 0:
            de_volume = estimate_volume(keyword, de_suggestions)
    except Exception as e:
        print(f"Binary search error: {e}")
        us_volume = estimate_volume(keyword, us_suggestions)
        de_volume = estimate_volume(keyword, de_suggestions) if include_de else 0

    competing_us = len(us_suggestions) * 50 + 500
    competing_de = len(de_suggestions) * 40 + 300 if include_de else 0

    iq_us = calc_iq_score(us_volume, competing_us)
    iq_de = calc_iq_score(de_volume, competing_de) if include_de else 0

    density = calc_title_density(keyword, us_suggestions)

    buyer_words = ["buy", "best", "cheap", "discount", "sale", "for", "with", "set", "kit", "pack"]
    info_words = ["what", "how", "why", "vs", "review", "comparison"]
    kw_lower = keyword.lower()
    if any(w in kw_lower for w in buyer_words):
        buyer_intent = "transactional"
        buyer_score = 80
    elif any(w in kw_lower for w in info_words):
        buyer_intent = "informational"
        buyer_score = 30
    else:
        buyer_intent = "mixed"
        buyer_score = 55

    all_suggestions = list(set(us_suggestions + de_suggestions))
    claude_data = await expand_with_claude(keyword, market, all_suggestions)

    all_keywords = []
    for s in us_suggestions:
        if s and s.lower() != keyword.lower():
            vol = estimate_volume(s, us_suggestions)
            all_keywords.append({
                "keyword": s, "market": "US", "volume": vol,
                "iq_score": calc_iq_score(vol, competing_us),
                "intent": buyer_intent, "buyer_score": buyer_score,
                "source": "autocomplete",
            })

    for lt in claude_data.get("long_tail", []):
        if lt.get("keyword"):
            vol = estimate_volume(lt["keyword"], us_suggestions)
            all_keywords.append({
                "keyword": lt["keyword"], "market": "US", "volume": vol,
                "iq_score": calc_iq_score(vol, competing_us),
                "intent": lt.get("intent", "mixed"),
                "buyer_score": lt.get("buyer_score", 50),
                "note": lt.get("note", ""),
                "source": "ai",
            })

    if include_de:
        for s in de_suggestions:
            if s:
                vol = estimate_volume(s, de_suggestions)
                all_keywords.append({
                    "keyword": s, "market": "DE", "volume": vol,
                    "iq_score": calc_iq_score(vol, competing_de),
                    "intent": "mixed", "buyer_score": 50,
                    "source": "autocomplete_de",
                })

    all_keywords.sort(key=lambda x: x.get("buyer_score", 0), reverse=True)

    # Keyword Difficulty
    difficulty = calc_keyword_difficulty(keyword, us_suggestions, us_suggestions)

    # Google Trends verisi
    trend_data = {}
    related_data = {}
    try:
        import concurrent.futures
        loop = asyncio.get_event_loop()
        trend_data = await loop.run_in_executor(None, get_trend_data, keyword, "today 12-m", "")
        related_data = await loop.run_in_executor(None, get_related_queries, keyword)
    except Exception as e:
        print(f"Trend fetch error: {e}")

    # Trend skoru keyword listesine ekle
    trend_direction = trend_data.get("direction", "unknown")
    trend_score_val = trend_data.get("trend_score", 0)
    is_seasonal = trend_data.get("is_seasonal", False)

    return {
        "seed_keyword": keyword,
        "markets": {
            "US": {"volume": us_volume, "competing_products": competing_us, "iq_score": iq_us, "suggestions": us_suggestions},
            "DE": {"volume": de_volume, "competing_products": competing_de, "iq_score": iq_de, "suggestions": de_suggestions} if include_de else None
        },
        "title_density": density,
        "buyer_intent": buyer_intent,
        "buyer_score": buyer_score,
        "trend": {
            "direction": trend_direction,
            "direction_tr": trend_data.get("direction_tr", "—"),
            "score": trend_score_val,
            "avg_score": trend_data.get("avg_score", 0),
            "monthly": trend_data.get("monthly", []),
            "is_seasonal": is_seasonal,
            "seasonality_ratio": trend_data.get("seasonality_ratio", 0),
            "peak_month": trend_data.get("peak_month", 0),
            "rising_queries": related_data.get("rising", []),
        },
        "keywords": all_keywords,
        "negative_keywords": claude_data.get("negative_keywords", []),
        "listing_tips": claude_data.get("listing_tips", {}),
        "cross_market": claude_data.get("cross_market", {}),
        "total_keywords": len(all_keywords),
        "difficulty": difficulty,
    }


# ─── FR/TR/ES Pazar Desteği ──────────────────────────────────────────────────
MARKET_CONFIG = {
    "US": {"domain": "com",    "mid": "ATVPDKIKX0DER",  "lang": "English"},
    "DE": {"domain": "de",     "mid": "A1PA6795UKMFR9",  "lang": "German"},
    "FR": {"domain": "fr",     "mid": "A13V1IB3VIYZZH",  "lang": "French"},
    "ES": {"domain": "es",     "mid": "A1RKKUPIHCS9HS",  "lang": "Spanish"},
    "TR": {"domain": "com.tr", "mid": "A33AVAJ2PDY3EV",  "lang": "Turkish"},
    "UK": {"domain": "co.uk",  "mid": "A1F83G8C2ARO7P",  "lang": "English"},
    "IT": {"domain": "it",     "mid": "APJ6JRA9NG5V4",   "lang": "Italian"},
    "JP": {"domain": "co.jp",  "mid": "A1VC38T7YXB528",  "lang": "Japanese"},
}

async def get_autocomplete_multi(keyword: str, markets: list) -> dict:
    """Birden fazla pazarda autocomplete — paralel"""
    tasks = [get_autocomplete(keyword, m) for m in markets]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    return {
        market: (result if not isinstance(result, Exception) else [])
        for market, result in zip(markets, results)
    }


# ─── Keyword Difficulty Skoru ─────────────────────────────────────────────────
def calc_keyword_difficulty(keyword: str, suggestions: list, us_suggestions: list) -> dict:
    """
    Keyword Difficulty — rakip yoğunluğu tahmini.
    Title density + autocomplete pozisyonu + keyword uzunluğu
    """
    keyword_lower = keyword.lower()
    words = keyword_lower.split()

    # 1. Title density (öneriler içinde keyword ne kadar geçiyor)
    density = calc_title_density(keyword, suggestions)
    density_score = min(density.get("density_pct", 0) * 2, 100)

    # 2. Autocomplete pozisyonu — erken çıkıyorsa popüler = zor
    suggestions_lower = [s.lower() for s in suggestions]
    if keyword_lower in suggestions_lower:
        pos = suggestions_lower.index(keyword_lower)
        position_score = max(0, 100 - pos * 15)
    else:
        position_score = 20

    # 3. Keyword uzunluğu — uzun kuyruk = daha kolay
    length_score = max(0, 100 - (len(words) - 1) * 20)

    # 4. Genel öneri sayısı — çok öneri = rekabetçi alan
    suggestion_count_score = min(len(suggestions) * 10, 100)

    # Ağırlıklı toplam
    difficulty = int(
        0.35 * density_score +
        0.30 * position_score +
        0.20 * length_score +
        0.15 * suggestion_count_score
    )
    difficulty = max(0, min(difficulty, 100))

    if difficulty >= 70:
        level = "hard"
        level_tr = "🔴 Zor"
        advice = "Uzun kuyruk varyantlarını hedefle"
    elif difficulty >= 40:
        level = "medium"
        level_tr = "🟡 Orta"
        advice = "Girilebilir, ama iyi listing şart"
    else:
        level = "easy"
        level_tr = "🟢 Kolay"
        advice = "Düşük rekabet — hemen girilebilir!"

    return {
        "score": difficulty,
        "level": level,
        "level_tr": level_tr,
        "advice": advice,
        "breakdown": {
            "density": round(density_score),
            "position": round(position_score),
            "length": round(length_score),
            "competition": round(suggestion_count_score),
        }
    }


# ─── ASIN Rezerv Checker ─────────────────────────────────────────────────────
async def get_ranking_asins(keyword: str, market: str = "US") -> list:
    """
    Keyword için Amazon arama sonuçlarından ASIN listesi çek.
    Easyparser yoksa autocomplete önerilerinden tahmin üret.
    """
    config = MARKET_CONFIG.get(market, MARKET_CONFIG["US"])

    # Amazon arama URL'inden ASIN parse etmeyi dene
    search_url = f"https://www.amazon.{config['domain']}/s"
    params = {"k": keyword, "ref": "nb_sb_noss"}

    asins = []
    try:
        async with httpx.AsyncClient(timeout=15, verify=False, follow_redirects=True) as client:
            r = await client.get(search_url, params=params, headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9",
                "Accept": "text/html,application/xhtml+xml",
            })
            if r.status_code == 200:
                import re
                # ASIN pattern: /dp/XXXXXXXXXX
                found = re.findall(r'/dp/([A-Z0-9]{10})', r.text)
                # Deduplicate, ilk 10
                seen = set()
                for asin in found:
                    if asin not in seen and not asin.startswith("B000000"):
                        seen.add(asin)
                        asins.append(asin)
                        if len(asins) >= 10:
                            break
    except Exception as e:
        print(f"ASIN scrape error: {e}")

    return asins


async def asin_reserve_checker(keyword: str, market: str = "US") -> dict:
    """
    Keyword'de rank alan rakip ASIN'leri bul + niş skoru tahmini
    """
    asins = await get_ranking_asins(keyword, market)

    results = []
    for i, asin in enumerate(asins[:10]):
        results.append({
            "rank": i + 1,
            "asin": asin,
            "amazon_url": f"https://www.amazon.{'com' if market == 'US' else MARKET_CONFIG.get(market, {}).get('domain', 'com')}/dp/{asin}",
            "niche_url": f"/app/niche?asin={asin}",
        })

    return {
        "keyword": keyword,
        "market": market,
        "ranking_asins": results,
        "total_found": len(results),
        "note": "İlk sayfada rank alan ürünler — rakip analizi için tıkla"
    }


# ─── Reverse ASIN ─────────────────────────────────────────────────────────────
async def reverse_asin(asin: str, market: str = "US") -> dict:
    """
    ASIN → bu ürünün rank aldığı keyword'ler.
    Strateji: ürün başlığını parse et + autocomplete ile genişlet
    """
    config = MARKET_CONFIG.get(market, MARKET_CONFIG["US"])
    product_url = f"https://www.amazon.{config['domain']}/dp/{asin}"

    title = ""
    keywords_found = []

    try:
        async with httpx.AsyncClient(timeout=15, verify=False, follow_redirects=True) as client:
            r = await client.get(product_url, headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9",
            })
            if r.status_code == 200:
                import re
                # Title çek
                title_match = re.search(r'<span id="productTitle"[^>]*>(.*?)</span>', r.text, re.DOTALL)
                if title_match:
                    title = title_match.group(1).strip()
                    title = re.sub(r'<[^>]+>', '', title).strip()

                # Bullet points'ten keyword çıkar
                bullets = re.findall(r'<span class="a-list-item">(.*?)</span>', r.text, re.DOTALL)
                bullet_text = " ".join(bullets[:5])
                bullet_text = re.sub(r'<[^>]+>', '', bullet_text)

    except Exception as e:
        print(f"Reverse ASIN scrape error: {e}")

    # Title'dan keyword'ler üret
    if title:
        words = title.lower().split()
        # Stop words filtrele
        stop_words = {"the", "a", "an", "and", "or", "for", "with", "in", "on", "at", "by", "of", "to", "from"}
        meaningful_words = [w for w in words if w not in stop_words and len(w) > 2]

        # 2-3 kelimelik kombinasyonlar
        for i in range(len(meaningful_words)):
            kw2 = " ".join(meaningful_words[i:i+2])
            kw3 = " ".join(meaningful_words[i:i+3])
            if len(kw2) > 5:
                keywords_found.append(kw2)
            if len(kw3) > 8:
                keywords_found.append(kw3)

    # Autocomplete ile genişlet — paralel
    expanded = {}
    if keywords_found[:5]:
        tasks = [get_autocomplete(kw, market) for kw in keywords_found[:5]]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        for kw, result in zip(keywords_found[:5], results):
            if not isinstance(result, Exception) and result:
                vol = estimate_volume(kw, result)
                expanded[kw] = {
                    "keyword": kw,
                    "volume": vol,
                    "suggestions": result[:5],
                    "source": "reverse_asin"
                }

    return {
        "asin": asin,
        "market": market,
        "product_title": title or f"ASIN: {asin}",
        "keywords": list(expanded.values()),
        "total_keywords": len(expanded),
        "note": "Ürünün rank aldığı tahmini keyword'ler — title analizi"
    }
