from fastapi import APIRouter, HTTPException, Query
from services.easyparser import search_products, get_product, check_availability
from services.niche_calculator import calculate_niche_score
from typing import List
import random

router = APIRouter(prefix="/api/amazon", tags=["Amazon"])

# Quick Picks için aranacak keyword'ler
QUICK_PICKS_KEYWORDS = [
    "yoga mat", "silikon mutfak seti", "led masa lambası",
    "resistance bands", "bambu kesme tahtası", "bluetooth kulaklık",
    "protein shaker", "laptop stand", "cable organizer",
    "foam roller", "water bottle", "desk organizer",
]

@router.get("/search")
async def search(
    keyword: str = Query(..., description="Arama kelimesi"),
    page: int = Query(1, description="Sayfa numarası")
):
    results = await search_products(keyword, page)
    return results

@router.get("/product/{asin}")
async def product_detail(asin: str):
    product = await get_product(asin)
    if not product:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")
    niche = calculate_niche_score(product)
    product["niche_score"] = niche
    return product

@router.post("/unavailable-scanner")
async def unavailable_scanner(asins: List[str]):
    if len(asins) > 100:
        raise HTTPException(status_code=400, detail="Maksimum 100 ASIN")
    results = []
    for asin in asins:
        status = await check_availability(asin)
        results.append(status)
    unavailable = [r for r in results if not r["available"]]
    available = [r for r in results if r["available"]]
    return {
        "total": len(asins),
        "unavailable_count": len(unavailable),
        "available_count": len(available),
        "unavailable": unavailable,
        "available": available
    }

@router.get("/niche-score/{asin}")
async def niche_score(asin: str):
    product = await get_product(asin)
    if not product:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")
    score = calculate_niche_score(product)
    return {
        "asin": asin,
        "title": product.get("title"),
        "price": product.get("price"),
        "niche_score": score
    }

