import httpx
import os
from dotenv import load_dotenv

load_dotenv()

EASYPARSER_API_KEY = os.getenv("EASYPARSER_API_KEY", "")
BASE_URL = "https://realtime.easyparser.com/v1/request"

VAT_RATES = {
    "DE": 0.19, "FR": 0.20, "IT": 0.22, "ES": 0.21,
    "UK": 0.20, "CA": 0.05, "JP": 0.10, "US": 0.00,
}

FBA_FEES = {
    "US": {"fee": 2.50, "pct": 0.15},
    "DE": {"fee": 2.80, "pct": 0.15},
    "FR": {"fee": 2.80, "pct": 0.15},
    "UK": {"fee": 2.60, "pct": 0.15},
    "IT": {"fee": 2.90, "pct": 0.15},
    "ES": {"fee": 2.70, "pct": 0.15},
    "CA": {"fee": 2.40, "pct": 0.15},
    "JP": {"fee": 3.00, "pct": 0.15},
}

AMAZON_MARKETS = {
    "DE": {"domain": ".de",    "flag": "🇩🇪", "currency": "EUR", "name": "Amazon.de"},
    "FR": {"domain": ".fr",    "flag": "🇫🇷", "currency": "EUR", "name": "Amazon.fr"},
    "UK": {"domain": ".co.uk", "flag": "🇬🇧", "currency": "GBP", "name": "Amazon.co.uk"},
    "IT": {"domain": ".it",    "flag": "🇮🇹", "currency": "EUR", "name": "Amazon.it"},
    "ES": {"domain": ".es",    "flag": "🇪🇸", "currency": "EUR", "name": "Amazon.es"},
    "CA": {"domain": ".ca",    "flag": "🇨🇦", "currency": "CAD", "name": "Amazon.ca"},
    "JP": {"domain": ".co.jp", "flag": "🇯🇵", "currency": "JPY", "name": "Amazon.co.jp"},
}

async def get_exchange_rates() -> dict:
    try:
        async with httpx.AsyncClient(timeout=10, verify=False) as client:
            response = await client.get("https://api.exchangerate-api.com/v4/latest/USD")
            if response.status_code == 200:
                return response.json().get("rates", {})
    except:
        pass
    return {"TRY": 32.0, "EUR": 0.92, "GBP": 0.79, "CAD": 1.36, "JPY": 149.0}

def calc_profit(source_price_usd: float, amazon_price_usd: float, marketplace: str = "US") -> dict:
    fba = FBA_FEES.get(marketplace, FBA_FEES["US"])
    vat = VAT_RATES.get(marketplace, 0)
    fba_fee = source_price_usd * fba["pct"] + fba["fee"]
    vat_amount = amazon_price_usd * vat
    net_revenue = amazon_price_usd - vat_amount
    profit = round(net_revenue - source_price_usd - fba_fee, 2)
    margin = round((profit / amazon_price_usd * 100), 1) if amazon_price_usd > 0 else 0
    roi = round((profit / source_price_usd * 100), 1) if source_price_usd > 0 else 0
    return {
        "profit": profit, "margin": margin, "roi": roi,
        "vat_amount": round(vat_amount, 2),
        "fba_fee": round(fba_fee, 2),
        "net_revenue": round(net_revenue, 2),
    }

async def search_amazon_market(keyword: str, marketplace: str, amazon_us_price: float, rates: dict) -> list:
    market = AMAZON_MARKETS.get(marketplace)
    if not market:
        return []
    try:
        async with httpx.AsyncClient(timeout=20, verify=False) as client:
            response = await client.get(BASE_URL, params={
                "api_key": EASYPARSER_API_KEY, "platform": "AMZ",
                "operation": "SEARCH", "domain": market["domain"],
                "keyword": keyword, "page": 1
            })
            if response.status_code == 200:
                data = response.json()
                result = data.get("result", {})
                items = result.get("search_results", []) if isinstance(result, dict) else []
                currency = market["currency"]
                rate = rates.get(currency, 1.0)
                results = []
                for item in items[:2]:
                    price_data = item.get("price", {})
                    price_local = price_data.get("value", price_data.get("current", 0)) if isinstance(price_data, dict) else (price_data or 0)
                    if not price_local:
                        continue
                    price_usd = round(float(price_local) / rate, 2)
                    calc = calc_profit(price_usd, amazon_us_price, marketplace)
                    results.append({
                        "platform": market["name"], "flag": market["flag"],
                        "marketplace": marketplace,
                        "title": item.get("title", "")[:80],
                        "price_local": price_local, "currency": currency,
                        "price_usd": price_usd,
                        "arbitrage_profit": calc["profit"],
                        "margin": calc["margin"], "roi": calc["roi"],
                        "vat_rate": f"%{int(VAT_RATES.get(marketplace, 0)*100)}",
                        "vat_amount": calc["vat_amount"], "fba_fee": calc["fba_fee"],
                        "url": f"https://amazon{market['domain']}/s?k={keyword.replace(' ', '+')}",
                        "asin": item.get("asin", ""), "mock": False
                    })
                return results
    except Exception as e:
        print(f"Amazon {marketplace} error: {e}")
    return get_mock_amazon_market(keyword, marketplace, amazon_us_price, rates)

