"""
AmazenLens Scheduler — APScheduler ile günlük görevler
main.py startup/shutdown event'ine bağlanır.

Görevler:
  1. daily_quick_picks  — Her sabah 06:00 UTC — top oportunity ASIN'leri hesapla
  2. keepa_cache_prune  — Her gece 02:00 UTC — eski cache kayıtlarını temizle
  3. trend_refresh      — Her 6 saatte bir — pytrends güncelle
"""
import os
import asyncio
from datetime import datetime, timedelta

try:
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    from apscheduler.triggers.cron import CronTrigger
    from apscheduler.triggers.interval import IntervalTrigger
    APSCHEDULER_AVAILABLE = True
except ImportError:
    APSCHEDULER_AVAILABLE = False
    print("⚠️ apscheduler not installed")

_scheduler: "AsyncIOScheduler | None" = None


# ─── JOB FONKSİYONLARI ───────────────────────────────────────────────────────

FALLBACK_KEYWORDS = [
    "yoga mat", "led masa lambası", "resistance bands",
    "protein shaker", "laptop stand", "desk organizer",
]

BADGE_MAP = [
    {"badge": "🔥 Trend",       "badge_bg": "#fff4e0", "badge_color": "#b45309"},
    {"badge": "⭐ Yüksek Skor", "badge_bg": "#e8f0fe", "badge_color": "#0071e3"},
    {"badge": "📈 BSR Düşük",   "badge_bg": "#e8f9ee", "badge_color": "#1a7f37"},
    {"badge": "🆕 Yeni Fırsat", "badge_bg": "#e8f0fe", "badge_color": "#0071e3"},
    {"badge": "🌍 Global",      "badge_bg": "#f3e8ff", "badge_color": "#7c3aed"},
]

def _score_color(score: int) -> str:
    if score >= 85: return "#34c759"
    if score >= 70: return "#0071e3"
    return "#ff9f0a"

async def run_quick_picks() -> dict | None:
    """
    Gerçek EasyParser verisiyle Quick Picks hesapla ve döndür.
    Hem scheduler hem de cache-miss endpoint tarafından çağrılır.
    """
    import random
    from services.easyparser import search_products
    from services.niche_calculator import calculate_niche_score

    # Kullanıcı event'lerinden top keyword'leri almayı dene
    keywords_to_search = []
    try:
        from supabase import create_client
        sb = create_client(
            os.getenv("SUPABASE_URL", ""),
            os.getenv("SUPABASE_SERVICE_KEY", "")
        )
        since = (datetime.utcnow() - timedelta(hours=48)).isoformat()
        events = sb.table("user_events") \
            .select("metadata") \
            .eq("event_type", "keyword_search") \
            .gte("created_at", since) \
            .limit(200) \
            .execute()
        if events.data:
            from collections import Counter
            kw_counter = Counter()
            for ev in events.data:
                meta = ev.get("metadata") or {}
                kw = meta.get("keyword", "")
                if kw:
                    kw_counter[kw.lower()] += 1
            keywords_to_search = [kw for kw, _ in kw_counter.most_common(3)]
    except Exception:
        pass

    if len(keywords_to_search) < 3:
        sampled = random.sample(FALLBACK_KEYWORDS, min(3, len(FALLBACK_KEYWORDS)))
        keywords_to_search = (keywords_to_search + sampled)[:3]

    print(f"[QuickPicks] Aranacak keyword'ler: {keywords_to_search}")

    all_products = []
    for kw in keywords_to_search:
        try:
            result = await search_products(kw)
            products = result.get("results", [])[:5]
            for p in products:
                p["_source_keyword"] = kw
            all_products.extend(products)
            await asyncio.sleep(1)
        except Exception as e:
            print(f"[QuickPicks] '{kw}' arama hatası: {e}")

    if not all_products:
        print("[QuickPicks] Ürün bulunamadı")
        return None

    scored = []
    for p in all_products:
        try:
            niche = calculate_niche_score(p)
            score = niche.get("total_score", 0) if isinstance(niche, dict) else 0
            price = p.get("price", 0)
            if isinstance(price, dict):
                price = price.get("value", price.get("current", 0)) or 0
            bsr = p.get("bsr", p.get("bestseller_rank", 0))
            if isinstance(bsr, list) and bsr:
                bsr = bsr[0].get("rank", 0) if isinstance(bsr[0], dict) else bsr[0]

            badge_info = random.choice(BADGE_MAP)
            scored.append({
                "asin": p.get("asin", ""),
                "title": p.get("title", "")[:80],
                "price": float(price) if price else 0,
                "image": p.get("image", ""),
                "bestseller_rank": int(bsr) if bsr else 0,
                "reviews_count": p.get("reviews_count", p.get("ratings_total", 0)),
                "rating": p.get("rating", p.get("stars", 0)),
                "category": p.get("category", "General"),
                "niche_score": score,
                "score_color": _score_color(score),
                **badge_info,
                "fba": "FBA" if p.get("is_fba") else "FBM",
            })
        except Exception as e:
            print(f"[QuickPicks] niche score hatası: {e}")

    scored.sort(key=lambda x: x["niche_score"], reverse=True)
    top_picks = [p for p in scored if p["asin"]][:8]

    if not top_picks:
        return None

    return {
        "picks": top_picks,
        "total": len(top_picks),
        "date": datetime.utcnow().strftime("%Y-%m-%d"),
        "keywords_scanned": keywords_to_search,
        "mock": False,
    }