@router.get("/quick-picks")
async def quick_picks(limit: int = Query(6, description="Kaç fırsat gösterilsin")):
    """
    Quick Picks — Günün Fırsatları
    Birkaç keyword'de arama yapıp en yüksek niş skorlu ürünleri döndürür.
    Mock modda seed'li rastgele ama tutarlı veri üretir.
    """
    import math
    from datetime import date

    # Günlük seed — her gün farklı ürünler
    today_seed = int(date.today().strftime("%Y%m%d"))

    # Mock Quick Picks — gerçek API'ye gerek yok
    mock_picks = [
        {
            "asin": "B07QK955LS",
            "title": "Silikon Spatula Seti 6 Parça Non-Stick",
            "price": 24.99,
            "image": "https://placehold.co/80x80/0071e3/white?text=S",
            "bestseller_rank": 2340,
            "reviews_count": 1847,
            "rating": 4.6,
            "category": "Home & Kitchen",
            "niche_score": 87,
            "score_color": "#34c759",
            "badge": "🔥 Trend",
            "badge_bg": "#fff4e0",
            "badge_color": "#b45309",
            "est_revenue": "$22K/ay",
            "fba": "FBA",
        },
        {
            "asin": "B08N5WRWNW",
            "title": "LED Masa Lambası USB Şarjlı Dokunmatik 3 Mod",
            "price": 22.99,
            "image": "https://placehold.co/80x80/34c759/white?text=L",
            "bestseller_rank": 3102,
            "reviews_count": 156,
            "rating": 4.2,
            "category": "Electronics",
            "niche_score": 91,
            "score_color": "#0071e3",
            "badge": "⭐ Yüksek Skor",
            "badge_bg": "#e8f0fe",
            "badge_color": "#0071e3",
            "est_revenue": "$18K/ay",
            "fba": "FBA",
        },
        {
            "asin": "B07WDMFGDB",
            "title": "Bambu Kesme Tahtası 3'lü Set Farklı Boyut",
            "price": 29.99,
            "image": "https://placehold.co/80x80/ff9f0a/white?text=B",
            "bestseller_rank": 890,
            "reviews_count": 421,
            "rating": 4.5,
            "category": "Home & Kitchen",
            "niche_score": 78,
            "score_color": "#ff9f0a",
            "badge": "📈 BSR Düşük",
            "badge_bg": "#e8f9ee",
            "badge_color": "#1a7f37",
            "est_revenue": "$31K/ay",
            "fba": "FBA",
        },
        {
            "asin": "B07YHQGNMR",
            "title": "Resistance Bands Set 5 Seviye Egzersiz",
            "price": 18.99,
            "image": "https://placehold.co/80x80/af52de/white?text=R",
            "bestseller_rank": 2450,
            "reviews_count": 3892,
            "rating": 4.7,
            "category": "Sports & Outdoors",
            "niche_score": 74,
            "score_color": "#af52de",
            "badge": "🌍 Global",
            "badge_bg": "#f3e8ff",
            "badge_color": "#7c3aed",
            "est_revenue": "$15K/ay",
            "fba": "FBM",
        },
        {
            "asin": "B083XTFWXS",
            "title": "Protein Shaker Bottle 700ml Leak Proof",
            "price": 15.99,
            "image": "https://placehold.co/80x80/ff3b30/white?text=P",
            "bestseller_rank": 1205,
            "reviews_count": 2341,
            "rating": 4.4,
            "category": "Sports & Outdoors",
            "niche_score": 82,
            "score_color": "#34c759",
            "badge": "🔥 Trend",
            "badge_bg": "#fff4e0",
            "badge_color": "#b45309",
            "est_revenue": "$19K/ay",
            "fba": "FBA",
        },
        {
            "asin": "B09HMKFDZ8",
            "title": "Laptop Stand Adjustable Aluminum Portable",
            "price": 32.99,
            "image": "https://placehold.co/80x80/34aadc/white?text=L",
            "bestseller_rank": 3891,
            "reviews_count": 89,
            "rating": 4.3,
            "category": "Electronics",
            "niche_score": 88,
            "score_color": "#0071e3",
            "badge": "🆕 Yeni Fırsat",
            "badge_bg": "#e8f0fe",
            "badge_color": "#0071e3",
            "est_revenue": "$26K/ay",
            "fba": "FBA",
        },
        {
            "asin": "B07XMPJJK9",
            "title": "Foam Roller High Density Exercise Recovery",
            "price": 19.99,
            "image": "https://placehold.co/80x80/1d1d1f/white?text=F",
            "bestseller_rank": 1780,
            "reviews_count": 678,
            "rating": 4.5,
            "category": "Sports & Outdoors",
            "niche_score": 79,
            "score_color": "#ff9f0a",
            "badge": "📈 BSR Düşük",
            "badge_bg": "#e8f9ee",
            "badge_color": "#1a7f37",
            "est_revenue": "$17K/ay",
            "fba": "FBA",
        },
        {
            "asin": "B08BHXG144",
            "title": "Desk Organizer Bamboo 6 Compartment",
            "price": 26.99,
            "image": "https://placehold.co/80x80/ff9f0a/white?text=D",
            "bestseller_rank": 4210,
            "reviews_count": 234,
            "rating": 4.6,
            "category": "Home & Kitchen",
            "niche_score": 85,
            "score_color": "#34c759",
            "badge": "⭐ Yüksek Skor",
            "badge_bg": "#e8f0fe",
            "badge_color": "#0071e3",
            "est_revenue": "$20K/ay",
            "fba": "FBA",
        },
    ]

    # Günlük seed ile karıştır — her gün farklı sıra
    rng = random.Random(today_seed)
    shuffled = mock_picks.copy()
    rng.shuffle(shuffled)

    # En yüksek niche score önce
    shuffled.sort(key=lambda x: x["niche_score"], reverse=True)

    return {
        "picks": shuffled[:limit],
        "total": len(shuffled),
        "date": str(date.today()),
        "keywords_scanned": QUICK_PICKS_KEYWORDS[:4],
        "mock": True
    }
