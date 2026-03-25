"""
Turkish Suppliers Service
1. Trendyol internal API — pazar fiyat referansı (Playwright gerekmez)
2. Sahibinden.com scraping — B2B ticari ilanlar
3. TurkishExporter.net scraping — doğrulanmış ihracatçılar
Fallback: alibaba.py TR_SUPPLIERS_DB mock
"""
import os
import asyncio
import httpx
from bs4 import BeautifulSoup

SCRAPERAPI_KEY = os.getenv("SCRAPERAPI_KEY", "")

# TRY/USD sabit oran (Frankfurter API çekilemezse)
TRY_RATE = 38.5

TRENDYOL_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
    "Referer": "https://www.trendyol.com/",
    "Origin": "https://www.trendyol.com",
}


async def search_trendyol_api(keyword: str, max_results: int = 10) -> dict:
    """Trendyol internal JSON API — doğrudan HTTP, Playwright gerekmez."""
    endpoints = [
        f"https://public.trendyol.com/discovery-web-searchgw-service/api/filter/search/v2?q={keyword}&pi=1&qt={keyword}&st={keyword}&os=1",
        f"https://public.trendyol.com/discovery-web-searchgw-service/v2/api/infinite-scroll?q={keyword}&pi=1",
    ]
    for url in endpoints:
        try:
            async with httpx.AsyncClient(timeout=20, verify=False) as client:
                resp = await client.get(url, headers=TRENDYOL_HEADERS)
            if resp.status_code != 200:
                continue
            data = resp.json()
            products_raw = (
                data.get("result", {}).get("products", []) or
                data.get("data", {}).get("products", []) or
                data.get("products", []) or
                []
            )
            results = []
            for p in products_raw[:max_results]:
                price_obj = p.get("price", {}) or {}
                disc = price_obj.get("discountedPrice", {}) or {}
                orig = price_obj.get("originalPrice", {}) or {}
                price_val = float(disc.get("value") or orig.get("value") or 0)
                brand = p.get("brand", {})
                results.append({
                    "title": p.get("name", ""),
                    "price_try": round(price_val, 2),
                    "price_usd": round(price_val / TRY_RATE, 2),
                    "brand": brand.get("name", "") if isinstance(brand, dict) else str(brand),
                    "seller": p.get("merchantName", ""),
                    "rating": (p.get("ratingScore", {}) or {}).get("averageRating", 0),
                    "review_count": p.get("reviewCount", 0),
                    "url": "https://www.trendyol.com" + p.get("url", ""),
                    "image": ((p.get("images", []) or [None])[0]),
                    "source": "trendyol",
                    "in_stock": True,
                })
            if results:
                return {
                    "results": results,
                    "total": len(results),
                    "source": "trendyol_api",
                    "keyword": keyword,
                    "mock": False,
                }
        except Exception as e:
            print(f"Trendyol API ({url[:60]}...) error: {e}")
    return {"results": [], "source": "trendyol_api", "error": "Tüm endpoint'ler başarısız"}


async def scrape_sahibinden(keyword: str, max_results: int = 8) -> dict:
    """Sahibinden.com ticari B2B ilanlar — ScraperAPI + BeautifulSoup."""
    if not SCRAPERAPI_KEY:
        return {"results": [], "source": "sahibinden", "error": "SCRAPERAPI_KEY yok"}
    try:
        target = f"https://www.sahibinden.com/arama?query={keyword.replace(' ', '+')}&pagingOffset=0&pagingSize=20"
        api_url = f"https://api.scraperapi.com/?api_key={SCRAPERAPI_KEY}&url={target}&country_code=tr"
        async with httpx.AsyncClient(timeout=45, verify=False) as client:
            resp = await client.get(api_url)
        if resp.status_code != 200:
            return {"results": [], "source": "sahibinden", "error": f"HTTP {resp.status_code}"}

        soup = BeautifulSoup(resp.text, "html.parser")
        results = []
        # Sahibinden ilan satırları
        rows = soup.select("tr.searchResultsItem")[:max_results]
        for row in rows:
            title_el = row.select_one("td.searchResultsTitleValue a")
            price_el = row.select_one("td.searchResultsPriceValue")
            loc_el = row.select_one("td.searchResultsLocationValue")
            if not title_el:
                continue
            title = title_el.get_text(strip=True)
            href = title_el.get("href", "")
            if href and not href.startswith("http"):
                href = "https://www.sahibinden.com" + href
            results.append({
                "name": title,
                "price_raw": price_el.get_text(strip=True) if price_el else "",
                "city": loc_el.get_text(strip=True) if loc_el else "Türkiye",
                "url": href,
                "source": "sahibinden",
                "platform": "Sahibinden.com",
                "made_in_turkey": True,
                "contact_type": "İlan sayfasından",
            })
        return {"results": results, "total": len(results), "source": "sahibinden", "mock": False}
    except Exception as e:
        print(f"Sahibinden scrape error: {e}")
        return {"results": [], "source": "sahibinden", "error": str(e)}


