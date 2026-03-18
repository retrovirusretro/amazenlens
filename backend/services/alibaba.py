import httpx
import os
from dotenv import load_dotenv

load_dotenv()

ALIBABA_APP_KEY = os.getenv("ALIBABA_APP_KEY")
ALIBABA_APP_SECRET = os.getenv("ALIBABA_APP_SECRET")

# FBA ücret tablosu — marketplace bazlı
FBA_TABLE = {
    "US": {"base": 2.50, "pct": 0.15, "referral": 0.15, "currency": "USD", "symbol": "$"},
    "DE": {"base": 2.80, "pct": 0.15, "referral": 0.15, "currency": "EUR", "symbol": "€"},
    "FR": {"base": 2.80, "pct": 0.15, "referral": 0.15, "currency": "EUR", "symbol": "€"},
    "IT": {"base": 2.90, "pct": 0.15, "referral": 0.15, "currency": "EUR", "symbol": "€"},
    "ES": {"base": 2.70, "pct": 0.15, "referral": 0.15, "currency": "EUR", "symbol": "€"},
    "UK": {"base": 2.60, "pct": 0.15, "referral": 0.15, "currency": "GBP", "symbol": "£"},
    "CA": {"base": 2.40, "pct": 0.15, "referral": 0.15, "currency": "CAD", "symbol": "CA$"},
    "JP": {"base": 3.00, "pct": 0.15, "referral": 0.15, "currency": "JPY", "symbol": "¥"},
    "AE": {"base": 2.50, "pct": 0.15, "referral": 0.15, "currency": "AED", "symbol": "AED"},
}

VAT_TABLE = {
    "US": 0.00, "DE": 0.19, "FR": 0.20, "IT": 0.22,
    "ES": 0.21, "UK": 0.20, "CA": 0.05, "JP": 0.10, "AE": 0.05,
}

MARKET_NAMES = {
    "US": "Amazon.com 🇺🇸",
    "DE": "Amazon.de 🇩🇪",
    "FR": "Amazon.fr 🇫🇷",
    "IT": "Amazon.it 🇮🇹",
    "ES": "Amazon.es 🇪🇸",
    "UK": "Amazon.co.uk 🇬🇧",
    "CA": "Amazon.ca 🇨🇦",
    "JP": "Amazon.co.jp 🇯🇵",
    "AE": "Amazon.ae 🇦🇪",
}

async def search_suppliers(keyword: str, page: int = 1):
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
                return format_suppliers(response.json(), keyword)
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

def calculate_profit(amazon_price: float, alibaba_price: float, marketplace: str = "US") -> dict:
    """Tek marketplace için kar hesabı"""
    mp = marketplace.upper()
    fba = FBA_TABLE.get(mp, FBA_TABLE["US"])
    vat = VAT_TABLE.get(mp, 0)

    fba_fee = round(amazon_price * fba["pct"] + fba["base"], 2)
    referral_fee = round(amazon_price * fba["referral"], 2)
    vat_amount = round(amazon_price * vat, 2)
    net_revenue = round(amazon_price - vat_amount, 2)
    net_profit = round(net_revenue - alibaba_price - fba_fee, 2)
    margin = round((net_profit / amazon_price * 100), 1) if amazon_price > 0 else 0
    roi = round((net_profit / alibaba_price * 100), 1) if alibaba_price > 0 else 0
    breakeven = round(alibaba_price + fba_fee + vat_amount, 2)

    return {
        "marketplace": mp,
        "marketplace_name": MARKET_NAMES.get(mp, mp),
        "amazon_price": amazon_price,
        "alibaba_price": alibaba_price,
        "fba_fee": fba_fee,
        "referral_fee": referral_fee,
        "vat_rate": f"%{int(vat * 100)}",
        "vat_amount": vat_amount,
        "net_revenue": net_revenue,
        "net_profit": net_profit,
        "margin_pct": margin,
        "roi_pct": roi,
        "breakeven_price": breakeven,
        "currency": fba["currency"],
        "verdict": "✅ Karlı" if margin > 30 else "⚠️ Dikkatli" if margin > 15 else "❌ Zayıf"
    }

