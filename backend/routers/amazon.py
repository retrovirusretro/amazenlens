from fastapi import APIRouter, HTTPException, Query
from services.easyparser import search_products, get_product, check_availability
from services.niche_calculator import calculate_niche_score
from typing import List

router = APIRouter(prefix="/api/amazon", tags=["Amazon"])

@router.get("/search")
async def search(
    keyword: str = Query(..., description="Arama kelimesi"),
    page: int = Query(1, description="Sayfa numarası")
):
    results = await search_products(keyword, page)
    return results

@router.get("/product/{asin}")
async def product_detail(asin: str):
    product = await get_product(asin)
    if not product:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")
    
    niche = calculate_niche_score(product)
    product["niche_score"] = niche
    return product

@router.post("/unavailable-scanner")
async def unavailable_scanner(asins: List[str]):
    if len(asins) > 100:
        raise HTTPException(status_code=400, detail="Maksimum 100 ASIN")
    
    results = []
    for asin in asins:
        status = await check_availability(asin)
        results.append(status)
    
    unavailable = [r for r in results if not r["available"]]
    available = [r for r in results if r["available"]]
    
    return {
        "total": len(asins),
        "unavailable_count": len(unavailable),
        "available_count": len(available),
        "unavailable": unavailable,
        "available": available
    }

@router.get("/niche-score/{asin}")
async def niche_score(asin: str):
    product = await get_product(asin)
    if not product:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")
    
    score = calculate_niche_score(product)
    return {
        "asin": asin,
        "title": product.get("title"),
        "price": product.get("price"),
        "niche_score": score
    }