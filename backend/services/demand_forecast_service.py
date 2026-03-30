"""
Talep Tahmini Servisi
Kaynak: NeuralProphet (arXiv:2111.15397) + pytrends + Keepa BSR geçmişi
"""
import asyncio
import numpy as np
from datetime import datetime, timedelta
from typing import Optional

# NeuralProphet — opsiyonel, yoksa fallback
try:
    from neuralprophet import NeuralProphet
    import pandas as pd
    NEURALPROPHET_AVAILABLE = True
except ImportError:
    NEURALPROPHET_AVAILABLE = False
    print("⚠️ neuralprophet not installed: pip install neuralprophet")

# ─── Basit Trend Extrapolasyon (NeuralProphet yoksa) ─────────────────────────
def simple_trend_forecast(values: list, horizon: int = 90) -> dict:
    """
    NeuralProphet yoksa basit lineer + mevsimsel extrapolasyon.
    values: aylık veri listesi (0-100 arası)
    horizon: kaç gün tahmin
    """
    if not values or len(values) < 3:
        return {"forecast": [], "confidence": "low", "method": "insufficient_data"}

    arr = np.array(values, dtype=float)
    n = len(arr)

    # Lineer trend
    x = np.arange(n)
    slope, intercept = np.polyfit(x, arr, 1)

    # Mevsimsellik tespiti (peak-to-peak fark)
    seasonal_amplitude = (arr.max() - arr.min()) / 2

    # Tahmin — günlük interpolasyon
    days_per_point = 30  # aylık veri
    forecast = []
    today = datetime.now()

    for day in range(1, horizon + 1):
        trend_component = intercept + slope * (n + day / days_per_point)
        # Basit sinüs mevsimselliği
        seasonal = seasonal_amplitude * 0.3 * np.sin(2 * np.pi * day / 365)
        predicted = max(0, min(100, trend_component + seasonal))
        forecast.append({
            "date": (today + timedelta(days=day)).strftime("%Y-%m-%d"),
            "value": round(float(predicted), 1),
        })

    # Trend yönü
    recent_avg = float(np.mean(arr[-3:]))
    older_avg  = float(np.mean(arr[:3]))
    if slope > 0.5:    direction = "rising";  direction_tr = "📈 Yükseliyor"
    elif slope < -0.5: direction = "falling"; direction_tr = "📉 Düşüyor"
    else:               direction = "stable";  direction_tr = "➡️ Stabil"

    return {
        "forecast": forecast,
        "slope": round(float(slope), 3),
        "direction": direction,
        "direction_tr": direction_tr,
        "recent_avg": round(recent_avg, 1),
        "older_avg": round(older_avg, 1),
        "change_pct": round(((recent_avg - older_avg) / max(older_avg, 1)) * 100, 1),
        "confidence": "medium" if len(values) >= 6 else "low",
        "method": "linear_extrapolation",
    }


def neuralprophet_forecast(values: list, dates: list, horizon: int = 90) -> dict:
    """
    NeuralProphet ile 90 günlük tahmin.
    Kaynak: arXiv:2111.15397
    """
    if not NEURALPROPHET_AVAILABLE:
        return simple_trend_forecast(values, horizon)

    try:
        import pandas as pd

        df = pd.DataFrame({"ds": pd.to_datetime(dates), "y": values})
        df = df.dropna()

        if len(df) < 6:
            return simple_trend_forecast(values, horizon)

        model = NeuralProphet(
            epochs=50,
            seasonality_mode="multiplicative",
            yearly_seasonality=True,
            weekly_seasonality=False,
            daily_seasonality=False,
            n_forecasts=horizon,
            n_lags=0,
            learning_rate=0.01,
        )

        model.fit(df, freq="D", progress=None)

        future = model.make_future_dataframe(df, periods=horizon)
        forecast_df = model.predict(future)

        forecast = []
        for _, row in forecast_df.tail(horizon).iterrows():
            forecast.append({
                "date": row["ds"].strftime("%Y-%m-%d"),
                "value": round(max(0, min(100, float(row["yhat1"]))), 1),
            })

        # Trend analizi
        preds = [f["value"] for f in forecast]
        first_week = np.mean(preds[:7])
        last_week  = np.mean(preds[-7:])
        slope = (last_week - first_week) / horizon

        if slope > 0.1:    direction = "rising";  direction_tr = "📈 Yükseliyor"
        elif slope < -0.1: direction = "falling"; direction_tr = "📉 Düşüyor"
        else:               direction = "stable";  direction_tr = "➡️ Stabil"

        return {
            "forecast": forecast,
            "slope": round(float(slope), 3),
            "direction": direction,
            "direction_tr": direction_tr,
            "first_week_avg": round(float(first_week), 1),
            "last_week_avg": round(float(last_week), 1),
            "change_pct": round(((last_week - first_week) / max(first_week, 1)) * 100, 1),
            "confidence": "high",
            "method": "neuralprophet",
        }
    except Exception as e:
        print(f"NeuralProphet error: {e} — fallback to linear")
        return simple_trend_forecast(values, horizon)


