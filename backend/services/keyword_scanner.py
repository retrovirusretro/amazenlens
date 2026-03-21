import httpx
import asyncio
import os
from anthropic import Anthropic

anthropic = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

# ─── Amazon Autocomplete ──────────────────────────────────────────────────────

async def get_autocomplete(keyword: str, market: str = "US") -> list:
    """Amazon autocomplete API'den öneri çek"""
    domain_map = {"US": "com", "DE": "de", "UK": "co.uk", "FR": "fr"}
    domain = domain_map.get(market, "com")
    url = f"https://completion.amazon.{domain}/api/2017/suggestions"
    params = {
        "mid": "ATVPDKIKX0DER" if market == "US" else "A1PA6795UKMFR9",
        "alias": "aps",
        "fresh": "0",
        "ks": "80",
        "prefix": keyword,
        "event": "onKeyPress",
        "limit": "11",
        "b2b": "0",
        "fb": "1",
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

# ─── Arama Hacmi Tahmini ──────────────────────────────────────────────────────

def estimate_volume(keyword: str, suggestions: list) -> int:
    """Autocomplete pozisyonuna göre hacim tahmini"""
    # Autocomplete'de daha erken çıkıyorsa daha yüksek hacim
    keywords_lower = [s.lower() for s in suggestions]
    keyword_lower = keyword.lower()

    if keyword_lower in keywords_lower:
        pos = keywords_lower.index(keyword_lower)
        if pos == 0: return 90
        if pos <= 2: return 75
        if pos <= 5: return 55
        return 35

    # Keyword suggestions'ın prefix'i ise yüksek hacim
    if any(s.lower().startswith(keyword_lower) for s in suggestions[:3]):
        return 65

    return 20

# ─── IQ Score ─────────────────────────────────────────────────────────────────

def calc_iq_score(volume: int, competing_products: int) -> int:
    """IQ Score = (volume / competing) × 100, max 100"""
    if competing_products <= 0:
        return 0
    raw = (volume / competing_products) * 10000
    return min(int(raw), 100)

# ─── Title Density ────────────────────────────────────────────────────────────

def calc_title_density(keyword: str, titles: list) -> dict:
    """İlk sayfadaki başlıklarda keyword kaç kez geçiyor"""
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

# ─── Claude ile Long-tail Genişletme ─────────────────────────────────────────

async def expand_with_claude(seed_keyword: str, market: str = "US", existing: list = []) -> dict:
    """Claude API ile keyword genişletme + buyer intent"""
    lang_hint = "German" if market == "DE" else "English"
    existing_str = ", ".join(existing[:10]) if existing else "none"

    prompt = f"""You are an Amazon keyword research expert.

Seed keyword: "{seed_keyword}"
Market: Amazon.{market.lower() if market != 'US' else 'com'}
Language: {lang_hint}
Already found keywords: {existing_str}

Generate a comprehensive keyword analysis. Respond ONLY with valid JSON, no markdown, no explanation:

{{
  "long_tail": [
    {{"keyword": "...", "intent": "informational|transactional|navigational", "buyer_score": 0-100, "note": "..."}}
  ],
  "negative_keywords": ["...", "..."],
  "listing_tips": {{
    "title": "Include these in title: ...",
    "bullets": "Include these in bullets: ...",
    "backend": "Use these as backend keywords: ..."
  }},
  "cross_market": {{
    "de_equivalent": "German equivalent keyword",
    "de_notes": "Notes for German market"
  }}
}}

Generate 15-20 long-tail keywords. Focus on buyer intent and conversion potential."""

    try:
        response = anthropic.messages.create(
            model="claude-haiku-4-5",
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}]
        )
        import json
        text = response.content[0].text.strip()
        # JSON temizle
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
            "listing_tips": {"title": "", "bullets": "", "backend": ""},
            "cross_market": {"de_equivalent": "", "de_notes": ""}
        }

