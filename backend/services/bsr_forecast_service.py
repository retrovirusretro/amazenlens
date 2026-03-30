"""
BSR Tahmin Servisi — CatBoost + LinearRegression
BSR geçmişinden 30/60/90 günlük trend tahmini yapar.

Girdi: Keepa BSR history [{"date": "2024-01-01", "bsr": 15000}, ...]
Çıktı: forecast_30d, forecast_60d, forecast_90d + trend direction
"""
import numpy as np
from datetime import datetime, timedelta

# scikit-learn — lineer trend
try:
    from sklearn.linear_model import LinearRegression, Ridge
    from sklearn.preprocessing import PolynomialFeatures
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False
    print("⚠️ scikit-learn not installed")

# CatBoost — gelişmiş tahmin (yeterli veri varsa)
try:
    from catboost import CatBoostRegressor
    CATBOOST_AVAILABLE = True
except ImportError:
    CATBOOST_AVAILABLE = False
    print("⚠️ catboost not installed")


def _bsr_history_to_arrays(bsr_history: list) -> tuple:
    """BSR geçmişini numpy array'e çevir. X = gün indexi, y = BSR"""
    if not bsr_history:
        return np.array([]), np.array([])

    sorted_history = sorted(bsr_history, key=lambda x: x.get("date", ""))
    X, y = [], []
    base_date = None

    for item in sorted_history:
        try:
            d = datetime.strptime(item["date"], "%Y-%m-%d")
            if base_date is None:
                base_date = d
            days = (d - base_date).days
            bsr = int(item["bsr"])
            if bsr > 0:
                X.append(days)
                y.append(bsr)
        except Exception:
            continue

    return np.array(X, dtype=float), np.array(y, dtype=float)


def _trend_label(current: float, forecast: float) -> str:
    """BSR değişimini yorumla (düşük BSR = iyi)"""
    pct = (forecast - current) / max(current, 1)
    if pct < -0.15:
        return "improving"      # BSR düşüyor → ürün yükseliyor 🔥
    elif pct < -0.05:
        return "slightly_improving"
    elif pct > 0.15:
        return "declining"      # BSR yükseliyor → ürün düşüyor ⚠️
    elif pct > 0.05:
        return "slightly_declining"
    else:
        return "stable"