# ─── Ana Tahmin Fonksiyonu ────────────────────────────────────────────────────
async def forecast_demand(
    keyword: str,
    asin: Optional[str] = None,
    market: str = "US",
    horizon_days: int = 90,
) -> dict:
    """
    Trend Radar ana fonksiyonu.
    Kombine eder: pytrends + Keepa BSR + NeuralProphet/lineer tahmin
    """
    from datetime import datetime

    # 1. Google Trends verisi
    trend_values = []
    trend_dates  = []
    try:
        from services.trend_service import get_trend_data
        loop = asyncio.get_event_loop()
        trend_raw = await loop.run_in_executor(None, get_trend_data, keyword, "today 12-m", "")
        trend_values = trend_raw.get("monthly", [])
        # Tarih listesi oluştur (aylık)
        today = datetime.now()
        for i in range(len(trend_values), 0, -1):
            d = today - timedelta(days=i * 30)
            trend_dates.append(d.strftime("%Y-%m-%d"))
        trend_meta = {
            "direction": trend_raw.get("direction", "stable"),
            "direction_tr": trend_raw.get("direction_tr", "➡️ Stabil"),
            "is_seasonal": trend_raw.get("is_seasonal", False),
            "seasonality_ratio": trend_raw.get("seasonality_ratio", 0),
            "peak_month": trend_raw.get("peak_month", 0),
            "avg_score": trend_raw.get("avg_score", 0),
            "rising_queries": trend_raw.get("rising_queries", []),
        }
    except Exception as e:
        print(f"Trend fetch error: {e}")
        trend_meta = {"direction": "unknown"}

    # 2. Keepa BSR verisi (opsiyonel)
    bsr_forecast = None
    if asin:
        try:
            from services.keepa_service import get_keepa_data
            keepa_data = await get_keepa_data(asin, "default")
            if keepa_data and not keepa_data.get("mock", True):
                bsr_history = keepa_data.get("bsr_history", [])
                if len(bsr_history) >= 6:
                    # BSR'ı ters çevir (düşük BSR = yüksek satış)
                    max_bsr = max(b["bsr"] for b in bsr_history)
                    bsr_scores = [round((1 - b["bsr"] / max_bsr) * 100, 1) for b in bsr_history]
                    bsr_dates = [b["date"] for b in bsr_history]
                    bsr_forecast = neuralprophet_forecast(bsr_scores, bsr_dates, horizon_days)
                    bsr_forecast["source"] = "keepa_bsr"
        except Exception as e:
            print(f"Keepa forecast error: {e}")

    # 3. Ana tahmin — Trend verisinden
    main_forecast = None
    if len(trend_values) >= 3:
        main_forecast = neuralprophet_forecast(trend_values, trend_dates, horizon_days)
        main_forecast["source"] = "google_trends"
    else:
        # Fallback: trend yönüne göre sabit tahmin
        base = 50
        main_forecast = {
            "forecast": [{"date": (datetime.now() + timedelta(days=i)).strftime("%Y-%m-%d"), "value": base} for i in range(1, horizon_days + 1)],
            "direction": "stable", "direction_tr": "➡️ Stabil",
            "confidence": "low", "method": "fallback",
        }

    # 4. Seasonal opportunity windows
    opportunities = _find_opportunity_windows(main_forecast.get("forecast", []), trend_meta)

    # 5. Giriş tavsiyesi
    recommendation = _generate_recommendation(main_forecast, trend_meta, bsr_forecast)

    return {
        "keyword": keyword,
        "asin": asin,
        "market": market,
        "horizon_days": horizon_days,
        "trend": trend_meta,
        "historical": [
            {"date": trend_dates[i], "value": trend_values[i]}
            for i in range(min(len(trend_dates), len(trend_values)))
        ],
        "forecast": main_forecast,
        "bsr_forecast": bsr_forecast,
        "opportunities": opportunities,
        "recommendation": recommendation,
        "generated_at": datetime.now().isoformat(),
    }


