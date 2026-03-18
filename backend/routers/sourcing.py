from fastapi import APIRouter, Query
from services.alibaba import search_suppliers, calculate_profit
from services.global_arbitrage import get_global_prices, AMAZON_MARKETS, VAT_RATES, calc_profit

router = APIRouter(prefix="/api/sourcing", tags=["Sourcing"])

@router.get("/alibaba")
async def alibaba_search(
    keyword: str = Query(..., description="Arama kelimesi"),
    page: int = Query(1, description="Sayfa")
):
    return await search_suppliers(keyword, page)

@router.get("/profit-calc")
async def profit_calculator(
    amazon_price: float = Query(..., description="Amazon satış fiyatı"),
    alibaba_price: float = Query(..., description="Alibaba alış fiyatı"),
    marketplace: str = Query("US", description="Hedef marketplace (US/DE/FR/UK/IT/ES/CA/JP)")
):
    result = calculate_profit(amazon_price, alibaba_price)
    vat = VAT_RATES.get(marketplace.upper(), 0)
    vat_amount = round(amazon_price * vat, 2)
    net_revenue = round(amazon_price - vat_amount, 2)
    market_info = AMAZON_MARKETS.get(marketplace.upper(), {})
    result["marketplace"] = marketplace.upper()
    result["marketplace_name"] = market_info.get("name", f"Amazon.{marketplace}")
    result["marketplace_flag"] = market_info.get("flag", "🌍")
    result["vat_rate"] = f"%{int(vat * 100)}"
    result["vat_amount"] = vat_amount
    result["net_revenue_after_vat"] = net_revenue
    return result

@router.get("/arbitrage")
async def global_arbitrage(
    keyword: str = Query(..., description="Arama kelimesi"),
    amazon_price: float = Query(..., description="Amazon fiyatı"),
    include_euro: bool = Query(True, description="Euro Flips dahil et")
):
    return await get_global_prices(keyword, amazon_price, include_euro_flips=include_euro)

@router.get("/euro-flips")
async def euro_flips(
    keyword: str = Query(..., description="Arama kelimesi"),
    amazon_price: float = Query(..., description="Amazon US fiyatı ($)"),
    markets: str = Query("DE,FR,UK,IT,ES,CA", description="Virgülle ayrılmış pazarlar")
):
    from services.global_arbitrage import search_amazon_market, get_exchange_rates
    import asyncio

    rates = await get_exchange_rates()
    market_list = [m.strip().upper() for m in markets.split(",") if m.strip().upper() in AMAZON_MARKETS]

    results_lists = await asyncio.gather(*[
        search_amazon_market(keyword, m, amazon_price, rates) for m in market_list
    ])

    all_results = []
    for lst in results_lists:
        all_results.extend(lst)
    all_results.sort(key=lambda x: x.get("arbitrage_profit", 0), reverse=True)

    profitable = [r for r in all_results if r.get("arbitrage_profit", 0) > 0]
    best = profitable[0] if profitable else None
    avg_profit = round(sum(r.get("arbitrage_profit", 0) for r in all_results) / len(all_results), 2) if all_results else 0

    return {
        "keyword": keyword,
        "amazon_us_price": amazon_price,
        "markets_searched": market_list,
        "results": all_results,
        "best_flip": best,
        "profitable_count": len(profitable),
        "total_markets": len(all_results),
        "avg_profit": avg_profit,
        "exchange_rates": {k: rates.get(k) for k in ["EUR", "GBP", "CAD", "JPY"]},
        "tip": "VAT dahil hesaplanmistir. Gumruk ve kargo maliyetleri haric."
    }

@router.get("/vat-calculator")
async def vat_calculator(
    amazon_price: float = Query(..., description="Amazon satış fiyatı ($)"),
    marketplace: str = Query(..., description="Marketplace (DE/FR/UK/IT/ES/CA/JP)")
):
    marketplace = marketplace.upper()
    vat = VAT_RATES.get(marketplace, 0)
    market_info = AMAZON_MARKETS.get(marketplace, {})
    vat_amount = round(amazon_price * vat, 2)
    net_revenue = round(amazon_price - vat_amount, 2)
    return {
        "marketplace": marketplace,
        "marketplace_name": market_info.get("name", f"Amazon.{marketplace}"),
        "flag": market_info.get("flag", "🌍"),
        "gross_price": amazon_price,
        "vat_rate": f"%{int(vat * 100)}",
        "vat_amount": vat_amount,
        "net_revenue": net_revenue,
        "currency": market_info.get("currency", "EUR"),
        "note": "Amazon VAT'i otomatik tahsil eder. Net geliriniz VAT dusulen tutar."
    }
