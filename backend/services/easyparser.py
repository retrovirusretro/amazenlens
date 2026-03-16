import httpx
import os
from dotenv import load_dotenv

load_dotenv()

EASYPARSER_API_KEY = os.getenv("EASYPARSER_API_KEY")
BASE_URL = "https://realtime.easyparser.com/v1/request"

async def search_products(keyword: str, page: int = 1):
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(
                BASE_URL,
                params={
                    "api_key": EASYPARSER_API_KEY,
                    "platform": "AMZ",
                    "operation": "SEARCH",
                    "domain": ".com",
                    "keyword": keyword,
                    "page": page
                }
            )
            if response.status_code == 200:
                data = response.json()
                return format_search_results(data)
            else:
                print(f"Easyparser error: {response.status_code} - {response.text}")
                return get_mock_search(keyword)
    except Exception as e:
        print(f"Easyparser exception: {e}")
        return get_mock_search(keyword)

async def get_product(asin: str):
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(
                BASE_URL,
                params={
                    "api_key": EASYPARSER_API_KEY,
                    "platform": "AMZ",
                    "operation": "DETAIL",
                    "domain": ".com",
                    "asin": asin
                }
            )
            if response.status_code == 200:
                data = response.json()
                return format_product(data, asin)
            else:
                print(f"Easyparser error: {response.status_code} - {response.text}")
                return get_mock_product(asin)
    except Exception as e:
        print(f"Easyparser exception: {e}")
        return get_mock_product(asin)

async def check_availability(asin: str):
    product = await get_product(asin)
    return {
        "asin": asin,
        "available": product.get("in_stock", True),
        "price": product.get("price", 0),
        "title": product.get("title", "")
    }

def format_search_results(data: dict):
    results = []
    # result bir dict, içinde search_results var
    result = data.get("result", {})
    if isinstance(result, dict):
        items = result.get("search_results", [])
    elif isinstance(result, list):
        items = result
    else:
        items = []
    
    for item in items:
        image = item.get("image", "")
        if image and not image.startswith("http"):
            image = f"https://m.media-amazon.com/images/I/{image}.jpg"
        
        price_data = item.get("price", {})
        if isinstance(price_data, dict):
            price = price_data.get("value", price_data.get("current", 0))
        else:
            price = price_data or 0

        results.append({
            "asin": item.get("asin", ""),
            "title": item.get("title", ""),
            "price": price,
            "rating": item.get("rating", item.get("stars", 0)),
            "reviews": item.get("reviews", item.get("ratings_total", 0)),
            "image": image,
            "url": f"https://amazon.com/dp/{item.get('asin', '')}",
            "bsr": item.get("bsr", 0),
            "in_stock": item.get("in_stock", True)
        })
    return {"results": results, "total": len(results), "mock": False}

def format_product(data: dict, asin: str):
    price = data.get("price", {})
    if isinstance(price, dict):
        price_val = price.get("value", 0)
    else:
        price_val = price or 0
    return {
        "asin": asin,
        "title": data.get("title", ""),
        "price": price_val,
        "rating": data.get("rating", data.get("rating_value", 0)),
        "reviews": data.get("reviews", data.get("reviews_count", 0)),
        "image": data.get("image", data.get("image_url", "")),
        "url": f"https://amazon.com/dp/{asin}",
        "bsr": data.get("bsr", 0),
        "in_stock": data.get("in_stock", True),
        "dimensions": data.get("dimensions", {"weight": 0.5}),
        "category": data.get("category", ""),
        "mock": False
    }

def get_mock_search(keyword: str):
    return {
        "results": [
            {"asin": "B00MOCK001", "title": f"{keyword} - Premium Product", "price": 29.99,
             "rating": 4.5, "reviews": 1250, "image": "https://placehold.co/200x200?text=Product",
             "url": "https://amazon.com/dp/B00MOCK001", "bsr": 1250, "in_stock": True},
            {"asin": "B00MOCK002", "title": f"{keyword} - Budget Option", "price": 14.99,
             "rating": 4.2, "reviews": 856, "image": "https://placehold.co/200x200?text=Product",
             "url": "https://amazon.com/dp/B00MOCK002", "bsr": 3400, "in_stock": True},
            {"asin": "B00MOCK003", "title": f"{keyword} - Currently Unavailable", "price": 0,
             "rating": 4.0, "reviews": 423, "image": "https://placehold.co/200x200?text=Unavailable",
             "url": "https://amazon.com/dp/B00MOCK003", "bsr": 0, "in_stock": False}
        ],
        "total": 3, "mock": True
    }

def get_mock_product(asin: str):
    return {
        "asin": asin, "title": "Mock Product Title", "price": 29.99, "rating": 4.5,
        "reviews": 1250, "image": "https://placehold.co/200x200?text=Product",
        "url": f"https://amazon.com/dp/{asin}", "bsr": 1250, "in_stock": True,
        "dimensions": {"weight": 0.5}, "category": "Sports & Outdoors", "mock": True
    }