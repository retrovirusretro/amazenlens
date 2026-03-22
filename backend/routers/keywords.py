from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional
from services.keyword_scanner import (estimate_volume_binary,
    analyze_keyword, get_autocomplete, get_autocomplete_multi,
    asin_reserve_checker, reverse_asin, calc_keyword_difficulty,
    MARKET_CONFIG
)

router = APIRouter(prefix="/api/keywords", tags=["Keywords"])

class KeywordRequest(BaseModel):
    keyword: str
    market: str = "US"
    include_de: bool = True
    markets: Optional[List[str]] = None  # Çoklu pazar desteği

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

@router.get("/multi-market")
async def multi_market(
    keyword: str = Query(...),
    markets: str = Query("US,DE,FR,TR,ES", description="Virgülle ayrılmış pazar listesi")
):
    """Keyword'ü birden fazla pazarda analiz et"""
    if not keyword.strip():
        raise HTTPException(status_code=400, detail="Keyword gerekli")
    try:
        market_list = [m.strip().upper() for m in markets.split(",")]
        market_list = [m for m in market_list if m in MARKET_CONFIG][:6]
        results = await get_autocomplete_multi(keyword.strip(), market_list)
        output = {}
        for market, suggestions in results.items():
            from services.keyword_scanner import estimate_volume, calc_iq_score
            vol = estimate_volume(keyword, suggestions)
            competing = len(suggestions) * 50 + 500
            output[market] = {
                "volume": vol,
                "iq_score": calc_iq_score(vol, competing),
                "suggestions": suggestions[:5],
                "competing_estimate": competing,
                "lang": MARKET_CONFIG.get(market, {}).get("lang", "")
            }
        return {
            "keyword": keyword,
            "markets": output,
            "best_market": max(output.items(), key=lambda x: x[1]["iq_score"])[0] if output else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/asin-reserve")
async def asin_reserve(
    keyword: str = Query(..., description="Hedef keyword"),
    market: str = Query("US", description="Amazon pazarı")
):
    """Keyword'de rank alan rakip ASIN'leri bul"""
    if not keyword.strip():
        raise HTTPException(status_code=400, detail="Keyword gerekli")
    try:
        return await asin_reserve_checker(keyword.strip(), market.upper())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reverse-asin")
async def reverse_asin_endpoint(
    asin: str = Query(..., description="ASIN"),
    market: str = Query("US")
):
    """ASIN → rank aldığı keyword'ler"""
    if not asin.strip():
        raise HTTPException(status_code=400, detail="ASIN gerekli")
    try:
        return await reverse_asin(asin.strip().upper(), market.upper())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/difficulty")
async def keyword_difficulty(
    keyword: str = Query(...),
    market: str = Query("US")
):
    """Keyword difficulty skoru"""
    if not keyword.strip():
        raise HTTPException(status_code=400, detail="Keyword gerekli")
    try:
        suggestions = await get_autocomplete(keyword.strip(), market)
        difficulty = calc_keyword_difficulty(keyword.strip(), suggestions, suggestions)
        return {"keyword": keyword, "market": market, **difficulty}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/markets")
async def list_markets():
    """Desteklenen pazarlar"""
    return {
        "markets": [
            {"code": k, "domain": v["domain"], "lang": v["lang"]}
            for k, v in MARKET_CONFIG.items()
        ]
    }


@router.get("/volume")
async def keyword_volume(
    keyword: str = Query(..., description="Keyword"),
    market: str = Query("US", description="US / DE / FR / TR")
):
    """
    TunaYagci binary search algoritması ile gerçek keyword hacim skoru.
    Kaynak: github.com/TunaYagci/amazon-estimation
    0-100 arası skor: 100 = çok popüler, 0 = aranmıyor
    """
    if not keyword.strip():
        raise HTTPException(status_code=400, detail="Keyword gerekli")
    try:
        score = await estimate_volume_binary(keyword.strip(), market.upper())
        level = "🔥 Çok Yüksek" if score >= 80 else "📈 Yüksek" if score >= 60 else "➡️ Orta" if score >= 40 else "📉 Düşük"
        return {
            "keyword": keyword.strip(),
            "market": market.upper(),
            "volume_score": score,
            "level": level,
            "methodology": "TunaYagci binary search (github.com/TunaYagci/amazon-estimation)"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