async def scrape_turkish_exporter(keyword: str, max_results: int = 8) -> dict:
    """TurkishExporter.net doğrulanmış ihracatçı dizini — ScraperAPI + BeautifulSoup."""
    if not SCRAPERAPI_KEY:
        return {"results": [], "source": "turkishexporter", "error": "SCRAPERAPI_KEY yok"}
    try:
        target = f"https://www.turkishexporter.net/en/companies/?s={keyword.replace(' ', '+')}"
        api_url = f"https://api.scraperapi.com/?api_key={SCRAPERAPI_KEY}&url={target}"
        async with httpx.AsyncClient(timeout=45, verify=False) as client:
            resp = await client.get(api_url)
        if resp.status_code != 200:
            return {"results": [], "source": "turkishexporter", "error": f"HTTP {resp.status_code}"}

        soup = BeautifulSoup(resp.text, "html.parser")
        results = []
        companies = soup.select(".company-item, .company-card, article.company, li.company")[:max_results]
        for comp in companies:
            name_el = comp.select_one("h2, h3, .company-name")
            city_el = comp.select_one(".city, .location, .address")
            sector_el = comp.select_one(".sector, .category, .product")
            link_el = comp.select_one("a[href]")
            if not name_el:
                continue
            href = link_el.get("href", "") if link_el else ""
            if href and not href.startswith("http"):
                href = "https://www.turkishexporter.net" + href
            results.append({
                "name": name_el.get_text(strip=True),
                "city": city_el.get_text(strip=True) if city_el else "Türkiye",
                "sector": sector_el.get_text(strip=True) if sector_el else keyword,
                "url": href,
                "source": "turkishexporter",
                "platform": "TurkishExporter.net",
                "verified": True,
                "certifications": ["TİM Üyesi"],
                "made_in_turkey": True,
            })
        return {"results": results, "total": len(results), "source": "turkishexporter", "mock": False}
    except Exception as e:
        print(f"TurkishExporter scrape error: {e}")
        return {"results": [], "source": "turkishexporter", "error": str(e)}


async def get_suppliers_by_keyword(keyword: str) -> dict:
    """
    Ana fonksiyon: 3 kaynaktan paralel çekiş.
    - Trendyol API: pazar fiyat referansı
    - Sahibinden: ticari tedarikçi ilanları
    - TurkishExporter: doğrulanmış ihracatçılar
    Hiç sonuç yoksa alibaba.py mock'una dönmesi için mock=True döner.
    """
    trendyol, sahibinden, exporters = await asyncio.gather(
        search_trendyol_api(keyword, max_results=10),
        scrape_sahibinden(keyword, max_results=8),
        scrape_turkish_exporter(keyword, max_results=8),
    )

    # Trendyol fiyat ortalaması (pazar referansı)
    prices = [p["price_try"] for p in trendyol.get("results", []) if p.get("price_try", 0) > 0]
    avg_try = round(sum(prices) / len(prices), 2) if prices else 0

    suppliers = sahibinden.get("results", []) + exporters.get("results", [])

    return {
        "keyword": keyword,
        "suppliers": suppliers,
        "total": len(suppliers),
        "trendyol_market": {
            "products": trendyol.get("results", [])[:5],
            "avg_price_try": avg_try,
            "avg_price_usd": round(avg_try / TRY_RATE, 2) if avg_try else 0,
            "total_found": trendyol.get("total", 0),
            "source_ok": not bool(trendyol.get("error")),
        },
        "mock": len(suppliers) == 0,
        "sources": {
            "trendyol_api": not bool(trendyol.get("error")),
            "sahibinden": not bool(sahibinden.get("error")),
            "turkishexporter": not bool(exporters.get("error")),
        },
        "advantages": [
            "🇹🇷 Made in Turkey — AB'de premium fiyat",
            "⚡ 2-5 gün teslimat (Çin'den 30-60 gün)",
            "✅ AB-Türkiye Gümrük Birliği — sıfır gümrük",
            "📞 Türkçe iletişim, kolay anlaşma",
        ],
    }
