from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from services.vision_service import analyze_product_image
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

class NicheReportRequest(BaseModel):
    keyword: str
    locale: str = "en"

class KeywordClusterRequest(BaseModel):
    keywords: List[str]

class ProductDescRequest(BaseModel):
    title: str
    keywords: List[str]
    locale: str = "en"

class ImageAnalysisRequest(BaseModel):
    image_url: str


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


@router.post("/niche-report")
async def niche_report(req: NicheReportRequest):
    """OpenRouter Llama 4 Scout ile niş analiz raporu (ücretsiz)"""
    if not req.keyword.strip():
        raise HTTPException(status_code=400, detail="Keyword gerekli")
    try:
        from services.ai_router import openrouter_niche_report
        return await openrouter_niche_report(req.keyword.strip(), req.locale)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/keyword-cluster")
async def keyword_cluster(req: KeywordClusterRequest):
    """HF sentence-transformers ile semantic keyword kümeleme"""
    if not req.keywords:
        raise HTTPException(status_code=400, detail="Keywords gerekli")
    if len(req.keywords) > 50:
        raise HTTPException(status_code=400, detail="Maksimum 50 keyword")
    try:
        from services.hf_sentiment_service import get_keyword_embeddings, cluster_keywords_by_embedding
        embeddings = await get_keyword_embeddings(req.keywords)
        if not embeddings:
            return {"clusters": [[kw] for kw in req.keywords], "mock": True}
        clusters = cluster_keywords_by_embedding(req.keywords, embeddings)
        return {"clusters": clusters, "total_keywords": len(req.keywords), "total_clusters": len(clusters)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/category-detect")
async def category_detect(data: dict):
    """HF BART zero-shot ile ürün kategori tespiti"""
    title = data.get("title", "")
    if not title:
        raise HTTPException(status_code=400, detail="title gerekli")
    try:
        from services.hf_sentiment_service import classify_product_category
        return await classify_product_category(title)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/batch-keyword-deepseek")
async def batch_keyword_deepseek(req: BulkKeywordRequest):
    """DeepSeek V3 ile toplu keyword skoru — 50 keyword tek call"""
    if not req.keywords:
        raise HTTPException(status_code=400, detail="Keywords gerekli")
    if len(req.keywords) > 50:
        raise HTTPException(status_code=400, detail="Maksimum 50 keyword")
    try:
        from services.deepseek_service import batch_keyword_score as ds_batch
        return {"results": await ds_batch(req.keywords)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/product-description")
async def product_description(req: ProductDescRequest):
    """DeepSeek V3 ile ürün açıklaması oluştur (TR dahil)"""
    if not req.title.strip():
        raise HTTPException(status_code=400, detail="title gerekli")
    try:
        from services.deepseek_service import generate_product_description
        return await generate_product_description(req.title, req.keywords, req.locale)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze-image")
async def analyze_image(req: ImageAnalysisRequest):
    """Ürün görseli analizi — renk, materyal, ambalaj, foto kalitesi (Claude Haiku Vision)"""
    if not req.image_url.startswith("http"):
        raise HTTPException(status_code=400, detail="Geçerli bir URL girin")
    try:
        return await analyze_product_image(req.image_url)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── RAG Endpoints ─────────────────────────────────────────────────────────────

@router.get("/rag/stats")
async def rag_stats():
    """Qdrant koleksiyon istatistikleri."""
    from services.qdrant_rag import get_collection_stats
    return await get_collection_stats()


@router.post("/rag/search")
async def rag_search(req: dict):
    """Qdrant'ta benzer ürün/keyword ara, Claude context metni döndür."""
    query = req.get("query", "")
    if not query:
        raise HTTPException(status_code=400, detail="query gerekli")
    from services.qdrant_rag import build_rag_context
    context = await build_rag_context(query)
    return {"context": context, "has_data": bool(context)}