def forecast_bsr(bsr_history: list, category: str = "default") -> dict:
    """
    BSR geçmişinden 30/60/90 günlük tahmin üret.
    - 3+ nokta varsa LinearRegression
    - 30+ nokta varsa CatBoost (çok daha doğru)
    - Az veri varsa basit moving average
    """
    if not bsr_history:
        return _mock_forecast()

    X, y = _bsr_history_to_arrays(bsr_history)
    n = len(X)

    if n < 3:
        return _mock_forecast()

    current_bsr = int(y[-1])
    last_day = int(X[-1])

    # Volatilite hesapla
    volatility = float(np.std(y) / max(np.mean(y), 1) * 100)

    method = "linear"
    forecast_30, forecast_60, forecast_90 = current_bsr, current_bsr, current_bsr

    # ── CatBoost (30+ nokta) ────────────────────────────────────────────────
    if n >= 30 and CATBOOST_AVAILABLE:
        try:
            method = "catboost"
            # Feature engineering: lag features
            window = min(n, 30)
            features = []
            targets = []
            for i in range(window, n):
                feat = [
                    X[i],
                    y[i-1], y[i-2], y[i-3],                     # lag-1/2/3
                    np.mean(y[max(0,i-7):i]),                     # 7-gün ort
                    np.mean(y[max(0,i-14):i]),                    # 14-gün ort
                    np.std(y[max(0,i-14):i]),                     # volatilite
                ]
                features.append(feat)
                targets.append(y[i])

            model = CatBoostRegressor(
                iterations=100, depth=4, learning_rate=0.1,
                loss_function="RMSE", verbose=False, random_seed=42
            )
            model.fit(np.array(features), np.array(targets))

            # Tahmin için son pencere
            def predict_future(days_ahead: int) -> float:
                last_vals = list(y[-3:])
                last_x = last_day
                for _ in range(days_ahead):
                    feat = [
                        last_x + 1,
                        last_vals[-1], last_vals[-2], last_vals[-3],
                        np.mean(last_vals[-7:]), np.mean(last_vals[-14:]),
                        np.std(last_vals[-14:]) if len(last_vals) >= 14 else volatility,
                    ]
                    pred = float(model.predict([feat])[0])
                    last_vals.append(pred)
                    last_x += 1
                return max(100, pred)

            forecast_30 = int(predict_future(30))
            forecast_60 = int(predict_future(60))
            forecast_90 = int(predict_future(90))

        except Exception as e:
            print(f"CatBoost BSR forecast error: {e} — falling back to linear")
            method = "linear"

    # ── LinearRegression (3-29 nokta) ───────────────────────────────────────
    if method == "linear" and SKLEARN_AVAILABLE:
        try:
            if n >= 10:
                # Polynomial degree-2 for curved trends
                poly = PolynomialFeatures(degree=2, include_bias=False)
                X_poly = poly.fit_transform(X.reshape(-1, 1))
                reg = Ridge(alpha=1.0)
                reg.fit(X_poly, y)
                X_pred = poly.transform(np.array([[last_day + 30], [last_day + 60], [last_day + 90]]))
                preds = reg.predict(X_pred)
            else:
                reg = LinearRegression()
                reg.fit(X.reshape(-1, 1), y)
                preds = reg.predict(np.array([[last_day + 30], [last_day + 60], [last_day + 90]]))

            forecast_30 = max(100, int(preds[0]))
            forecast_60 = max(100, int(preds[1]))
            forecast_90 = max(100, int(preds[2]))

        except Exception as e:
            print(f"LinearRegression BSR error: {e}")

    # ── Simple moving average fallback ──────────────────────────────────────
    if forecast_30 == current_bsr and n >= 3:
        recent_avg = float(np.mean(y[-5:]))
        older_avg = float(np.mean(y[-min(n, 20):-5])) if n > 8 else recent_avg
        slope_per_day = (recent_avg - older_avg) / max(len(y[-20:-5]), 1)
        forecast_30 = max(100, int(current_bsr + slope_per_day * 30))
        forecast_60 = max(100, int(current_bsr + slope_per_day * 60))
        forecast_90 = max(100, int(current_bsr + slope_per_day * 90))
        method = "moving_average"

    trend_30 = _trend_label(current_bsr, forecast_30)
    trend_90 = _trend_label(current_bsr, forecast_90)

    # Confidence — daha fazla veri = daha güvenilir
    confidence = min(95, max(40, 40 + n * 1.5))
    if method == "catboost":
        confidence = min(95, confidence + 15)

    return {
        "current_bsr": current_bsr,
        "forecast_30d": forecast_30,
        "forecast_60d": forecast_60,
        "forecast_90d": forecast_90,
        "trend_30d": trend_30,
        "trend_90d": trend_90,
        "volatility_pct": round(volatility, 1),
        "confidence_pct": round(confidence, 0),
        "data_points": n,
        "method": method,
        "interpretation": _interpret(current_bsr, forecast_90, trend_90, volatility),
    }


def _interpret(current: int, forecast_90: int, trend: str, volatility: float) -> str:
    msgs = {
        "improving":           "BSR 90 günde %15+ düşüyor — ürün ivme kazanıyor, giriş için iyi zaman.",
        "slightly_improving":  "BSR hafifçe iyileşiyor — stabil büyüme sinyali.",
        "stable":              "BSR stabil seyrediyor — güvenli pazar, ani değişim beklenmiyor.",
        "slightly_declining":  "BSR yavaşça yükseliyor — rekabeti izle.",
        "declining":           "BSR 90 günde %15+ yükseliyor — pazar baskısı var, dikkatli ol.",
    }
    base = msgs.get(trend, "")
    if volatility > 40:
        base += " Yüksek volatilite — mevsimsel ürün olabilir."
    return base


def _mock_forecast() -> dict:
    return {
        "current_bsr": 0, "forecast_30d": 0, "forecast_60d": 0, "forecast_90d": 0,
        "trend_30d": "unknown", "trend_90d": "unknown",
        "volatility_pct": 0, "confidence_pct": 0,
        "data_points": 0, "method": "no_data",
        "interpretation": "Yeterli BSR geçmişi bulunamadı.",
    }