async def _daily_quick_picks():
    """Scheduler job: run_quick_picks çalıştır ve Redis'e kaydet."""
    print(f"[Scheduler] daily_quick_picks başlıyor — {datetime.utcnow().isoformat()}")
    try:
        from services.redis_cache import cache_set
        payload = await run_quick_picks()
        if payload:
            await cache_set("quick_picks:daily", payload, "quick_picks")
            print(f"[Scheduler] Quick Picks Redis'e kaydedildi — {len(payload['picks'])} ürün")
        else:
            print("[Scheduler] Quick Picks: veri yok, cache güncellenmedi")
    except Exception as e:
        print(f"[Scheduler] daily_quick_picks hata: {e}")


async def _keepa_cache_prune():
    """7 günden eski Keepa cache kayıtlarını sil"""
    print(f"[Scheduler] keepa_cache_prune başlıyor")
    try:
        from supabase import create_client
        sb = create_client(
            os.getenv("SUPABASE_URL", ""),
            os.getenv("SUPABASE_SERVICE_KEY", "")
        )
        cutoff = (datetime.utcnow() - timedelta(days=7)).isoformat()
        sb.table("review_cache").delete().lt("cached_at", cutoff).execute()
        print(f"[Scheduler] Eski cache kayıtları temizlendi (cutoff: {cutoff[:10]})")
    except Exception as e:
        print(f"[Scheduler] keepa_cache_prune hata: {e}")


async def _trend_refresh():
    """Sık aranan keyword'lerin Google Trends verisini güncelle"""
    print(f"[Scheduler] trend_refresh başlıyor")
    try:
        from supabase import create_client
        sb = create_client(
            os.getenv("SUPABASE_URL", ""),
            os.getenv("SUPABASE_SERVICE_KEY", "")
        )

        row = sb.table("quick_picks") \
            .select("top_keywords") \
            .order("generated_at", desc=True) \
            .limit(1) \
            .maybe_single() \
            .execute()

        if not row.data:
            return

        keywords = row.data.get("top_keywords", [])[:5]
        if not keywords:
            return

        from services.trend_service import get_trend_data
        for kw in keywords:
            try:
                trend = get_trend_data(kw)
                sb.table("trend_cache").upsert({
                    "keyword": kw,
                    "data": trend,
                    "updated_at": datetime.utcnow().isoformat(),
                }).execute()
                await asyncio.sleep(2)  # Google Trends rate limit
            except Exception as e:
                print(f"[Scheduler] trend_refresh '{kw}' hata: {e}")

        print(f"[Scheduler] Trend güncellendi: {keywords}")
    except Exception as e:
        print(f"[Scheduler] trend_refresh hata: {e}")


# ─── BAŞLAT / DURDUR ──────────────────────────────────────────────────────────

def start_scheduler():
    global _scheduler
    if not APSCHEDULER_AVAILABLE:
        print("⚠️ APScheduler bulunamadı, scheduler başlatılmadı")
        return

    _scheduler = AsyncIOScheduler(timezone="UTC")

    # Sabah 06:00 UTC — Quick Picks
    _scheduler.add_job(
        _daily_quick_picks,
        CronTrigger(hour=6, minute=0),
        id="daily_quick_picks",
        replace_existing=True,
        misfire_grace_time=3600,
    )

    # Gece 02:00 UTC — Cache temizleme
    _scheduler.add_job(
        _keepa_cache_prune,
        CronTrigger(hour=2, minute=0),
        id="keepa_cache_prune",
        replace_existing=True,
        misfire_grace_time=3600,
    )

    # Her 6 saatte bir — Trend güncelleme
    _scheduler.add_job(
        _trend_refresh,
        IntervalTrigger(hours=6),
        id="trend_refresh",
        replace_existing=True,
    )

    _scheduler.start()
    print("✅ APScheduler başlatıldı — 3 görev aktif")


def stop_scheduler():
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        print("✅ APScheduler durduruldu")
