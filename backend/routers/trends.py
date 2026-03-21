from fastapi import APIRouter, HTTPException, Query
from services.trend_service import get_trend_data, get_related_queries, compare_keywords

router = APIRouter(prefix="/api/trends", tags=["Trends"])

@router.get("/keyword")
async def trend_keyword(
    keyword: str = Query(..., description="Arama terimi"),
    timeframe: str = Query("today 12-m", description="today 12-m / today 5-y / today 3-m"),
    geo: str = Query("", description="Boş=Global, US, DE, TR")
):
    """Google Trends verisi — API key gerektirmez"""
    if not keyword.strip():
        raise HTTPException(status_code=400, detail="Keyword gerekli")
    try:
        return get_trend_data(keyword.strip(), timeframe, geo)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/related")
async def related_queries(keyword: str = Query(...)):
    """İlgili yükselen sorgular"""
    try:
        return get_related_queries(keyword.strip())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/compare")
async def compare(data: dict):
    """Birden fazla keyword karşılaştır (max 5)"""
    keywords = data.get("keywords", [])
    timeframe = data.get("timeframe", "today 12-m")
    if not keywords:
        raise HTTPException(status_code=400, detail="Keywords gerekli")
    try:
        return compare_keywords(keywords, timeframe)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
