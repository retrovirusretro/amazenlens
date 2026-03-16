import httpx
import os
from dotenv import load_dotenv

load_dotenv()

ALIBABA_APP_KEY = os.getenv("ALIBABA_APP_KEY")
ALIBABA_APP_SECRET = os.getenv("ALIBABA_APP_SECRET")

async def search_suppliers(keyword: str, page: int = 1):
    # API key yoksa mock data döndür
    if not ALIBABA_APP_KEY or ALIBABA_APP_KEY == "buraya_yazacaksin":
        return get_mock_suppliers(keyword)
    
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(
                "https://eco.taobao.com/router/rest",
                params={
                    "method": "alibaba.icbu.product.list",
                    "app_key": ALIBABA_APP_KEY,
                    "keywords": keyword,
                    "page_index": page,
                    "page_size": 10,
                    "format": "json",
                    "v": "2.0",
                    "sign_method": "md5",
                }
            )
            if response.status_code == 200:
                data = response.json()
                return format_suppliers(data, keyword)
            else:
                return get_mock_suppliers(keyword)
    except Exception as e:
        print(f"Alibaba error: {e}")
        return get_mock_suppliers(keyword)

def format_suppliers(data: dict, keyword: str):
    try:
        products = data.get("alibaba_icbu_product_list_response", {}).get("products", {}).get("product", [])
        suppliers = []
        for p in products:
            suppliers.append({
                "name": p.get("subject", ""),
                "price_min": p.get("price", {}).get("from", "0"),
                "price_max": p.get("price", {}).get("to", "0"),
                "moq": p.get("min_order_quantity", "1"),
                "company": p.get("company_name", ""),
                "url": p.get("detail_url", ""),
                "image": p.get("image_url", ""),
                "verified": p.get("is_gold_supplier", False),
                "mock": False
            })
        return {"suppliers": suppliers, "total": len(suppliers), "mock": False}
    except:
        return get_mock_suppliers(keyword)

def calculate_profit(amazon_price: float, alibaba_price: float):
    fba_fee = amazon_price * 0.15 + 2.50
    net_profit = amazon_price - alibaba_price - fba_fee
    margin = (net_profit / amazon_price * 100) if amazon_price > 0 else 0
    roi = (net_profit / alibaba_price * 100) if alibaba_price > 0 else 0
    return {
        "amazon_price": amazon_price,
        "alibaba_price": alibaba_price,
        "fba_fee": round(fba_fee, 2),
        "net_profit": round(net_profit, 2),
        "margin_pct": round(margin, 1),
        "roi_pct": round(roi, 1),
        "verdict": "✅ Karlı" if margin > 30 else "⚠️ Dikkatli" if margin > 15 else "❌ Zayıf"
    }

def get_mock_suppliers(keyword: str):
    return {
        "suppliers": [
            {
                "name": f"{keyword} Premium Quality",
                "price_min": "2.50",
                "price_max": "5.00",
                "moq": "100",
                "company": "Guangzhou Trading Co.",
                "url": f"https://www.alibaba.com/trade/search?SearchText={keyword.replace(' ', '+')}",
                "image": "https://placehold.co/200x200?text=Supplier",
                "verified": True,
                "mock": True
            },
            {
                "name": f"{keyword} Factory Direct",
                "price_min": "1.80",
                "price_max": "3.50",
                "moq": "500",
                "company": "Shenzhen Manufacturing Ltd.",
                "url": f"https://www.alibaba.com/trade/search?SearchText={keyword.replace(' ', '+')}",
                "image": "https://placehold.co/200x200?text=Supplier",
                "verified": True,
                "mock": True
            },
            {
                "name": f"{keyword} OEM Supplier",
                "price_min": "3.00",
                "price_max": "6.00",
                "moq": "50",
                "company": "Yiwu Export Co.",
                "url": f"https://www.alibaba.com/trade/search?SearchText={keyword.replace(' ', '+')}",
                "image": "https://placehold.co/200x200?text=Supplier",
                "verified": False,
                "mock": True
            }
        ],
        "total": 3,
        "mock": True
    }