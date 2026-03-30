import httpx
import os
import re
from urllib.parse import quote
from dotenv import load_dotenv

load_dotenv()
SCRAPERAPI_KEY = os.getenv("SCRAPERAPI_KEY", "")

# MediaMarkt ülke konfigürasyonları
MEDIAMARKT_MARKETS = {
    "DE": {"url": "https://www.mediamarkt.de/de/search.html", "flag": "🇩🇪", "currency": "EUR", "name": "MediaMarkt DE"},
    "TR": {"url": "https://www.mediamarkt.com.tr/tr/search.html", "flag": "🇹🇷", "currency": "TRY", "name": "MediaMarkt TR"},
    "NL": {"url": "https://www.mediamarkt.nl/nl/search.html", "flag": "🇳🇱", "currency": "EUR", "name": "MediaMarkt NL"},
    "AT": {"url": "https://www.mediamarkt.at/de/search.html", "flag": "🇦🇹", "currency": "EUR", "name": "MediaMarkt AT"},
    "ES": {"url": "https://www.mediamarkt.es/es/search.html", "flag": "🇪🇸", "currency": "EUR", "name": "MediaMarkt ES"},
    "IT": {"url": "https://www.mediamarkt.it/it/search.html", "flag": "🇮🇹", "currency": "EUR", "name": "MediaMarkt IT"},
    "BE": {"url": "https://www.mediamarkt.be/fr/search.html", "flag": "🇧🇪", "currency": "EUR", "name": "MediaMarkt BE"},
    "CH": {"url": "https://www.mediamarkt.ch/de/search.html", "flag": "🇨🇭", "currency": "CHF", "name": "MediaMarkt CH"},
}

async def search_mediamarkt(keyword: str, market: str = "DE") -> dict:
    """ScraperAPI ile MediaMarkt'ta ürün ara"""
    market_info = MEDIAMARKT_MARKETS.get(market.upper(), MEDIAMARKT_MARKETS["DE"])

    if not SCRAPERAPI_KEY:
        return get_mock_mediamarkt(keyword, market)

    target_url = f"{market_info['url']}?query={quote(keyword)}"
    scraper_url = f"https://api.scraperapi.com/?api_key={SCRAPERAPI_KEY}&url={quote(target_url, safe='')}&render=true&country_code={market.lower()}"

    try:
        async with httpx.AsyncClient(timeout=30, verify=False) as client:
            response = await client.get(scraper_url)
            if response.status_code == 200:
                return parse_mediamarkt_html(response.text, keyword, market_info)
    except Exception as e:
        print(f"MediaMarkt scrape error: {e}")

    return get_mock_mediamarkt(keyword, market)

def parse_mediamarkt_html(html: str, keyword: str, market_info: dict) -> dict:
    """MediaMarkt HTML'ini parse et — fiyat ve ürün bilgilerini çıkar"""
    products = []

    # JSON-LD structured data dene (daha güvenilir)
    import json
    json_ld_matches = re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.DOTALL)
    for match in json_ld_matches:
        try:
            data = json.loads(match)
            if isinstance(data, list):
                for item in data:
                    if item.get("@type") in ["Product", "ItemList"]:
                        name = item.get("name", "")
                        price_data = item.get("offers", {})
                        price = price_data.get("price", 0) if isinstance(price_data, dict) else 0
                        if name and price:
                            products.append({
                                "title": name,
                                "price": float(price),
                                "currency": market_info["currency"],
                                "flag": market_info["flag"],
                                "market": market_info["name"],
                                "url": item.get("url", ""),
                                "image": item.get("image", ""),
                                "availability": "In Stock",
                                "source": "MediaMarkt"
                            })
        except:
            pass

    # Fallback: regex ile fiyat çek
    if not products:
        # MediaMarkt fiyat pattern'leri
        price_patterns = [
            r'"price":\s*"?([\d,\.]+)"?',
            r'data-price="([\d,\.]+)"',
            r'class="[^"]*price[^"]*"[^>]*>([\d,\.]+)',
        ]
        name_patterns = [
            r'"name":\s*"([^"]{10,100})"',
            r'data-name="([^"]{10,100})"',
        ]

        names = []
        for pattern in name_patterns:
            names.extend(re.findall(pattern, html)[:10])

        prices = []
        for pattern in price_patterns:
            prices.extend(re.findall(pattern, html)[:10])

        for i, (name, price_str) in enumerate(zip(names[:8], prices[:8])):
            try:
                price = float(price_str.replace(',', '.').replace('.', '', price_str.count('.')-1))
                if price > 1:
                    products.append({
                        "title": name,
                        "price": price,
                        "currency": market_info["currency"],
                        "flag": market_info["flag"],
                        "market": market_info["name"],
                        "url": "",
                        "image": "",
                        "availability": "In Stock",
                        "source": "MediaMarkt"
                    })
            except:
                pass

    if not products:
        return get_mock_mediamarkt(keyword, list(MEDIAMARKT_MARKETS.keys())[0])

    return {
        "keyword": keyword,
        "market": market_info["name"],
        "flag": market_info["flag"],
        "currency": market_info["currency"],
        "products": products[:10],
        "total": len(products),
        "mock": False
    }

