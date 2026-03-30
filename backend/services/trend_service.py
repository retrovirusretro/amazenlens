from datetime import datetime
import asyncio
import os
import random

SCRAPERAPI_KEY = os.getenv("SCRAPERAPI_KEY", "")

def _get_pytrends(use_proxy: bool = False):
    """pytrends bağlantısı — ScraperAPI proxy opsiyonel"""
    try:
        from pytrends.request import TrendReq
        if use_proxy and SCRAPERAPI_KEY:
            proxy = f"http://scraperapi:{SCRAPERAPI_KEY}@proxy-server.scraperapi.com:8001"
            proxies = {"https": proxy, "http": proxy}
            try:
                return TrendReq(hl='en-US', tz=360, retries=2, backoff_factor=0.5,
                                requests_args={"proxies": proxies, "verify": False})
            except Exception:
                return TrendReq(hl='en-US', tz=360,
                                requests_args={"proxies": proxies, "verify": False})
        else:
            try:
                return TrendReq(hl='en-US', tz=360, retries=2, backoff_factor=0.5)
            except TypeError:
                return TrendReq(hl='en-US', tz=360)
    except Exception as e:
        print(f"Pytrends init error: {e}")
        return None

def _mock_trend_data(keyword: str, geo: str = '') -> dict:
    """429 veya hata durumunda gerçekçi mock veri"""
    seed = sum(ord(c) for c in keyword)
    random.seed(seed)
    base = random.randint(30, 70)
    monthly = []
    for i in range(12):
        noise = random.randint(-15, 15)
        val = max(5, min(100, base + noise + (i * random.randint(-2, 3))))
        monthly.append(val)
    avg = round(sum(monthly) / len(monthly), 1)
    recent = round(sum(monthly[-3:]) / 3, 1)
    if recent > avg * 1.2:
        direction, direction_tr = "rising", "🔥 Yükselen"
    elif recent < avg * 0.8:
        direction, direction_tr = "falling", "📉 Düşen"
    else:
        direction, direction_tr = "stable", "➡️ Stabil"
    return {
        "keyword": keyword,
        "avg_score": avg,
        "recent_score": recent,
        "trend_score": min(int(recent), 100),
        "direction": direction,
        "direction_tr": direction_tr,
        "monthly": monthly,
        "peak_month": monthly.index(max(monthly)) + 1,
        "is_seasonal": max(monthly) - min(monthly) > 40,
        "seasonality_ratio": round((max(monthly) - min(monthly)) / max(monthly), 2),
        "timeframe": "today 12-m",
        "geo": geo or "Global",
        "mock": True,
    }

def _fetch_trend(pytrends, keyword: str, timeframe: str, geo: str) -> dict:
    """Ortak fetch + parse mantığı"""
    pytrends.build_payload(kw_list=[keyword], timeframe=timeframe, geo=geo)
    interest = pytrends.interest_over_time()
    if interest.empty:
        return None
    values = interest[keyword].tolist()
    avg = sum(values) / len(values) if values else 0
    recent = sum(values[-3:]) / 3 if len(values) >= 3 else avg
    if recent > avg * 1.2:
        direction, direction_tr = "rising", "🔥 Yükselen"
    elif recent < avg * 0.8:
        direction, direction_tr = "falling", "📉 Düşen"
    else:
        direction, direction_tr = "stable", "➡️ Stabil"
    max_v = max(values) if values else 1
    min_v = min(values) if values else 0
    seasonality = (max_v - min_v) / max_v if max_v > 0 else 0
    return {
        "keyword": keyword,
        "avg_score": round(avg, 1),
        "recent_score": round(recent, 1),
        "trend_score": min(int(recent), 100),
        "direction": direction,
        "direction_tr": direction_tr,
        "monthly": values[-12:],
        "interest_over_time": [{"value": v} for v in values],
        "peak_month": values.index(max(values)) + 1 if values else 1,
        "is_seasonal": seasonality > 0.6,
        "seasonality_ratio": round(seasonality, 2),
        "timeframe": timeframe,
        "geo": geo or "Global",
    }

def get_trend_data(keyword: str, timeframe: str = 'today 12-m', geo: str = '') -> dict:
    """Google Trends — 1) ScraperAPI proxy  2) direkt  3) mock fallback"""
    # Önce ScraperAPI proxy ile dene
    if SCRAPERAPI_KEY:
        try:
            pt = _get_pytrends(use_proxy=True)
            if pt:
                result = _fetch_trend(pt, keyword, timeframe, geo)
                if result:
                    print(f"Trends via ScraperAPI proxy: {keyword}")
                    return result
        except Exception as e:
            print(f"ScraperAPI proxy trend error: {e}")

    # Direkt dene
    try:
        pt = _get_pytrends(use_proxy=False)
        if pt:
            result = _fetch_trend(pt, keyword, timeframe, geo)
            if result:
                print(f"Trends direct: {keyword}")
                return result
    except Exception as e:
        print(f"Direct trend error: {e}")

    # Mock fallback
    print(f"Trends mock fallback: {keyword}")
    return _mock_trend_data(keyword, geo)


def get_related_queries(keyword: str) -> dict:
    """İlgili yükselen sorgular"""
    for use_proxy in ([True, False] if SCRAPERAPI_KEY else [False]):
        try:
            pytrends = _get_pytrends(use_proxy=use_proxy)
            if not pytrends:
                continue
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
            print(f"Related queries error (proxy={use_proxy}): {e}")
    # Mock fallback
    return {
        "rising": [
            {"query": f"{keyword} best", "value": "Breakout"},
            {"query": f"{keyword} review", "value": 150},
            {"query": f"buy {keyword}", "value": 90},
        ],
        "top": [
            {"query": f"{keyword} amazon", "value": 100},
            {"query": f"{keyword} price", "value": 85},
            {"query": f"{keyword} 2024", "value": 70},
        ],
        "mock": True,
    }


def compare_keywords(keywords: list, timeframe: str = 'today 12-m') -> dict:
    """Birden fazla keyword karşılaştır (max 5)"""
    keywords = keywords[:5]
    for use_proxy in ([True, False] if SCRAPERAPI_KEY else [False]):
        try:
            pytrends = _get_pytrends(use_proxy=use_proxy)
            if not pytrends:
                continue
            pytrends.build_payload(kw_list=keywords, timeframe=timeframe)
            interest = pytrends.interest_over_time()
            if interest.empty:
                continue
            result = {}
            for kw in keywords:
                if kw in interest.columns:
                    values = interest[kw].tolist()
                    result[kw] = {"avg": round(sum(values)/len(values), 1) if values else 0, "monthly": values[-12:]}
            return {"keywords": keywords, "data": result}
        except Exception as e:
            print(f"Compare error (proxy={use_proxy}): {e}")
    # Mock fallback
    data = {}
    for kw in keywords:
        mock = _mock_trend_data(kw)
        data[kw] = {"avg": mock["avg_score"], "monthly": mock["monthly"]}
    return {"keywords": keywords, "data": data, "mock": True}


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
