from fastapi import APIRouter, HTTPException
from services.keepa_service import get_keepa_data, get_keepa_batch, get_token_status, get_token_stats

router = APIRouter(prefix="/api/keepa", tags=["Keepa"])

@router.get("/product/{asin}")
async def keepa_product(asin: str, category: str = "default"):
    """ASIN için BSR geçmişi, satış tahmini, Gini, RVI"""
    if not asin.strip():
        raise HTTPException(status_code=400, detail="ASIN gerekli")
    try:
        return await get_keepa_data(asin.strip().upper(), category)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/batch")
async def keepa_batch(data: dict):
    """Birden fazla ASIN için Keepa verisi (max 10)"""
    asins = data.get("asins", [])
    category = data.get("category", "default")
    if not asins:
        raise HTTPException(status_code=400, detail="ASIN listesi gerekli")
    try:
        return await get_keepa_batch(asins, category)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tokens")
async def token_status():
    """Keepa token durumu"""
    return get_token_status()


@router.get("/stats")
async def token_stats():
    """Token tasarruf istatistikleri"""
    return get_token_stats()


@router.get("/chart/{asin}")
async def bsr_chart(asin: str, category: str = "default"):
    """BSR geçmişini Plotly-ready JSON formatında döndür"""
    if not asin.strip():
        raise HTTPException(status_code=400, detail="ASIN gerekli")
    try:
        keepa = await get_keepa_data(asin.strip().upper(), category)
        bsr_history = keepa.get("bsr_history", [])

        if not bsr_history:
            return {"chart": None, "message": "BSR geçmişi bulunamadı"}

        dates = [p["date"] for p in bsr_history]
        bsrs  = [p["bsr"]  for p in bsr_history]

        # Plotly trace formatı — frontend direkt kullanır
        chart = {
            "data": [
                {
                    "x": dates,
                    "y": bsrs,
                    "type": "scatter",
                    "mode": "lines",
                    "name": "BSR",
                    "line": {"color": "#6c63ff", "width": 2},
                    "fill": "tozeroy",
                    "fillcolor": "rgba(108,99,255,0.08)",
                }
            ],
            "layout": {
                "title": f"BSR Geçmişi — {asin}",
                "xaxis": {"title": "Tarih"},
                "yaxis": {"title": "BSR (düşük = iyi)", "autorange": "reversed"},
                "plot_bgcolor": "#ffffff",
                "paper_bgcolor": "#ffffff",
                "margin": {"l": 60, "r": 20, "t": 50, "b": 50},
            }
        }

        # Tahmin ekle
        from services.bsr_forecast_service import forecast_bsr
        forecast = forecast_bsr(bsr_history, category)
        if forecast.get("forecast_90d"):
            from datetime import datetime, timedelta
            last_date = datetime.strptime(dates[-1], "%Y-%m-%d")
            forecast_dates = [
                (last_date + timedelta(days=30)).strftime("%Y-%m-%d"),
                (last_date + timedelta(days=60)).strftime("%Y-%m-%d"),
                (last_date + timedelta(days=90)).strftime("%Y-%m-%d"),
            ]
            forecast_bsrs = [forecast["forecast_30d"], forecast["forecast_60d"], forecast["forecast_90d"]]
            chart["data"].append({
                "x": [dates[-1]] + forecast_dates,
                "y": [bsrs[-1]] + forecast_bsrs,
                "type": "scatter",
                "mode": "lines+markers",
                "name": "Tahmin",
                "line": {"color": "#00d4aa", "width": 2, "dash": "dash"},
            })

        return {"chart": chart, "forecast": forecast, "asin": asin}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/forecast/{asin}")
async def bsr_forecast(asin: str, category: str = "default"):
    """CatBoost/LinearRegression ile 30/60/90 günlük BSR tahmini"""
    if not asin.strip():
        raise HTTPException(status_code=400, detail="ASIN gerekli")
    try:
        keepa = await get_keepa_data(asin.strip().upper(), category)
        bsr_history = keepa.get("bsr_history", [])
        from services.bsr_forecast_service import forecast_bsr
        return forecast_bsr(bsr_history, category)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