def get_mock_mediamarkt(keyword: str, market: str = "DE") -> dict:
    market_info = MEDIAMARKT_MARKETS.get(market.upper(), MEDIAMARKT_MARKETS["DE"])
    import math
    seed = sum(ord(c) for c in keyword)
    currency = market_info["currency"]

    mock_products = []
    base_prices = [29.99, 49.99, 79.99, 119.99, 199.99, 24.99, 39.99, 59.99]
    titles = [
        f"{keyword} Pro Edition",
        f"{keyword} Standard",
        f"{keyword} Premium Set",
        f"Best {keyword} 2024",
        f"{keyword} Ultra",
        f"{keyword} Basic",
        f"{keyword} Deluxe Pack",
        f"Smart {keyword}",
    ]

    for i, (title, base) in enumerate(zip(titles[:6], base_prices[:6])):
        price_variation = 1 + (abs(math.sin(seed + i)) - 0.5) * 0.3
        price = round(base * price_variation, 2)
        mock_products.append({
            "title": title,
            "price": price,
            "currency": currency,
            "flag": market_info["flag"],
            "market": market_info["name"],
            "url": f"https://www.mediamarkt.de/de/search.html?query={quote(keyword)}",
            "image": "",
            "availability": "In Stock" if i % 4 != 2 else "Limited Stock",
            "source": "MediaMarkt",
            "mock": True
        })

    return {
        "keyword": keyword,
        "market": market_info["name"],
        "flag": market_info["flag"],
        "currency": currency,
        "products": mock_products,
        "total": len(mock_products),
        "mock": True
    }

async def compare_amazon_mediamarkt(keyword: str, amazon_price_usd: float, market: str = "DE") -> dict:
    """Amazon vs MediaMarkt fiyat karşılaştırması + arbitraj hesabı"""
    mm_data = await search_mediamarkt(keyword, market)
    products = mm_data.get("products", [])

    if not products:
        return {"error": "Ürün bulunamadı", "mock": True}

    # EUR/USD kuru (yaklaşık)
    EUR_USD = 1.08
    CHF_USD = 1.10
    TRY_USD = 0.031

    currency_rates = {"EUR": EUR_USD, "CHF": CHF_USD, "TRY": TRY_USD, "USD": 1.0}
    currency = mm_data.get("currency", "EUR")
    rate = currency_rates.get(currency, 1.0)

    comparisons = []
    for p in products[:5]:
        mm_price_local = p["price"]
        mm_price_usd = round(mm_price_local * rate, 2)
        price_diff = round(amazon_price_usd - mm_price_usd, 2)
        arbitrage_possible = price_diff > 5  # $5'tan fazla fark varsa arbitraj var

        comparisons.append({
            "title": p["title"],
            "amazon_price_usd": amazon_price_usd,
            "mm_price_local": mm_price_local,
            "mm_price_usd": mm_price_usd,
            "currency": currency,
            "price_diff_usd": price_diff,
            "arbitrage_possible": arbitrage_possible,
            "roi_pct": round((price_diff / mm_price_usd) * 100, 1) if mm_price_usd > 0 else 0,
            "flag": p["flag"],
            "market": p["market"],
            "url": p.get("url", ""),
            "mock": p.get("mock", False)
        })

    best = max(comparisons, key=lambda x: x["price_diff_usd"]) if comparisons else None

    return {
        "keyword": keyword,
        "amazon_price_usd": amazon_price_usd,
        "market": market,
        "comparisons": comparisons,
        "best_deal": best,
        "profitable_count": sum(1 for c in comparisons if c["arbitrage_possible"]),
        "mock": mm_data.get("mock", False)
    }
