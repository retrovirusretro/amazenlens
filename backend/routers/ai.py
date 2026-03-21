from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from services.gemini_service import (
    analyze_buyer_intent,
    optimize_listing,
    bulk_keyword_score,
    score_query_relevance,
)

router = APIRouter(prefix="/api/ai", tags=["AI"])


class BuyerIntentRequest(BaseModel):
    keyword: str
    locale: str = "en"

class ListingRequest(BaseModel):
    title: str
    keywords: List[str]
    category: str = "General"
    locale: str = "en"
    marketplace: str = "Amazon.com"

class BulkKeywordRequest(BaseModel):
    keywords: List[str]

class RelevanceRequest(BaseModel):
    query: str
    product_title: str
    category: str = "General"


@router.post("/buyer-intent")
async def buyer_intent(req: BuyerIntentRequest):
    """Keyword için buyer intent analizi — Gemini 2.5 Flash"""
    if not req.keyword.strip():
        raise HTTPException(status_code=400, detail="Keyword gerekli")
    try:
        return await analyze_buyer_intent(req.keyword.strip(), req.locale)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/listing-optimize")
async def listing_optimize(req: ListingRequest):
    """Listing optimizasyonu — title + bullet + backend keywords"""
    if not req.title.strip():
        raise HTTPException(status_code=400, detail="Title gerekli")
    try:
        return await optimize_listing(
            req.title, req.keywords, req.category, req.locale, req.marketplace
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/bulk-keyword-score")
async def bulk_score(req: BulkKeywordRequest):
    """Toplu keyword skoru — Gemini Flash-Lite (1000 req/gün ücretsiz)"""
    if not req.keywords:
        raise HTTPException(status_code=400, detail="Keywords gerekli")
    if len(req.keywords) > 30:
        raise HTTPException(status_code=400, detail="Maksimum 30 keyword")
    try:
        return await bulk_keyword_score(req.keywords)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/relevance")
async def relevance(req: RelevanceRequest):
    """Query-product alaka skoru — CoT metodolojisi"""
    try:
        return await score_query_relevance(req.query, req.product_title, req.category)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
