import httpx
import os
from dotenv import load_dotenv

load_dotenv()

EASYPARSER_API_KEY = os.getenv("EASYPARSER_API_KEY")
BASE_URL = "https://api.easyparser.io"

async def search_products(keyword: str, page: int = 1):
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(
                f"{BASE_URL}/amazon/search",
                params={
                    "api_key": EASYPARSER_API_KEY,
                    "query": keyword,
                    "page": page,
                    "country": "US"
                }
            )
            if response.status_code == 200:
                return response.json()
            else:
                return get_mock_search(keyword)
    except Exception:
        return get_mock_search(keyword)

async def get_product(asin: str):
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(
                f"{BASE_URL}/amazon/product",
                params={
                    "api_key": EASYPARSER_API_KEY,
                    "asin": asin,
                    "country": "US"
                }
            )
            if response.status_code == 200:
                return response.json()
            else:
                return get_mock_product(asin)
    except Exception:
        return get_mock_product(asin)

async def check_availability(asin: str):
    product = await get_product(asin)
    return {
        "asin": asin,
        "available": product.get("in_stock", True),
        "price": product.get("price", 0),
        "title": product.get("title", "")
    }

def get_mock_search(keyword: str):
    return {
        "results": [
            {
                "asin": "B00MOCK001",
                "title": f"{keyword} - Premium Product",
                "price": 29.99,
                "rating": 4.5,
                "reviews": 1250,
                "image": "https://via.placeholder.com/200",
                "url": "https://amazon.com/dp/B00MOCK001",
                "bsr": 1250,
                "in_stock": True
            },
            {
                "asin": "B00MOCK002",
                "title": f"{keyword} - Budget Option",
                "price": 14.99,
                "rating": 4.2,
                "reviews": 856,
                "image": "https://via.placeholder.com/200",
                "url": "https://amazon.com/dp/B00MOCK002",
                "bsr": 3400,
                "in_stock": True
            },
            {
                "asin": "B00MOCK003",
                "title": f"{keyword} - Currently Unavailable",
                "price": 0,
                "rating": 4.0,
                "reviews": 423,
                "image": "https://via.placeholder.com/200",
                "url": "https://amazon.com/dp/B00MOCK003",
                "bsr": 0,
                "in_stock": False
            }
        ],
        "total": 3,
        "mock": True
    }

def get_mock_product(asin: str):
    return {
        "asin": asin,
        "title": "Mock Product Title",
        "price": 29.99,
        "rating": 4.5,
        "reviews": 1250,
        "image": "https://via.placeholder.com/200",
        "url": f"https://amazon.com/dp/{asin}",
        "bsr": 1250,
        "in_stock": True,
        "dimensions": {"length": 10, "width": 5, "height": 2, "weight": 0.5},
        "category": "Sports & Outdoors",
        "mock": True
    }