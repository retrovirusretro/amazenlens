from fastapi import APIRouter, HTTPException
from services.keepa_service import get_keepa_data, get_keepa_batch, get_token_status

router = APIRouter(prefix="/api/keepa", tags=["Keepa"])

@router.get("/product/{asin}")
async def keepa_product(asin: str, category: str = "default"):
    """ASIN için BSR geçmişi, satış tahmini, Gini, RVI"""
    if not asin.strip():
        raise HTTPException(status_code=400, detail="ASIN gerekli")
    try:
        return await get_keepa_data(asin.strip().upper(), category)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/batch")
async def keepa_batch(data: dict):
    """Birden fazla ASIN için Keepa verisi (max 10)"""
    asins = data.get("asins", [])
    category = data.get("category", "default")
    if not asins:
        raise HTTPException(status_code=400, detail="ASIN listesi gerekli")
    try:
        return await get_keepa_batch(asins, category)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tokens")
async def token_status():
    """Keepa token durumu"""
    return get_token_status()