def calculate_pan_eu(amazon_price_usd: float, alibaba_price: float, shipping_cost: float = 0) -> dict:
    """Pan-EU — tüm Avrupa pazarları için kar hesabı"""
    # Basit kur tablosu (gerçekte API'den alınır)
    rates = {"USD": 1.0, "EUR": 0.92, "GBP": 0.79, "CAD": 1.36, "JPY": 149.0, "AED": 3.67}

    results = []
    for mp, market_name in MARKET_NAMES.items():
        fba = FBA_TABLE.get(mp, FBA_TABLE["US"])
        vat = VAT_TABLE.get(mp, 0)
        rate = rates.get(fba["currency"], 1.0)

        # Fiyatı local currency'ye çevir
        price_local = round(amazon_price_usd * rate, 2)
        alibaba_local = round(alibaba_price * rate, 2)
        ship_local = round(shipping_cost * rate, 2)

        fba_fee = round(price_local * fba["pct"] + fba["base"], 2)
        vat_amount = round(price_local * vat, 2)
        net_revenue = round(price_local - vat_amount, 2)
        net_profit = round(net_revenue - alibaba_local - fba_fee - ship_local, 2)
        margin = round((net_profit / price_local * 100), 1) if price_local > 0 else 0
        roi = round((net_profit / alibaba_local * 100), 1) if alibaba_local > 0 else 0

        results.append({
            "marketplace": mp,
            "marketplace_name": market_name,
            "price_local": price_local,
            "currency": fba["currency"],
            "symbol": fba["symbol"],
            "alibaba_local": alibaba_local,
            "fba_fee": fba_fee,
            "vat_rate": f"%{int(vat * 100)}",
            "vat_amount": vat_amount,
            "net_revenue": net_revenue,
            "net_profit": net_profit,
            "margin_pct": margin,
            "roi_pct": roi,
            "verdict": "✅" if margin > 30 else "⚠️" if margin > 15 else "❌",
            "verdict_text": "Karlı" if margin > 30 else "Dikkatli" if margin > 15 else "Zayıf"
        })

    results.sort(key=lambda x: x["margin_pct"], reverse=True)
    best = results[0] if results else None
    profitable = [r for r in results if r["margin_pct"] > 15]

    return {
        "amazon_price_usd": amazon_price_usd,
        "alibaba_price": alibaba_price,
        "shipping_cost": shipping_cost,
        "results": results,
        "best_market": best,
        "profitable_count": len(profitable),
        "total_markets": len(results)
    }

def get_mock_suppliers(keyword: str):
    return {
        "suppliers": [
            {
                "name": f"{keyword} Premium Quality",
                "price_min": "2.50", "price_max": "5.00", "moq": "100",
                "company": "Guangzhou Trading Co.",
                "url": f"https://www.alibaba.com/trade/search?SearchText={keyword.replace(' ', '+')}",
                "image": "https://placehold.co/200x200?text=Supplier",
                "verified": True, "mock": True
            },
            {
                "name": f"{keyword} Factory Direct",
                "price_min": "1.80", "price_max": "3.50", "moq": "500",
                "company": "Shenzhen Manufacturing Ltd.",
                "url": f"https://www.alibaba.com/trade/search?SearchText={keyword.replace(' ', '+')}",
                "image": "https://placehold.co/200x200?text=Supplier",
                "verified": True, "mock": True
            },
            {
                "name": f"{keyword} OEM Supplier",
                "price_min": "3.00", "price_max": "6.00", "moq": "50",
                "company": "Yiwu Export Co.",
                "url": f"https://www.alibaba.com/trade/search?SearchText={keyword.replace(' ', '+')}",
                "image": "https://placehold.co/200x200?text=Supplier",
                "verified": False, "mock": True
            }
        ],
        "total": 3, "mock": True
    }