async def search_trendyol(keyword: str, amazon_price: float, rates: dict):
    try:
        # SSL doğrulaması kapalı — Windows sertifika sorunu
        async with httpx.AsyncClient(timeout=15, verify=False) as client:
            response = await client.get(
                "https://public.trendyol.com/discovery-web-searchgw-service/api/filter/search/v2",
                params={"q": keyword, "pi": 1},
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    "Accept": "application/json",
                }
            )
            if response.status_code == 200:
                data = response.json()
                products = data.get("result", {}).get("products", [])[:2]
                try_rate = rates.get("TRY", 32.0)
                results = []
                for p in products:
                    price_try = p.get("price", {}).get("discountedPrice", {}).get("value", 0)
                    price_usd = round(price_try / try_rate, 2) if price_try else 0
                    if price_usd > 0:
                        calc = calc_profit(price_usd, amazon_price, "US")
                        results.append({
                            "platform": "Trendyol", "flag": "🇹🇷", "marketplace": "TR",
                            "title": p.get("name", "")[:80],
                            "price_local": price_try, "currency": "TRY", "price_usd": price_usd,
                            "arbitrage_profit": calc["profit"], "margin": calc["margin"], "roi": calc["roi"],
                            "vat_rate": "%18", "vat_amount": 0, "fba_fee": calc["fba_fee"],
                            "url": f"https://trendyol.com{p.get('url', '')}", "mock": False
                        })
                return results
    except Exception as e:
        print(f"Trendyol error: {e}")
    return get_mock_trendyol(keyword, amazon_price, rates)

async def search_ebay(keyword: str, amazon_price: float):
    try:
        async with httpx.AsyncClient(timeout=15, verify=False) as client:
            response = await client.get(
                "https://svcs.ebay.com/services/search/FindingService/v1",
                params={
                    "OPERATION-NAME": "findItemsByKeywords",
                    "SERVICE-VERSION": "1.0.0",
                    "SECURITY-APPNAME": os.getenv("EBAY_APP_ID", ""),
                    "RESPONSE-DATA-FORMAT": "JSON",
                    "keywords": keyword,
                    "paginationInput.entriesPerPage": 2
                }
            )
            if response.status_code == 200:
                data = response.json()
                items = data.get("findItemsByKeywordsResponse", [{}])[0].get(
                    "searchResult", [{}])[0].get("item", [])
                results = []
                for item in items[:2]:
                    price = float(item.get("sellingStatus", [{}])[0].get(
                        "currentPrice", [{}])[0].get("__value__", 0))
                    calc = calc_profit(price, amazon_price, "US")
                    results.append({
                        "platform": "eBay", "flag": "🛒", "marketplace": "US",
                        "title": item.get("title", [""])[0][:80],
                        "price_local": price, "currency": "USD", "price_usd": price,
                        "arbitrage_profit": calc["profit"], "margin": calc["margin"], "roi": calc["roi"],
                        "vat_rate": "%0", "vat_amount": 0, "fba_fee": calc["fba_fee"],
                        "url": item.get("viewItemURL", [""])[0], "mock": False
                    })
                return results
    except Exception as e:
        print(f"eBay error: {e}")
    return get_mock_ebay(keyword, amazon_price)

