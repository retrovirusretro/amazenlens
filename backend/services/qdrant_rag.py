"""
AmazenLens RAG Servisi — Qdrant vektör hafızası
Ürün verileri, pazar trendleri ve keyword analiz sonuçlarını
vektör olarak depolar ve Claude context'ine besler.

Bağlantı: localhost:6333 (Docker agent stack)
"""
import os
import json
import httpx
from datetime import datetime

QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

# Koleksiyon isimleri
COLLECTIONS = {
    "products": "amazenlens_products",       # ASIN bazlı ürün özetleri
    "keywords": "amazenlens_keywords",       # Keyword analiz sonuçları
    "trends": "amazenlens_trends",           # Trend verileri
    "niches": "amazenlens_niches",           # Niş analiz raporları
}


# ── Embedding ──────────────────────────────────────────────────────────────────

async def embed_text(text: str) -> list[float]:
    """Anthropic text-embedding ile 1536-dim vektör üret."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": "claude-haiku-4-5-20251001",
                "max_tokens": 1,
                "messages": [{"role": "user", "content": f"Embed: {text[:500]}"}],
            }
        )
    # Anthropic embedding API henüz public değil — OpenAI compat endpoint kullan
    # Şimdilik HuggingFace all-MiniLM-L6-v2 ile fallback
    return await _hf_embed(text)


async def _hf_embed(text: str) -> list[float]:
    """HuggingFace sentence-transformers (ücretsiz, 384-dim)."""
    HF_TOKEN = os.getenv("HF_TOKEN", "")
    headers = {"Content-Type": "application/json"}
    if HF_TOKEN:
        headers["Authorization"] = f"Bearer {HF_TOKEN}"

    async with httpx.AsyncClient(timeout=30, verify=False) as client:
        resp = await client.post(
            "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2",
            headers=headers,
            json={"inputs": text[:512], "options": {"wait_for_model": True}},
        )
        if resp.status_code == 200:
            data = resp.json()
            # Response is list of lists (batch) — take first item
            if isinstance(data, list) and isinstance(data[0], list):
                return data[0]
            return data
    return []


# ── Koleksiyon yönetimi ────────────────────────────────────────────────────────

async def ensure_collection(name: str, vector_size: int = 384):
    """Koleksiyon yoksa oluştur."""
    async with httpx.AsyncClient(timeout=10) as client:
        # Check exists
        r = await client.get(f"{QDRANT_URL}/collections/{name}")
        if r.status_code == 200:
            return True

        # Create
        r = await client.put(
            f"{QDRANT_URL}/collections/{name}",
            json={
                "vectors": {
                    "size": vector_size,
                    "distance": "Cosine",
                }
            }
        )
        return r.status_code in (200, 201)


# ── Yazma ─────────────────────────────────────────────────────────────────────

async def upsert_product(asin: str, data: dict):
    """Ürün verilerini Qdrant'a kaydet."""
    collection = COLLECTIONS["products"]
    await ensure_collection(collection)

    text = f"{data.get('title', '')} {data.get('category', '')} {data.get('description', '')} {asin}"
    vector = await _hf_embed(text)
    if not vector:
        return False

    # ASIN'den sayısal ID üret
    point_id = abs(hash(asin)) % (2**31)

    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.put(
            f"{QDRANT_URL}/collections/{collection}/points",
            json={
                "points": [{
                    "id": point_id,
                    "vector": vector,
                    "payload": {
                        "asin": asin,
                        "title": data.get("title", ""),
                        "category": data.get("category", ""),
                        "price": data.get("price"),
                        "bsr": data.get("bsr"),
                        "rating": data.get("rating"),
                        "review_count": data.get("review_count"),
                        "niche_score": data.get("niche_score"),
                        "saved_at": datetime.utcnow().isoformat(),
                    }
                }]
            }
        )
        return r.status_code == 200