# ─── Ana Analiz Fonksiyonu ────────────────────────────────────────────────────

async def analyze_keyword(keyword: str, market: str = "US", include_de: bool = True) -> dict:
    """Tam keyword analizi"""

    # 1. Autocomplete — US ve DE paralel
    tasks = [get_autocomplete(keyword, "US")]
    if include_de:
        tasks.append(get_autocomplete(keyword, "DE"))

    results = await asyncio.gather(*tasks, return_exceptions=True)
    us_suggestions = results[0] if not isinstance(results[0], Exception) else []
    de_suggestions = results[1] if include_de and not isinstance(results[1], Exception) else []

    # 2. Hacim tahmini
    us_volume = estimate_volume(keyword, us_suggestions)
    de_volume = estimate_volume(keyword, de_suggestions) if include_de else 0

    # 3. Rakip sayısı (Easyparser'dan veya tahmin)
    competing_us = len(us_suggestions) * 50 + 500  # basit tahmin
    competing_de = len(de_suggestions) * 40 + 300 if include_de else 0

    # 4. IQ Score
    iq_us = calc_iq_score(us_volume, competing_us)
    iq_de = calc_iq_score(de_volume, competing_de) if include_de else 0

    # 5. Title density (suggestions başlıklar olarak kullan)
    density = calc_title_density(keyword, us_suggestions)

    # 6. Buyer intent tahmini (basit kural tabanlı)
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

    # 7. Long-tail ve AI genişletme
    all_suggestions = list(set(us_suggestions + de_suggestions))
    claude_data = await expand_with_claude(keyword, market, all_suggestions)

    # 8. Tüm keyword listesi
    all_keywords = []

    # Autocomplete keywordlerini ekle
    for i, s in enumerate(us_suggestions):
        if s and s.lower() != keyword.lower():
            vol = estimate_volume(s, us_suggestions)
            all_keywords.append({
                "keyword": s,
                "market": "US",
                "volume": vol,
                "iq_score": calc_iq_score(vol, competing_us),
                "intent": buyer_intent,
                "buyer_score": buyer_score,
                "source": "autocomplete",
            })

    # Claude long-tail ekle
    for lt in claude_data.get("long_tail", []):
        if lt.get("keyword"):
            vol = estimate_volume(lt["keyword"], us_suggestions)
            all_keywords.append({
                "keyword": lt["keyword"],
                "market": "US",
                "volume": vol,
                "iq_score": calc_iq_score(vol, competing_us),
                "intent": lt.get("intent", "mixed"),
                "buyer_score": lt.get("buyer_score", 50),
                "note": lt.get("note", ""),
                "source": "ai",
            })

    # DE keywordleri ekle
    if include_de:
        for s in de_suggestions:
            if s:
                vol = estimate_volume(s, de_suggestions)
                all_keywords.append({
                    "keyword": s,
                    "market": "DE",
                    "volume": vol,
                    "iq_score": calc_iq_score(vol, competing_de),
                    "intent": "mixed",
                    "buyer_score": 50,
                    "source": "autocomplete_de",
                })

    # Buyer score'a göre sırala
    all_keywords.sort(key=lambda x: x.get("buyer_score", 0), reverse=True)

    return {
        "seed_keyword": keyword,
        "markets": {
            "US": {
                "volume": us_volume,
                "competing_products": competing_us,
                "iq_score": iq_us,
                "suggestions": us_suggestions,
            },
            "DE": {
                "volume": de_volume,
                "competing_products": competing_de,
                "iq_score": iq_de,
                "suggestions": de_suggestions,
            } if include_de else None
        },
        "title_density": density,
        "buyer_intent": buyer_intent,
        "buyer_score": buyer_score,
        "keywords": all_keywords,
        "negative_keywords": claude_data.get("negative_keywords", []),
        "listing_tips": claude_data.get("listing_tips", {}),
        "cross_market": claude_data.get("cross_market", {}),
        "total_keywords": len(all_keywords),
    }
