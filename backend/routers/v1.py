"""
AmazenLens Public API v1
RapidAPI + direct B2B access
Header: X-API-Key: al_xxxxxxxx
"""
import os
import secrets
import time
from fastapi import APIRouter, HTTPException, Header, Query, Depends
from pydantic import BaseModel
from typing import Optional
from database.supabase import get_supabase

router = APIRouter(prefix="/v1", tags=["Public API v1"])

# ---------- Auth dependency ----------

async def verify_api_key(x_api_key: Optional[str] = Header(None)):
    """Validate API key and check quota."""
    if not x_api_key:
        raise HTTPException(status_code=401, detail="X-API-Key header required")

    supabase = get_supabase()
    res = supabase.table("api_keys").select("*").eq("key", x_api_key).single().execute()
    if not res.data:
        raise HTTPException(status_code=403, detail="Invalid API key")

    key_data = res.data
    if key_data["usage_count"] >= key_data["monthly_limit"]:
        raise HTTPException(status_code=429, detail="Monthly quota exceeded. Upgrade your plan.")

    # Increment usage
    supabase.table("api_keys").update({"usage_count": key_data["usage_count"] + 1}).eq("id", key_data["id"]).execute()

    return key_data


def log_usage(key_id: str, endpoint: str, params: dict, status: int, ms: int):
    try:
        supabase = get_supabase()
        supabase.table("api_usage_logs").insert({
            "api_key_id": key_id,
            "endpoint": endpoint,
            "input_params": params,
            "status_code": status,
            "response_ms": ms,
        }).execute()
    except Exception:
        pass  # logging failure should never break the response


# ---------- Key Management (authenticated users) ----------

class CreateKeyRequest(BaseModel):
    name: str = "Default Key"

@router.post("/keys")
async def create_api_key(req: CreateKeyRequest, authorization: Optional[str] = Header(None)):
    """Create a new API key for the authenticated user."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Bearer token required")

    token = authorization.split(" ")[1]
    supabase = get_supabase()

    # Verify user token
    try:
        user_res = supabase.auth.get_user(token)
        user_id = user_res.user.id
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    # Max 3 keys per user
    existing = supabase.table("api_keys").select("id").eq("user_id", user_id).execute()
    if len(existing.data) >= 3:
        raise HTTPException(status_code=400, detail="Maximum 3 API keys per account")

    new_key = "al_" + secrets.token_urlsafe(32)
    supabase.table("api_keys").insert({
        "user_id": user_id,
        "key": new_key,
        "name": req.name,
        "plan": "free",
        "monthly_limit": 100,
        "usage_count": 0,
    }).execute()

    return {"key": new_key, "name": req.name, "plan": "free", "monthly_limit": 100}


@router.get("/keys")
async def list_api_keys(authorization: Optional[str] = Header(None)):
    """List API keys for the authenticated user."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Bearer token required")

    token = authorization.split(" ")[1]
    supabase = get_supabase()

    try:
        user_res = supabase.auth.get_user(token)
        user_id = user_res.user.id
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    res = supabase.table("api_keys").select("id,name,plan,monthly_limit,usage_count,created_at").eq("user_id", user_id).execute()
    # Never return the actual key value in list
    return {"keys": res.data}


