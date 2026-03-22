from datetime import datetime
import asyncio

def _get_pytrends():
    """Her istekte yeni bağlantı kur — startup'ta bağlanmaz"""
    try:
        from pytrends.request import TrendReq
        import urllib3
        # urllib3 2.0+ 'method_whitelist' -> 'allowed_methods' olarak degisti
        try:
            return TrendReq(hl='en-US', tz=360, retries=2, backoff_factor=0.5)
        except TypeError:
            # Eski urllib3 fallback
            return TrendReq(hl='en-US', tz=360)
    except Exception as e:
        print(f"Pytrends init error: {e}")
        return None

def get_trend_data(keyword: str, timeframe: str = 'today 12-m', geo: str = '') -> dict:
    """Google Trends verisi — API key gerektirmez"""
    pytrends = _get_pytrends()
    if not pytrends:
        return {"keyword": keyword, "trend": "unavailable", "avg_score": 0,
                "direction": "unknown", "direction_tr": "—", "monthly": []}
    try:
        pytrends.build_payload(kw_list=[keyword], timeframe=timeframe, geo=geo)
        interest = pytrends.interest_over_time()

        if interest.empty:
            return {"keyword": keyword, "trend": "no_data", "avg_score": 0,
                    "direction": "unknown", "direction_tr": "—", "monthly": []}

        values = interest[keyword].tolist()
        avg = sum(values) / len(values) if values else 0
        recent = sum(values[-3:]) / 3 if len(values) >= 3 else avg

        if recent > avg * 1.2:
            direction, direction_tr = "rising", "🔥 Yükselen"
        elif recent < avg * 0.8:
            direction, direction_tr = "falling", "📉 Düşen"
        else:
            direction, direction_tr = "stable", "➡️ Stabil"

        peak_idx = values.index(max(values)) if values else 0

        if len(values) >= 12:
            max_v, min_v = max(values), min(values)
            seasonality = (max_v - min_v) / max_v if max_v > 0 else 0
            is_seasonal = seasonality > 0.6
        else:
            is_seasonal, seasonality = False, 0

        return {
            "keyword": keyword,
            "avg_score": round(avg, 1),
            "recent_score": round(recent, 1),
            "trend_score": min(int(recent), 100),
            "direction": direction,
            "direction_tr": direction_tr,
            "monthly": values[-12:],
            "peak_month": peak_idx + 1,
            "is_seasonal": is_seasonal,
            "seasonality_ratio": round(seasonality, 2),
            "timeframe": timeframe,
            "geo": geo or "Global",
        }
    except Exception as e:
        print(f"Trend error for '{keyword}': {e}")
        return {"keyword": keyword, "trend": "error", "avg_score": 0,
                "direction": "unknown", "direction_tr": "—", "monthly": [], "error": str(e)}


def get_related_queries(keyword: str) -> dict:
    """İlgili yükselen sorgular"""
    pytrends = _get_pytrends()
    if not pytrends:
        return {"rising": [], "top": []}
    try:
        pytrends.build_payload(kw_list=[keyword], timeframe='today 12-m')
        related = pytrends.related_queries()
        data = related.get(keyword, {})
        rising, top = [], []
        if data.get("rising") is not None:
            rising = [{"query": r["query"], "value": r["value"]}
                      for _, r in data["rising"].head(5).iterrows()]
        if data.get("top") is not None:
            top = [{"query": r["query"], "value": r["value"]}
                   for _, r in data["top"].head(5).iterrows()]
        return {"rising": rising, "top": top}
    except Exception as e:
        print(f"Related queries error: {e}")
        return {"rising": [], "top": []}


def compare_keywords(keywords: list, timeframe: str = 'today 12-m') -> dict:
    """Birden fazla keyword karşılaştır (max 5)"""
    keywords = keywords[:5]
    pytrends = _get_pytrends()
    if not pytrends:
        return {"keywords": keywords, "data": {}}
    try:
        pytrends.build_payload(kw_list=keywords, timeframe=timeframe)
        interest = pytrends.interest_over_time()
        if interest.empty:
            return {"keywords": keywords, "data": {}}
        result = {}
        for kw in keywords:
            if kw in interest.columns:
                values = interest[kw].tolist()
                result[kw] = {"avg": round(sum(values)/len(values), 1) if values else 0, "monthly": values[-12:]}
        return {"keywords": keywords, "data": result}
    except Exception as e:
        print(f"Compare error: {e}")
        return {"keywords": keywords, "data": {}, "error": str(e)}


# ─── Kültürel Takvim ─────────────────────────────────────────────────────────
# Her pazar için önemli tarihler ve alışveriş zirveleri

