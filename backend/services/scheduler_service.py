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

async def _daily_quick_picks():
    """
    Günlük Quick Picks hesapla ve Supabase'e kaydet.
    Kullanıcı giriş yapmasa da platform arka planda çalışıyor.
    """
    print(f"[Scheduler] daily_quick_picks başlıyor — {datetime.utcnow().isoformat()}")
    try:
        from supabase import create_client
        sb = create_client(
            os.getenv("SUPABASE_URL", ""),
            os.getenv("SUPABASE_SERVICE_KEY", "")
        )

        # Son 24 saatte en çok aranan keyword'leri al
        since = (datetime.utcnow() - timedelta(hours=24)).isoformat()
        events = sb.table("user_events") \
            .select("metadata") \
            .eq("event_type", "keyword_search") \
            .gte("created_at", since) \
            .limit(200) \
            .execute()

        if not events.data:
            print("[Scheduler] Yeterli event yok, quick picks atlandı")
            return

        # En çok aranan keyword'leri say
        from collections import Counter
        kw_counter = Counter()
        for ev in events.data:
            meta = ev.get("metadata") or {}
            kw = meta.get("keyword", "")
            if kw:
                kw_counter[kw.lower()] += 1

        top_keywords = [kw for kw, _ in kw_counter.most_common(10)]

        # Supabase'e kaydet
        sb.table("quick_picks").upsert({
            "date": datetime.utcnow().strftime("%Y-%m-%d"),
            "top_keywords": top_keywords,
            "generated_at": datetime.utcnow().isoformat(),
            "event_count": len(events.data),
        }).execute()

        print(f"[Scheduler] Quick Picks kaydedildi: {top_keywords[:5]}")

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