@router.delete("/keys/{key_id}")
async def delete_api_key(key_id: str, authorization: Optional[str] = Header(None)):
    """Delete an API key."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Bearer token required")

    token = authorization.split(" ")[1]
    supabase = get_supabase()

    try:
        user_res = supabase.auth.get_user(token)
        user_id = user_res.user.id
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    supabase.table("api_keys").delete().eq("id", key_id).eq("user_id", user_id).execute()
    return {"success": True}


# ---------- v1 Endpoints ----------

@router.get("/niche/score")
async def niche_score(
    asin: str = Query(..., description="Amazon ASIN (e.g. B07QK955LS)"),
    marketplace: str = Query("US", description="Amazon marketplace: US, DE, UK, FR, ES, IT"),
    use_keepa: bool = Query(True, description="Use Keepa BSR history for enhanced accuracy"),
    key_data: dict = Depends(verify_api_key),
):
    """
    Returns a 0-100 niche score for an Amazon product.
    Combines BSR, Review Velocity Index, Gini coefficient, and profitability signals.
    """
    t0 = time.time()
    try:
        from services.easyparser import get_product
        from services.niche_calculator import calculate_niche_score, calculate_niche_score_with_keepa

        product = await get_product(asin)
        if not product:
            raise HTTPException(status_code=404, detail=f"Product not found: {asin}")

        if use_keepa:
            score = await calculate_niche_score_with_keepa(product)
        else:
            score = calculate_niche_score(product)

        ms = int((time.time() - t0) * 1000)
        log_usage(key_data["id"], "/v1/niche/score", {"asin": asin, "marketplace": marketplace}, 200, ms)

        return {
            "asin": asin,
            "marketplace": marketplace,
            "title": product.get("title"),
            "price": product.get("price"),
            "niche_score": score,
            "response_ms": ms,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/keyword/analyze")
async def keyword_analyze(
    keyword: str = Query(..., description="Seed keyword to analyze"),
    marketplace: str = Query("US", description="Amazon marketplace: US, DE, UK, FR, ES"),
    key_data: dict = Depends(verify_api_key),
):
    """
    Returns keyword intelligence: volume score, buyer intent, IQ score,
    long-tail suggestions, and competition level.
    """
    t0 = time.time()
    try:
        from services.keyword_scanner import analyze_keyword

        result = await analyze_keyword(keyword=keyword.strip(), market=marketplace)

        ms = int((time.time() - t0) * 1000)
        log_usage(key_data["id"], "/v1/keyword/analyze", {"keyword": keyword, "marketplace": marketplace}, 200, ms)

        return {**result, "response_ms": ms}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/review/sentiment")
async def review_sentiment(
    asin: str = Query(..., description="Amazon ASIN"),
    marketplace: str = Query("US", description="Amazon marketplace"),
    key_data: dict = Depends(verify_api_key),
):
    """
    Returns 5-dimensional sentiment analysis (ABSA) for an Amazon product's reviews.
    Dimensions: Quality, Price, Delivery, Features, Customer Service.
    """
    t0 = time.time()
    try:
        from services.review_analyzer import analyze_reviews, get_mock_analysis
        import httpx

        easyparser_key = os.getenv("EASYPARSER_API_KEY", "")
        reviews = []

        if easyparser_key:
            try:
                async with httpx.AsyncClient(timeout=15, verify=False) as client:
                    res = await client.get(
                        "https://api.easyparser.io/amazon/reviews",
                        params={"asin": asin, "marketplace": marketplace, "page": 1},
                        headers={"X-API-KEY": easyparser_key}
                    )
                    if res.status_code == 200:
                        reviews = res.json().get("data", {}).get("reviews", [])
            except Exception:
                pass

        if reviews:
            result = analyze_reviews(reviews)
        else:
            result = get_mock_analysis(asin)

        ms = int((time.time() - t0) * 1000)
        log_usage(key_data["id"], "/v1/review/sentiment", {"asin": asin, "marketplace": marketplace}, 200, ms)

        return {**result, "asin": asin, "response_ms": ms}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/product/detail")
async def product_detail(
    asin: str = Query(..., description="Amazon ASIN"),
    marketplace: str = Query("US", description="Amazon marketplace"),
    key_data: dict = Depends(verify_api_key),
):
    """
    Returns full product detail: title, price, BSR, reviews, images, variants.
    """
    t0 = time.time()
    try:
        from services.easyparser import get_product

        product = await get_product(asin)
        if not product:
            raise HTTPException(status_code=404, detail=f"Product not found: {asin}")

        ms = int((time.time() - t0) * 1000)
        log_usage(key_data["id"], "/v1/product/detail", {"asin": asin, "marketplace": marketplace}, 200, ms)

        return {**product, "response_ms": ms}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------- Health / Info ----------

@router.get("/")
async def api_info():
    return {
        "api": "AmazenLens API",
        "version": "1.0.0",
        "endpoints": [
            "GET /v1/niche/score?asin=&marketplace=",
            "GET /v1/keyword/analyze?keyword=&marketplace=",
            "GET /v1/review/sentiment?asin=&marketplace=",
            "GET /v1/product/detail?asin=&marketplace=",
        ],
        "docs": "https://amazenlens.com/app/api-docs",
        "auth": "X-API-Key header required",
    }
