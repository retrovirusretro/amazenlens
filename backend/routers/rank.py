from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional
from services.rank_tracker_service import get_keyword_rank, bulk_rank_check, track_rank_history

router = APIRouter(prefix="/api/rank", tags=["Rank Tracker"])

class BulkRankRequest(BaseModel):
    asin: str
    keywords: List[str]
    market: str = "US"

@router.get("/check")
async def check_rank(
    asin: str = Query(..., description="ASIN"),
    keyword: str = Query(..., description="Keyword"),
    market: str = Query("US"),
    pages: int = Query(3, description="Kaç sayfa taransın (max 5)"),
):
    """ASIN'in keyword'deki rank pozisyonunu bul"""
    if not asin.strip() or not keyword.strip():
        raise HTTPException(status_code=400, detail="ASIN ve keyword gerekli")
    try:
        return await track_rank_history(
            asin=asin.strip().upper(),
            keyword=keyword.strip(),
            market=market.upper(),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/bulk")
async def bulk_rank(req: BulkRankRequest):
    """Birden fazla keyword için rank kontrolü"""
    if not req.asin.strip():
        raise HTTPException(status_code=400, detail="ASIN gerekli")
    if not req.keywords:
        raise HTTPException(status_code=400, detail="En az 1 keyword gerekli")
    try:
        results = await bulk_rank_check(
            asin=req.asin.strip().upper(),
            keywords=req.keywords[:10],
            market=req.market.upper(),
        )
        found = [r for r in results if r.get("found")]
        return {
            "asin": req.asin.upper(),
            "market": req.market.upper(),
            "total_checked": len(results),
            "found_count": len(found),
            "best_rank": min((r["rank"] for r in found), default=None),
            "results": results,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
