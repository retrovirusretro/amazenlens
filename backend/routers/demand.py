from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from services.demand_forecast_service import forecast_demand

router = APIRouter(prefix="/api/demand", tags=["Demand Forecast"])

@router.get("/forecast")
async def demand_forecast(
    keyword: str = Query(..., description="Keyword veya ürün kategorisi"),
    asin: Optional[str] = Query(None, description="ASIN (Keepa BSR geçmişi için)"),
    market: str = Query("US"),
    horizon: int = Query(90, description="Kaç günlük tahmin (max 180)"),
):
    """
    90 günlük talep tahmini.
    Google Trends + NeuralProphet/lineer extrapolasyon + Keepa BSR (opsiyonel)
    """
    if not keyword.strip():
        raise HTTPException(status_code=400, detail="Keyword gerekli")
    horizon = min(horizon, 180)
    try:
        return await forecast_demand(
            keyword=keyword.strip(),
            asin=asin.strip().upper() if asin else None,
            market=market.upper(),
            horizon_days=horizon,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
