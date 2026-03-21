from datetime import datetime
import asyncio

def _get_pytrends():
    """Her istekte yeni bağlantı kur — startup'ta bağlanmaz"""
    try:
        from pytrends.request import TrendReq
        return TrendReq(hl='en-US', tz=360, retries=2, backoff_factor=0.5)
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