async def get_global_prices(keyword: str, amazon_price: float, include_euro_flips: bool = True):
    import asyncio
    rates = await get_exchange_rates()

    trendyol, ebay = await asyncio.gather(
        search_trendyol(keyword, amazon_price, rates),
        search_ebay(keyword, amazon_price),
        return_exceptions=True
    )

    # Exception gelirse mock kullan
    if isinstance(trendyol, Exception):
        trendyol = get_mock_trendyol(keyword, amazon_price, rates)
    if isinstance(ebay, Exception):
        ebay = get_mock_ebay(keyword, amazon_price)

    all_results = list(trendyol) + list(ebay)

    euro_results = []
    if include_euro_flips:
        euro_markets = ["DE", "FR", "UK", "IT", "ES", "CA"]
        euro_tasks = await asyncio.gather(*[
            search_amazon_market(keyword, m, amazon_price, rates)
            for m in euro_markets
        ], return_exceptions=True)
        for lst in euro_tasks:
            if not isinstance(lst, Exception):
                euro_results.extend(lst)

    all_results = all_results + euro_results
    all_results.sort(key=lambda x: x.get("arbitrage_profit", 0), reverse=True)

    best = all_results[0] if all_results else None
    best_euro = None
    if euro_results:
        euro_sorted = sorted(euro_results, key=lambda x: x.get("arbitrage_profit", 0), reverse=True)
        best_euro = euro_sorted[0] if euro_sorted[0].get("arbitrage_profit", 0) > 0 else None

    return {
        "keyword": keyword,
        "amazon_price": amazon_price,
        "results": all_results,
        "euro_flips": euro_results,
        "best_opportunity": best,
        "best_euro_flip": best_euro,
        "total_platforms": len(all_results),
        "exchange_rates": {k: rates.get(k) for k in ["EUR", "GBP", "TRY", "CAD", "JPY"]},
    }

def get_mock_amazon_market(keyword: str, marketplace: str, amazon_us_price: float, rates: dict) -> list:
    import math
    market = AMAZON_MARKETS.get(marketplace, {})
    currency = market.get("currency", "EUR")
    rate = rates.get(currency, 0.92)
    seed = sum(ord(c) for c in keyword + marketplace)
    factor = 0.55 + (abs(math.sin(seed)) * 0.3)
    price_local = round(amazon_us_price * rate * factor, 2)
    price_usd = round(price_local / rate, 2)
    calc = calc_profit(price_usd, amazon_us_price, marketplace)
    return [{
        "platform": market.get("name", f"Amazon.{marketplace}"),
        "flag": market.get("flag", "🌍"), "marketplace": marketplace,
        "title": f"{keyword} - {market.get('name', marketplace)}",
        "price_local": price_local, "currency": currency, "price_usd": price_usd,
        "arbitrage_profit": calc["profit"], "margin": calc["margin"], "roi": calc["roi"],
        "vat_rate": f"%{int(VAT_RATES.get(marketplace, 0)*100)}",
        "vat_amount": calc["vat_amount"], "fba_fee": calc["fba_fee"],
        "url": f"https://amazon{market.get('domain', '.de')}/s?k={keyword.replace(' ', '+')}",
        "mock": True
    }]

def get_mock_trendyol(keyword: str, amazon_price: float, rates: dict) -> list:
    try_rate = rates.get("TRY", 32.0)
    price_try = round(amazon_price * try_rate * 0.35, 0)
    price_usd = round(price_try / try_rate, 2)
    calc = calc_profit(price_usd, amazon_price, "US")
    return [{
        "platform": "Trendyol", "flag": "🇹🇷", "marketplace": "TR",
        "title": f"{keyword} - Trendyol",
        "price_local": price_try, "currency": "TRY", "price_usd": price_usd,
        "arbitrage_profit": calc["profit"], "margin": calc["margin"], "roi": calc["roi"],
        "vat_rate": "%18", "vat_amount": 0, "fba_fee": calc["fba_fee"],
        "url": "https://trendyol.com", "mock": True
    }]

def get_mock_ebay(keyword: str, amazon_price: float) -> list:
    price = round(amazon_price * 0.62, 2)
    calc = calc_profit(price, amazon_price, "US")
    return [{
        "platform": "eBay", "flag": "🛒", "marketplace": "US",
        "title": f"{keyword} - eBay",
        "price_local": price, "currency": "USD", "price_usd": price,
        "arbitrage_profit": calc["profit"], "margin": calc["margin"], "roi": calc["roi"],
        "vat_rate": "%0", "vat_amount": 0, "fba_fee": calc["fba_fee"],
        "url": "https://ebay.com", "mock": True
    }]