CULTURAL_CALENDAR = {
    "US": [
        {"month": 1,  "event": "New Year Sales",        "boost": 30, "category": "all"},
        {"month": 2,  "event": "Valentine's Day",        "boost": 80, "category": "gifts"},
        {"month": 5,  "event": "Mother's Day",           "boost": 70, "category": "gifts"},
        {"month": 6,  "event": "Father's Day",           "boost": 60, "category": "gifts"},
        {"month": 7,  "event": "Prime Day",              "boost": 90, "category": "all"},
        {"month": 9,  "event": "Back to School",         "boost": 75, "category": "school"},
        {"month": 11, "event": "Black Friday",           "boost": 100,"category": "all"},
        {"month": 12, "event": "Christmas",              "boost": 95, "category": "all"},
    ],
    "DE": [
        {"month": 2,  "event": "Valentinstag",           "boost": 60, "category": "gifts"},
        {"month": 4,  "event": "Ostern",                 "boost": 70, "category": "home"},
        {"month": 5,  "event": "Muttertag",              "boost": 65, "category": "gifts"},
        {"month": 7,  "event": "Prime Day",              "boost": 85, "category": "all"},
        {"month": 10, "event": "Oktoberfest Sezonu",     "boost": 50, "category": "food"},
        {"month": 11, "event": "Black Friday",           "boost": 95, "category": "all"},
        {"month": 12, "event": "Weihnachten",            "boost": 100,"category": "all"},
    ],
    "TR": [
        {"month": 3,  "event": "Ramazan Başlangıcı",    "boost": 70, "category": "food"},
        {"month": 4,  "event": "Ramazan Bayramı",        "boost": 85, "category": "gifts"},
        {"month": 6,  "event": "Kurban Bayramı",         "boost": 80, "category": "all"},
        {"month": 9,  "event": "Okula Dönüş",           "boost": 75, "category": "school"},
        {"month": 11, "event": "Trendyol Efsane Cuma",  "boost": 90, "category": "all"},
        {"month": 12, "event": "Yılbaşı Alışverişi",    "boost": 85, "category": "all"},
    ],
    "FR": [
        {"month": 2,  "event": "Saint-Valentin",         "boost": 65, "category": "gifts"},
        {"month": 5,  "event": "Fête des Mères",         "boost": 70, "category": "gifts"},
        {"month": 6,  "event": "Fête des Pères",         "boost": 55, "category": "gifts"},
        {"month": 7,  "event": "Soldes d'Été",           "boost": 80, "category": "all"},
        {"month": 11, "event": "Black Friday",           "boost": 90, "category": "all"},
        {"month": 12, "event": "Noël",                   "boost": 100,"category": "all"},
    ],
    "JP": [
        {"month": 1,  "event": "New Year (Oshogatsu)",   "boost": 85, "category": "all"},
        {"month": 3,  "event": "Hina Matsuri",           "boost": 50, "category": "gifts"},
        {"month": 5,  "event": "Golden Week",            "boost": 70, "category": "travel"},
        {"month": 7,  "event": "Obon",                   "boost": 60, "category": "gifts"},
        {"month": 11, "event": "Black Friday",           "boost": 80, "category": "all"},
        {"month": 12, "event": "Christmas / Year End",   "boost": 90, "category": "all"},
    ],
    "KR": [
        {"month": 1,  "event": "Seollal (Lunar NY)",     "boost": 85, "category": "gifts"},
        {"month": 9,  "event": "Chuseok",                "boost": 80, "category": "gifts"},
        {"month": 11, "event": "Black Friday",           "boost": 85, "category": "all"},
        {"month": 12, "event": "Christmas",              "boost": 75, "category": "all"},
    ],
}

def get_best_listing_time(keyword: str, market: str = "US") -> dict:
    """
    Keyword ve pazar için en iyi listeleme zamanını hesapla.
    pytrends peak verisi + kültürel takvim birleştirilir.
    """
    from datetime import datetime
    current_month = datetime.now().month

    calendar = CULTURAL_CALENDAR.get(market, CULTURAL_CALENDAR["US"])

    # Keyword kategori tahmini
    keyword_lower = keyword.lower()
    gift_words = ["gift", "present", "hediye", "cadeau", "geschenk", "set", "kit"]
    school_words = ["school", "okul", "notebook", "backpack", "çanta", "kalem"]
    food_words = ["food", "yemek", "mutfak", "kitchen", "kochen"]

    if any(w in keyword_lower for w in gift_words):
        kw_category = "gifts"
    elif any(w in keyword_lower for w in school_words):
        kw_category = "school"
    elif any(w in keyword_lower for w in food_words):
        kw_category = "food"
    else:
        kw_category = "all"

    # İlgili olayları bul
    relevant_events = [
        e for e in calendar
        if e["category"] == kw_category or e["category"] == "all"
    ]

    # En yakın gelecek olaylar (hazırlık süresi: 6-8 hafta önce listelemek lazım)
    upcoming = []
    for event in relevant_events:
        months_away = (event["month"] - current_month) % 12
        if months_away == 0:
            months_away = 12
        ideal_listing_month = (event["month"] - 2) % 12 or 12
        upcoming.append({
            "event": event["event"],
            "event_month": event["month"],
            "ideal_listing_month": ideal_listing_month,
            "months_until_event": months_away,
            "boost_score": event["boost"],
            "urgency": "🔴 Hemen listele!" if months_away <= 2 else
                       "🟡 Hazırlığa başla" if months_away <= 4 else
                       "🟢 Planla"
        })

    # Boosta göre sırala
    upcoming.sort(key=lambda x: (-x["boost_score"], x["months_until_event"]))

    # En iyi ay
    best_event = upcoming[0] if upcoming else None

    # Yıllık fırsat takvimi
    month_names = {
        1: "Ocak", 2: "Şubat", 3: "Mart", 4: "Nisan",
        5: "Mayıs", 6: "Haziran", 7: "Temmuz", 8: "Ağustos",
        9: "Eylül", 10: "Ekim", 11: "Kasım", 12: "Aralık"
    }

    return {
        "market": market,
        "keyword_category": kw_category,
        "current_month": current_month,
        "best_listing_time": {
            "month": best_event["ideal_listing_month"] if best_event else current_month,
            "month_name": month_names.get(best_event["ideal_listing_month"] if best_event else current_month, ""),
            "for_event": best_event["event"] if best_event else "Genel satış",
            "urgency": best_event["urgency"] if best_event else "🟢 Planla",
            "boost_score": best_event["boost_score"] if best_event else 50,
        },
        "upcoming_events": upcoming[:3],
        "all_events": calendar,
    }
