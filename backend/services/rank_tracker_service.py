"""
ASIN Keyword Rank Tracker
Kaynak: rafalf/amazon-search-rank metodolojisi
Bir ASIN'in belirli bir keyword'de Amazon arama sonuçlarında kaçıncı pozisyonda olduğunu bulur.
"""
import asyncio
import httpx
import re
from typing import Optional

MARKET_CONFIG = {
    "US": {"domain": "com",    "mid": "ATVPDKIKX0DER"},
    "DE": {"domain": "de",     "mid": "A1PA6795UKMFR9"},
    "TR": {"domain": "com.tr", "mid": "A33AVAJ2PDY3EV"},
    "FR": {"domain": "fr",     "mid": "A13V1IB3VIYZZH"},
    "UK": {"domain": "co.uk",  "mid": "A1F83G8C2ARO7P"},
    "IT": {"domain": "it",     "mid": "APJ6JRA9NG5V4"},
    "ES": {"domain": "es",     "mid": "A1RKKUPIHCS9HS"},
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xhtml+xml;q=0.9,*/*;q=0.8",
}


async def get_keyword_rank(asin: str, keyword: str, market: str = "US", max_pages: int = 3) -> dict:
    """
    Bir ASIN'in verilen keyword'de Amazon'da kaçıncı sırada olduğunu bulur.
    rafalf/amazon-search-rank metodolojisi.

    max_pages: Kaç sayfa taranacak (her sayfa ~48 ürün)
    Return: rank pozisyonu, sayfa, sponsored mu, organik mi
    """
    config = MARKET_CONFIG.get(market.upper(), MARKET_CONFIG["US"])
    domain = config["domain"]
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
    }

    try:
        async with httpx.AsyncClient(
            timeout=15,
            verify=False,
            follow_redirects=True,
            headers=HEADERS,
        ) as client:
            for page in range(1, max_pages + 1):
                url = f"https://www.amazon.{domain}/s"
                params = {
                    "k": keyword,
                    "page": page,
                    "ref": "sr_pg_" + str(page),
                }

                try:
                    r = await client.get(url, params=params)
                except Exception as e:
                    result["note"] = f"Request error page {page}: {e}"
                    break

                if r.status_code != 200:
                    result["note"] = f"HTTP {r.status_code}"
                    break

                html = r.text

                # Tüm ASIN'leri sırayla çek
                # Sponsored ürünler data-asin attribute'unda görünür
                # Pattern: data-asin="XXXXXXXXXX"
                all_asins = re.findall(r'data-asin="([A-Z0-9]{10})"', html)

                # Deduplicate ama sırayı koru
                seen = set()
                ordered_asins = []
                for a in all_asins:
                    if a not in seen and a != "":
                        seen.add(a)
                        ordered_asins.append(a)

                # Sponsored tespiti — AdHolder veya s-sponsored-label içindeki ASIN'ler
                sponsored_section = re.findall(
                    r's-sponsored-label[^"]*"[^>]*>.*?data-asin="([A-Z0-9]{10})"',
                    html, re.DOTALL
                )
                # Alternatif pattern
                sponsored_asins = set(re.findall(
                    r'<div[^>]*data-component-type="sp-sponsored-result"[^>]*data-asin="([A-Z0-9]{10})"',
                    html
                ))

                result["total_scanned"] += len(ordered_asins)

                if asin_upper in ordered_asins:
                    pos_on_page = ordered_asins.index(asin_upper) + 1
                    overall_rank = (page - 1) * len(ordered_asins) + pos_on_page
                    result["found"] = True
                    result["rank"] = overall_rank
                    result["page"] = page
                    result["position_on_page"] = pos_on_page
                    result["is_sponsored"] = asin_upper in sponsored_asins
                    result["note"] = "Organik" if not result["is_sponsored"] else "Sponsored"
                    break

                # Sayfada hiç ASIN yoksa dur
                if len(ordered_asins) < 10:
                    result["note"] = f"Sayfa {page}'de yeterli sonuç yok"
                    break

                # Sayfalar arası kısa bekleme — rate limit koruması
                if page < max_pages:
                    await asyncio.sleep(0.5)

    except Exception as e:
        result["note"] = f"Error: {str(e)}"

    if not result["found"]:
        result["note"] = result["note"] or f"İlk {max_pages * 48} sonuçta bulunamadı"

    return result


async def bulk_rank_check(asin: str, keywords: list, market: str = "US") -> list:
    """
    Birden fazla keyword için rank kontrolü — paralel (max 3 aynı anda)
    """
    semaphore = asyncio.Semaphore(3)  # Aynı anda max 3 istek

    async def check_one(kw):
        async with semaphore:
            return await get_keyword_rank(asin, kw, market)

    tasks = [check_one(kw) for kw in keywords[:10]]  # Max 10 keyword
    results = await asyncio.gather(*tasks, return_exceptions=True)

    output = []
    for i, r in enumerate(results):
        if isinstance(r, Exception):
            output.append({
                "keyword": keywords[i], "found": False,
                "rank": None, "note": str(r)
            })
        else:
            output.append(r)

    # Rank'a göre sırala — bulunanlar önce
    output.sort(key=lambda x: (not x["found"], x.get("rank") or 9999))
    return output


async def track_rank_history(asin: str, keyword: str, market: str = "US") -> dict:
    """
    Tek seferlik rank kontrolü + basit yorum
    """
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

        if rank_data["is_sponsored"]:
            commentary += " (Sponsored listing)"
    else:
        commentary = f"Bu keyword'de ilk {rank_data['total_scanned']} sonuçta bulunamadı."

    return {**rank_data, "commentary": commentary}