def _find_opportunity_windows(forecast: list, trend_meta: dict) -> list:
    """Tahmin içinde yüksek talep pencerelerini bul"""
    if not forecast:
        return []

    values = [f["value"] for f in forecast]
    avg    = np.mean(values)
    threshold = avg * 1.2  # Ortalamadan %20 yüksek

    windows = []
    in_window = False
    start = None

    for i, f in enumerate(forecast):
        if f["value"] >= threshold and not in_window:
            in_window = True
            start = f["date"]
        elif f["value"] < threshold and in_window:
            in_window = False
            windows.append({
                "start": start,
                "end": forecast[i - 1]["date"],
                "peak_value": round(max(values[forecast.index({"date": start, "value": next(x["value"] for x in forecast if x["date"] == start)}):i]), 1) if start else 0,
                "type": "high_demand",
            })

    return windows[:5]


def _generate_recommendation(forecast: dict, trend_meta: dict, bsr_forecast: Optional[dict]) -> dict:
    """Tahmine göre giriş tavsiyesi üret"""
    direction = forecast.get("direction", "stable")
    change_pct = forecast.get("change_pct", 0)
    is_seasonal = trend_meta.get("is_seasonal", False)
    confidence = forecast.get("confidence", "low")

    if direction == "rising" and change_pct > 10:
        verdict = "🟢 Hemen Gir"
        reason = f"Talep sonraki {forecast.get('horizon_days', 90)} günde %{abs(change_pct)} artış gösteriyor."
        action = "Stok hazırlığına şimdi başla, reklam bütçesi ayır."
    elif direction == "rising":
        verdict = "🟡 İyi Zamanlama"
        reason = "Talep yavaş yükseliyor, giriş için uygun pencere."
        action = "Listing hazırla, küçük stokla test et."
    elif direction == "falling" and change_pct < -15:
        verdict = "🔴 Bekle"
        reason = f"Talep sonraki dönemde %{abs(change_pct)} düşüş gösteriyor."
        action = "Giriş zamanlamasını ertele, dip noktayı bekle."
    elif is_seasonal:
        peak_month = trend_meta.get("peak_month", 0)
        months = {1:"Ocak",2:"Şubat",3:"Mart",4:"Nisan",5:"Mayıs",6:"Haziran",7:"Temmuz",8:"Ağustos",9:"Eylül",10:"Ekim",11:"Kasım",12:"Aralık"}
        verdict = "📅 Zamanla"
        reason = f"Ürün mevsimlik. Peak ay: {months.get(peak_month, 'Bilinmiyor')}."
        action = f"Peak'ten 6-8 hafta önce ürünü listele ve stok hazırla."
    else:
        verdict = "🟡 Nötr"
        reason = "Stabil talep, büyük değişim beklenmiyor."
        action = "Fiyat ve listing kalitesine odaklan."

    return {
        "verdict": verdict,
        "reason": reason,
        "action": action,
        "confidence": confidence,
        "based_on": forecast.get("method", "unknown"),
    }
