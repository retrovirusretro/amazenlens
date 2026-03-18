import httpx
import os
import math
from dotenv import load_dotenv

load_dotenv()

ALIBABA_APP_KEY = os.getenv("ALIBABA_APP_KEY")
ALIBABA_APP_SECRET = os.getenv("ALIBABA_APP_SECRET")

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
    "US": "Amazon.com 🇺🇸", "DE": "Amazon.de 🇩🇪", "FR": "Amazon.fr 🇫🇷",
    "IT": "Amazon.it 🇮🇹", "ES": "Amazon.es 🇪🇸", "UK": "Amazon.co.uk 🇬🇧",
    "CA": "Amazon.ca 🇨🇦", "JP": "Amazon.co.jp 🇯🇵", "AE": "Amazon.ae 🇦🇪",
}

# Türkiye sektörel tedarikçi mock veritabanı
TR_SUPPLIERS_DB = {
    "tekstil": [
        {"name": "Bursa Tekstil A.Ş.", "city": "Bursa", "sector": "Tekstil & Kumaş", "min_order": "100 adet", "delivery": "2-3 gün", "contact": "info@bursatekstil.com.tr", "certifications": ["ISO 9001", "OEKO-TEX"], "price_advantage": "Alibaba'dan %15 ucuz"},
        {"name": "İstanbul Deri San.", "city": "İstanbul", "sector": "Deri Ürünleri", "min_order": "50 adet", "delivery": "3-4 gün", "contact": "satis@istderi.com.tr", "certifications": ["ISO 9001"], "price_advantage": "Gümrüksüz teslimat"},
    ],
    "ev": [
        {"name": "Kütahya Porselen", "city": "Kütahya", "sector": "Ev & Mutfak", "min_order": "200 adet", "delivery": "3-5 gün", "contact": "ihracat@kutahyaporselen.com", "certifications": ["ISO 9001", "CE"], "price_advantage": "Made in Turkey premium"},
        {"name": "Denizli Ev Tekstil", "city": "Denizli", "sector": "Ev Tekstili", "min_order": "100 adet", "delivery": "2-3 gün", "contact": "export@denizlitextile.com", "certifications": ["OEKO-TEX", "GOTS"], "price_advantage": "AB gümrüksüz"},
    ],
    "spor": [
        {"name": "Ankara Spor Malz.", "city": "Ankara", "sector": "Spor & Outdoor", "min_order": "50 adet", "delivery": "2-3 gün", "contact": "info@ankaraspor.com.tr", "certifications": ["ISO 9001"], "price_advantage": "Hızlı teslimat"},
    ],
    "elektronik": [
        {"name": "Arçelik Tedarikçi", "city": "İstanbul", "sector": "Elektronik", "min_order": "500 adet", "delivery": "5-7 gün", "contact": "b2b@arcelik.com", "certifications": ["CE", "RoHS", "ISO 9001"], "price_advantage": "Kalite garantisi"},
    ],
    "genel": [
        {"name": "Türkiye İhracatçılar Birliği", "city": "İstanbul", "sector": "Genel", "min_order": "Esnek", "delivery": "2-5 gün", "contact": "info@tim.org.tr", "certifications": [], "price_advantage": "500+ onaylı tedarikçi"},
        {"name": "Altın Sayfalar B2B", "city": "Türkiye Geneli", "sector": "Genel", "min_order": "Esnek", "delivery": "2-7 gün", "contact": "b2b@altinsayfalar.com", "certifications": [], "price_advantage": "Tüm sektörler"},
        {"name": "KobiVadisi.com", "city": "Türkiye Geneli", "sector": "Genel", "min_order": "Esnek", "delivery": "3-7 gün", "contact": "info@kobivadisi.com", "certifications": [], "price_advantage": "KOBİ dostu"},
    ]
}

def get_tr_category(keyword: str) -> str:
    kw = keyword.lower()
    if any(w in kw for w in ["tekstil", "kumaş", "giyim", "elbise", "deri", "çanta", "cüzdan"]):
        return "tekstil"
    if any(w in kw for w in ["mutfak", "ev", "porselen", "tabak", "bardak", "havlu", "yatak", "yastık"]):
        return "ev"
    if any(w in kw for w in ["spor", "yoga", "egzersiz", "fitness", "outdoor", "kamp"]):
        return "spor"
    if any(w in kw for w in ["elektronik", "telefon", "bilgisayar", "led", "şarj", "kablosuz"]):
        return "elektronik"
    return "genel"

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

async def search_dhgate(keyword: str):
    """DHgate tedarikçi arama — düşük MOQ, dropshipping dostu"""
    return get_mock_dhgate(keyword)

async def search_turkish_suppliers(keyword: str):
    """Türk tedarikçi arama — Made in Turkey avantajı"""
    category = get_tr_category(keyword)
    suppliers = TR_SUPPLIERS_DB.get(category, TR_SUPPLIERS_DB["genel"])

    # Seed'li fiyat üret
    seed = sum(ord(c) for c in keyword)
    try_rate = 32.0  # 1 USD

    result = []
    for s in suppliers:
        base_try = 80 + (abs(math.sin(seed + len(s["name"]))) * 120)
        price_try = round(base_try, 0)
        price_usd = round(price_try / try_rate, 2)

        result.append({
            "name": s["name"],
            "platform": "Türk Tedarikçi",
            "city": s["city"],
            "sector": s["sector"],
            "price_min": str(price_usd),
            "price_max": str(round(price_usd * 1.4, 2)),
            "price_try": price_try,
            "moq": s["min_order"],
            "delivery": s["delivery"],
            "company": s["city"] + " / Türkiye",
            "url": f"https://www.google.com/search?q={s['name'].replace(' ', '+')}",
            "contact": s["contact"],
            "certifications": s["certifications"],
            "price_advantage": s["price_advantage"],
            "verified": True,
            "made_in_turkey": True,
            "mock": True,
            "advantages": [
                "🇹🇷 Made in Turkey — AB'de premium fiyat",
                "⚡ 2-5 gün teslimat (Çin'den 30-60 gün)",
                "✅ AB-Türkiye Gümrük Birliği — sıfır gümrük",
                "📞 Türkçe iletişim, kolay anlaşma",
            ]
        })

    return {
        "suppliers": result,
        "total": len(result),
        "category": category,
        "keyword": keyword,
        "mock": True,
        "info": "Made in Turkey avantajı: AB pazarında premium fiyat + gümrüksüz teslimat"
    }

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
                "platform": "Alibaba",
                "mock": False
            })
        return {"suppliers": suppliers, "total": len(suppliers), "mock": False}
    except:
        return get_mock_suppliers(keyword)

