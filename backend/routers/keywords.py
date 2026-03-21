from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.keyword_scanner import analyze_keyword, get_autocomplete

router = APIRouter(prefix="/api/keywords", tags=["Keywords"])

class KeywordRequest(BaseModel):
    keyword: str
    market: str = "US"
    include_de: bool = True

@router.post("/analyze")
async def analyze(req: KeywordRequest):
    if not req.keyword.strip():
        raise HTTPException(status_code=400, detail="Keyword gerekli")
    try:
        result = await analyze_keyword(
            keyword=req.keyword.strip(),
            market=req.market,
            include_de=req.include_de
        )
        return result
    except Exception as e:
        print(f"Keyword analyze error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/autocomplete")
async def autocomplete(keyword: str, market: str = "US"):
    if not keyword.strip():
        return {"suggestions": []}
    try:
        suggestions = await get_autocomplete(keyword.strip(), market)
        return {"suggestions": suggestions}
    except Exception as e:
        return {"suggestions": []}