async def upsert_keyword_analysis(keyword: str, analysis: dict):
    """Keyword analiz sonucunu Qdrant'a kaydet."""
    collection = COLLECTIONS["keywords"]
    await ensure_collection(collection)

    text = f"{keyword} {' '.join(analysis.get('suggestions', [])[:20])}"
    vector = await _hf_embed(text)
    if not vector:
        return False

    point_id = abs(hash(keyword)) % (2**31)

    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.put(
            f"{QDRANT_URL}/collections/{collection}/points",
            json={
                "points": [{
                    "id": point_id,
                    "vector": vector,
                    "payload": {
                        "keyword": keyword,
                        "suggestions": analysis.get("suggestions", [])[:30],
                        "search_volume_estimate": analysis.get("search_volume_estimate"),
                        "competition": analysis.get("competition"),
                        "listing_tips": analysis.get("listing_tips", {}),
                        "saved_at": datetime.utcnow().isoformat(),
                    }
                }]
            }
        )
        return r.status_code == 200


# ── Arama ─────────────────────────────────────────────────────────────────────

async def search_similar_products(query: str, limit: int = 5) -> list[dict]:
    """Benzer ürünleri vektör benzerliğiyle bul."""
    collection = COLLECTIONS["products"]
    vector = await _hf_embed(query)
    if not vector:
        return []

    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.post(
            f"{QDRANT_URL}/collections/{collection}/points/search",
            json={"vector": vector, "limit": limit, "with_payload": True}
        )
        if r.status_code == 200:
            return [hit["payload"] for hit in r.json().get("result", [])]
    return []


async def search_keyword_context(query: str, limit: int = 5) -> list[dict]:
    """Benzer keyword analizlerini bul — Claude'a context olarak ver."""
    collection = COLLECTIONS["keywords"]
    vector = await _hf_embed(query)
    if not vector:
        return []

    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.post(
            f"{QDRANT_URL}/collections/{collection}/points/search",
            json={"vector": vector, "limit": limit, "with_payload": True}
        )
        if r.status_code == 200:
            return [hit["payload"] for hit in r.json().get("result", [])]
    return []


# ── RAG Context Builder ────────────────────────────────────────────────────────

async def build_rag_context(query: str) -> str:
    """
    Qdrant'tan ilgili veriyi çek, Claude'a verilecek context metni oluştur.
    Niche score, keyword analiz, ürün karşılaştırmalarında kullanılır.
    """
    products = await search_similar_products(query, limit=3)
    keywords = await search_keyword_context(query, limit=3)

    if not products and not keywords:
        return ""

    context_parts = ["## Relevant Historical Data from Memory\n"]

    if products:
        context_parts.append("### Similar Products Analyzed Before:")
        for p in products:
            context_parts.append(
                f"- {p.get('title', 'Unknown')} (ASIN: {p.get('asin', '?')}) | "
                f"BSR: {p.get('bsr', '?')} | Rating: {p.get('rating', '?')} | "
                f"Niche Score: {p.get('niche_score', '?')}"
            )

    if keywords:
        context_parts.append("\n### Similar Keywords Analyzed Before:")
        for k in keywords:
            tips = k.get("listing_tips", {})
            context_parts.append(
                f"- Keyword: '{k.get('keyword', '?')}' | "
                f"Competition: {k.get('competition', '?')} | "
                f"Title example: {tips.get('title_example', '')[:80]}"
            )

    return "\n".join(context_parts)


async def get_collection_stats() -> dict:
    """Tüm koleksiyonların istatistiklerini döndür."""
    stats = {}
    async with httpx.AsyncClient(timeout=10) as client:
        for key, name in COLLECTIONS.items():
            r = await client.get(f"{QDRANT_URL}/collections/{name}")
            if r.status_code == 200:
                info = r.json().get("result", {})
                stats[key] = {
                    "name": name,
                    "vectors_count": info.get("vectors_count", 0),
                    "status": info.get("status", "unknown"),
                }
            else:
                stats[key] = {"name": name, "vectors_count": 0, "status": "not_created"}
    return stats