def calculate_profit(amazon_price: float, alibaba_price: float, marketplace: str = "US") -> dict:
    mp = marketplace.upper()
    fba = FBA_TABLE.get(mp, FBA_TABLE["US"])
    vat = VAT_TABLE.get(mp, 0)
    fba_fee = round(amazon_price * fba["pct"] + fba["base"], 2)
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
    rates = {"USD": 1.0, "EUR": 0.92, "GBP": 0.79, "CAD": 1.36, "JPY": 149.0, "AED": 3.67}
    results = []
    for mp, market_name in MARKET_NAMES.items():
        fba = FBA_TABLE.get(mp, FBA_TABLE["US"])
        vat = VAT_TABLE.get(mp, 0)
        rate = rates.get(fba["currency"], 1.0)
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
            "marketplace": mp, "marketplace_name": market_name,
            "price_local": price_local, "currency": fba["currency"], "symbol": fba["symbol"],
            "alibaba_local": alibaba_local, "fba_fee": fba_fee,
            "vat_rate": f"%{int(vat * 100)}", "vat_amount": vat_amount,
            "net_revenue": net_revenue, "net_profit": net_profit,
            "margin_pct": margin, "roi_pct": roi,
            "verdict": "✅" if margin > 30 else "⚠️" if margin > 15 else "❌",
            "verdict_text": "Karlı" if margin > 30 else "Dikkatli" if margin > 15 else "Zayıf"
        })
    results.sort(key=lambda x: x["margin_pct"], reverse=True)
    best = results[0] if results else None
    profitable = [r for r in results if r["margin_pct"] > 15]
    return {
        "amazon_price_usd": amazon_price_usd, "alibaba_price": alibaba_price,
        "shipping_cost": shipping_cost, "results": results,
        "best_market": best, "profitable_count": len(profitable), "total_markets": len(results)
    }

def get_mock_suppliers(keyword: str):
    seed = sum(ord(c) for c in keyword)
    return {
        "suppliers": [
            {"name": f"{keyword} Premium Quality", "price_min": "2.50", "price_max": "5.00", "moq": "100", "company": "Guangzhou Trading Co.", "url": f"https://www.alibaba.com/trade/search?SearchText={keyword.replace(' ', '+')}", "image": "", "verified": True, "platform": "Alibaba", "mock": True},
            {"name": f"{keyword} Factory Direct", "price_min": "1.80", "price_max": "3.50", "moq": "500", "company": "Shenzhen Manufacturing Ltd.", "url": f"https://www.alibaba.com/trade/search?SearchText={keyword.replace(' ', '+')}", "image": "", "verified": True, "platform": "Alibaba", "mock": True},
            {"name": f"{keyword} OEM Supplier", "price_min": "3.00", "price_max": "6.00", "moq": "50", "company": "Yiwu Export Co.", "url": f"https://www.alibaba.com/trade/search?SearchText={keyword.replace(' ', '+')}", "image": "", "verified": False, "platform": "Alibaba", "mock": True},
        ],
        "total": 3, "mock": True
    }

def get_mock_dhgate(keyword: str):
    seed = sum(ord(c) for c in keyword)
    base = 2.0 + (abs(math.sin(seed)) * 3)
    return {
        "suppliers": [
            {
                "name": f"{keyword} DHgate Seller",
                "price_min": str(round(base, 2)),
                "price_max": str(round(base * 1.5, 2)),
                "moq": "1",
                "company": "DHgate Store",
                "url": f"https://www.dhgate.com/wholesale/search.do?act=search&searchkey={keyword.replace(' ', '+')}",
                "image": "",
                "verified": True,
                "platform": "DHgate",
                "rating": "4.8",
                "sold": f"{int(abs(math.sin(seed+1)) * 5000 + 500)} satış",
                "shipping": "ePacket / DHL",
                "mock": True,
                "advantages": ["Minimum 1 adet sipariş", "Dropshipping uyumlu", "Escrow ödeme güvencesi"]
            },
            {
                "name": f"{keyword} Wholesale",
                "price_min": str(round(base * 0.85, 2)),
                "price_max": str(round(base * 1.2, 2)),
                "moq": "5",
                "company": "DHgate Top Seller",
                "url": f"https://www.dhgate.com/wholesale/search.do?act=search&searchkey={keyword.replace(' ', '+')}",
                "image": "",
                "verified": True,
                "platform": "DHgate",
                "rating": "4.9",
                "sold": f"{int(abs(math.sin(seed+2)) * 8000 + 1000)} satış",
                "shipping": "FedEx / UPS",
                "mock": True,
                "advantages": ["5 adet'ten sipariş", "Hızlı kargo seçeneği", "30 gün iade garantisi"]
            },
        ],
        "total": 2, "mock": True,
        "info": "DHgate: Düşük MOQ ve dropshipping için ideal. 1 adet'ten sipariş verilebilir."
    }
