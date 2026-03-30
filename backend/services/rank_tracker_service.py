"""
ASIN Keyword Rank Tracker
Kaynak: rafalf/amazon-search-rank metodolojisi
ScraperAPI ile CAPTCHA bypass — doğrudan Amazon isteği artık çalışmıyor.
"""
import asyncio
import httpx
import os
import re
from urllib.parse import quote, urlencode
from dotenv import load_dotenv

load_dotenv()
SCRAPERAPI_KEY = os.getenv("SCRAPERAPI_KEY", "")

MARKET_CONFIG = {
    "US": {"domain": "com",    "country": "us"},
    "DE": {"domain": "de",     "country": "de"},
    "TR": {"domain": "com.tr", "country": "tr"},
    "FR": {"domain": "fr",     "country": "fr"},
    "UK": {"domain": "co.uk",  "country": "uk"},
    "IT": {"domain": "it",     "country": "it"},
    "ES": {"domain": "es",     "country": "es"},
}


async def _fetch_amazon_page(domain: str, keyword: str, page: int, country: str) -> str:
    """ScraperAPI ile Amazon arama sayfasını çek."""
    if not SCRAPERAPI_KEY:
        return ""

    amazon_url = f"https://www.amazon.{domain}/s?" + urlencode({"k": keyword, "page": page})
    scraper_url = (
        f"https://api.scraperapi.com/"
        f"?api_key={SCRAPERAPI_KEY}"
        f"&url={quote(amazon_url, safe='')}"
        f"&country_code={country}"
        f"&render=false"
    )

    try:
        async with httpx.AsyncClient(timeout=30, verify=False) as client:
            r = await client.get(scraper_url)
            if r.status_code == 200 and 'data-asin' in r.text:
                return r.text
    except Exception as e:
        print(f"ScraperAPI rank error: {e}")
    return ""


def _parse_asins(html: str) -> tuple:
    """HTML'den sıralı ASIN listesi ve sponsored ASIN set'i döner."""
    all_asins = re.findall(r'data-asin="([A-Z0-9]{10})"', html)
    seen = set()
    ordered = []
    for a in all_asins:
        if a and a not in seen:
            seen.add(a)
            ordered.append(a)

    sponsored = set(re.findall(
        r'data-component-type="sp-sponsored-result"[^>]*data-asin="([A-Z0-9]{10})"', html
    ))
    return ordered, sponsored


async def get_keyword_rank(asin: str, keyword: str, market: str = "US", max_pages: int = 3) -> dict:
    """
    Bir ASIN'in verilen keyword'de Amazon'da kaçıncı sırada olduğunu bulur.
    ScraperAPI kullanır — CAPTCHA bypass dahil.
    """
    config = MARKET_CONFIG.get(market.upper(), MARKET_CONFIG["US"])
    domain = config["domain"]
    country = config["country"]
    asin_upper = asin.upper()

    result = {
        "asin": asin_upper,
        "keyword": keyword,
        "market": market.upper(),
        "found": False,
        "rank": None,
        "page": None,
        "position_on_page": None,
        "is_sponsored": False,
        "total_scanned": 0,
        "note": "",
        "mock": False,
    }

    if not SCRAPERAPI_KEY:
        return _get_mock_rank(asin_upper, keyword, market)

    for page in range(1, max_pages + 1):
        html = await _fetch_amazon_page(domain, keyword, page, country)

        if not html:
            result["note"] = f"Sayfa {page} alınamadı"
            break

        ordered_asins, sponsored_asins = _parse_asins(html)
        result["total_scanned"] += len(ordered_asins)

        if asin_upper in ordered_asins:
            pos_on_page = ordered_asins.index(asin_upper) + 1
            overall_rank = (page - 1) * len(ordered_asins) + pos_on_page
            result["found"] = True
            result["rank"] = overall_rank
            result["page"] = page
            result["position_on_page"] = pos_on_page
            result["is_sponsored"] = asin_upper in sponsored_asins
            result["note"] = "Sponsored" if result["is_sponsored"] else "Organik"
            break

        if len(ordered_asins) < 10:
            result["note"] = f"Sayfa {page}'de yeterli sonuç yok"
            break

        if page < max_pages:
            await asyncio.sleep(0.3)

    if not result["found"] and not result["note"]:
        result["note"] = f"İlk {result['total_scanned']} sonuçta bulunamadı"

    return result


def _get_mock_rank(asin: str, keyword: str, market: str) -> dict:
    """ScraperAPI yokken demo rank verisi."""
    import math
    seed = sum(ord(c) for c in asin + keyword)
    rank = int(abs(math.sin(seed)) * 120) + 3
    page = (rank // 48) + 1
    pos = (rank % 48) or 1
    is_sponsored = seed % 5 == 0

    if rank <= 3:
        note = "🥇 İlk 3 — mükemmel görünürlük"
    elif rank <= 10:
        note = "✅ İlk sayfa — iyi pozisyon"
    elif rank <= 48:
        note = "🟡 Sayfa 1 — orta görünürlük"
    else:
        note = "⚠️ Sayfa 2+ — görünürlük düşük"

    return {
        "asin": asin,
        "keyword": keyword,
        "market": market,
        "found": True,
        "rank": rank,
        "page": page,
        "position_on_page": pos,
        "is_sponsored": is_sponsored,
        "total_scanned": page * 48,
        "note": ("Sponsored — " if is_sponsored else "Organik — ") + note,
        "mock": True,
    }


async def bulk_rank_check(asin: str, keywords: list, market: str = "US") -> list:
    """Birden fazla keyword için rank kontrolü — max 3 paralel istek."""
    semaphore = asyncio.Semaphore(3)

    async def check_one(kw):
        async with semaphore:
            return await get_keyword_rank(asin, kw, market)

    tasks = [check_one(kw) for kw in keywords[:10]]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    output = []
    for i, r in enumerate(results):
        if isinstance(r, Exception):
            output.append({"keyword": keywords[i], "found": False, "rank": None, "note": str(r)})
        else:
            output.append(r)

    output.sort(key=lambda x: (not x["found"], x.get("rank") or 9999))
    return output


async def track_rank_history(asin: str, keyword: str, market: str = "US") -> dict:
    """Tek seferlik rank kontrolü + yorum."""
    rank_data = await get_keyword_rank(asin, keyword, market)

    commentary = ""
    if rank_data["found"]:
        rank = rank_data["rank"]
        if rank <= 3:
            commentary = "🥇 İlk 3'te — mükemmel görünürlük!"
        elif rank <= 10:
            commentary = "✅ İlk sayfa — iyi pozisyon."
        elif rank <= 20:
            commentary = "🟡 İlk 2 sayfa — orta görünürlük."
        elif rank <= 50:
            commentary = "⚠️ Sayfa 1-2 dışı — görünürlük düşük."
        else:
            commentary = "🔴 Düşük rank — listing ve PPC optimize et."

        if rank_data.get("is_sponsored"):
            commentary += " (Sponsored listing)"
    else:
        commentary = f"Bu keyword'de ilk {rank_data.get('total_scanned', 0)} sonuçta bulunamadı."

    return {**rank_data, "commentary": commentary}
