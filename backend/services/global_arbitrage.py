import httpx
import os
from dotenv import load_dotenv

load_dotenv()

async def get_exchange_rate(currency: str = "TRY") -> float:
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(
                f"https://api.exchangerate-api.com/v4/latest/USD"
            )
            if response.status_code == 200:
                data = response.json()
                return data.get("rates", {}).get(currency, 32.0)
    except:
        pass
    # Fallback rates
    rates = {"TRY": 32.0, "EUR": 0.92, "GBP": 0.79}
    return rates.get(currency, 1.0)

async def search_trendyol(keyword: str, amazon_price: float):
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.get(
                "https://public.trendyol.com/discovery-web-searchgw-service/api/filter/search/v2",
                params={"q": keyword, "pi": 1},
                headers={"User-Agent": "Mozilla/5.0"}
            )
            if response.status_code == 200:
                data = response.json()
                products = data.get("result", {}).get("products", [])[:3]
                try_rate = await get_exchange_rate("TRY")
                results = []
                for p in products:
                    price_try = p.get("price", {}).get("discountedPrice", {}).get("value", 0)
                    price_usd = round(price_try / try_rate, 2) if price_try else 0
                    if price_usd > 0:
                        profit = round(amazon_price - price_usd - (amazon_price * 0.15) - 2.5, 2)
                        results.append({
                            "platform": "Trendyol",
                            "flag": "🇹🇷",
                            "title": p.get("name", ""),
                            "price_local": price_try,
                            "currency": "TRY",
                            "price_usd": price_usd,
                            "url": f"https://trendyol.com{p.get('url', '')}",
                            "arbitrage_profit": profit,
                            "mock": False
                        })
                return results
    except Exception as e:
        print(f"Trendyol error: {e}")
    return get_mock_trendyol(keyword, amazon_price)

async def search_ebay(keyword: str, amazon_price: float):
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.get(
                "https://svcs.ebay.com/services/search/FindingService/v1",
                params={
                    "OPERATION-NAME": "findItemsByKeywords",
                    "SERVICE-VERSION": "1.0.0",
                    "SECURITY-APPNAME": os.getenv("EBAY_APP_ID", ""),
                    "RESPONSE-DATA-FORMAT": "JSON",
                    "keywords": keyword,
                    "paginationInput.entriesPerPage": 3
                }
            )
            if response.status_code == 200:
                data = response.json()
                items = data.get("findItemsByKeywordsResponse", [{}])[0].get("searchResult", [{}])[0].get("item", [])
                results = []
                for item in items[:3]:
                    price = float(item.get("sellingStatus", [{}])[0].get("currentPrice", [{}])[0].get("__value__", 0))
                    profit = round(amazon_price - price - (amazon_price * 0.15) - 2.5, 2)
                    results.append({
                        "platform": "eBay",
                        "flag": "🛒",
                        "title": item.get("title", [""])[0],
                        "price_local": price,
                        "currency": "USD",
                        "price_usd": price,
                        "url": item.get("viewItemURL", [""])[0],
                        "arbitrage_profit": profit,
                        "mock": False
                    })
                return results
    except Exception as e:
        print(f"eBay error: {e}")
    return get_mock_ebay(keyword, amazon_price)

async def get_global_prices(keyword: str, amazon_price: float):
    trendyol = await search_trendyol(keyword, amazon_price)
    ebay = await search_ebay(keyword, amazon_price)
    
    all_results = trendyol + ebay
    all_results.sort(key=lambda x: x.get("arbitrage_profit", 0), reverse=True)
    
    best = all_results[0] if all_results else None
    
    return {
        "keyword": keyword,
        "amazon_price": amazon_price,
        "results": all_results,
        "best_opportunity": best,
        "total_platforms": len(all_results)
    }

def get_mock_trendyol(keyword: str, amazon_price: float):
    try_rate = 32.0
    mock_try = 285.0
    mock_usd = round(mock_try / try_rate, 2)
    profit = round(amazon_price - mock_usd - (amazon_price * 0.15) - 2.5, 2)
    return [{
        "platform": "Trendyol",
        "flag": "🇹🇷",
        "title": f"{keyword} - Trendyol",
        "price_local": mock_try,
        "currency": "TRY",
        "price_usd": mock_usd,
        "url": "https://trendyol.com",
        "arbitrage_profit": profit,
        "mock": True
    }]

def get_mock_ebay(keyword: str, amazon_price: float):
    mock_price = round(amazon_price * 0.65, 2)
    profit = round(amazon_price - mock_price - (amazon_price * 0.15) - 2.5, 2)
    return [{
        "platform": "eBay",
        "flag": "🛒",
        "title": f"{keyword} - eBay",
        "price_local": mock_price,
        "currency": "USD",
        "price_usd": mock_price,
        "url": "https://ebay.com",
        "arbitrage_profit": profit,
        "mock": True
    }]