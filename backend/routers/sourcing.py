from fastapi import APIRouter, Query
from services.alibaba import search_suppliers, calculate_profit

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
    alibaba_price: float = Query(..., description="Alibaba alış fiyatı")
):
    return calculate_profit(amazon_price, alibaba_price)