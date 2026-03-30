"""
AmazenLens Playwright Worker
Trendyol + DHgate scraping için ayrı Railway servisi.
Ana backend bu servisi HTTP ile çağırır.

Railway'de ayrı bir service olarak deploy edilir:
  Root Directory: playwright_worker
  Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI(title="AmazenLens Playwright Worker", version="1.0.0")

WORKER_SECRET = os.getenv("WORKER_SECRET", "amazenlens-worker-secret")
BACKEND_ORIGINS = os.getenv("BACKEND_URL", "https://amazenlens-production.up.railway.app")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[BACKEND_ORIGINS, "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _check_secret(secret: str):
    if secret != WORKER_SECRET:
        raise HTTPException(status_code=403, detail="Unauthorized")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "playwright-worker"}


# ─── Trendyol Scraper ────────────────────────────────────────────────────────

@app.post("/scrape/trendyol")
async def scrape_trendyol(data: dict):
    """
    Trendyol'da ürün fiyatı ve stok bilgisi çek.
    Türk arbitraj için kritik — Trendyol → Amazon fiyat farkı tespiti.

    Payload: {"keyword": "yoga mat", "secret": "...", "max_results": 10}
    """
    _check_secret(data.get("secret", ""))
    keyword = data.get("keyword", "")
    max_results = min(data.get("max_results", 10), 20)

    if not keyword:
        raise HTTPException(status_code=400, detail="keyword gerekli")

    try:
        from playwright.async_api import async_playwright
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"]
            )
            page = await browser.new_page()

            # Trendyol arama sayfası
            search_url = f"https://www.trendyol.com/sr?q={keyword.replace(' ', '+')}"
            await page.goto(search_url, wait_until="domcontentloaded", timeout=30000)
            await page.wait_for_timeout(2000)

            products = await page.evaluate("""
                () => {
                    const cards = document.querySelectorAll('.p-card-wrppr');
                    return Array.from(cards).slice(0, 20).map(card => {
                        const name = card.querySelector('.prdct-desc-cntnr-name')?.innerText || '';
                        const brand = card.querySelector('.prdct-desc-cntnr-ttl')?.innerText || '';
                        const price = card.querySelector('.prc-box-dscntd')?.innerText
                                   || card.querySelector('.prc-box-sllng')?.innerText || '';
                        const img = card.querySelector('img')?.src || '';
                        const link = card.querySelector('a')?.href || '';
                        const rating = card.querySelector('.rating-score')?.innerText || '';
                        const ratingCount = card.querySelector('.ratingCount')?.innerText || '';
                        return { name, brand, price, img, link, rating, ratingCount };
                    }).filter(p => p.name);
                }
            """)

            await browser.close()

            # Fiyat parse et (TR format: 1.299,99 TL)
            parsed = []
            for p in products[:max_results]:
                price_raw = p.get("price", "").replace("TL", "").replace(".", "").replace(",", ".").strip()
                try:
                    price_try = float(price_raw)
                except Exception:
                    price_try = 0.0
                parsed.append({**p, "price_try": price_try})

            return {
                "keyword": keyword,
                "results": parsed,
                "count": len(parsed),
                "source": "trendyol"
            }

    except Exception as e:
        print(f"Trendyol scrape error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── DHgate Scraper ──────────────────────────────────────────────────────────

@app.post("/scrape/dhgate")
async def scrape_dhgate(data: dict):
    """
    DHgate'de tedarikçi fiyatı çek.
    Amazon satıcıları için kaynak fiyat tespiti.

    Payload: {"keyword": "yoga mat", "secret": "...", "max_results": 10}
    """
    _check_secret(data.get("secret", ""))
    keyword = data.get("keyword", "")
    max_results = min(data.get("max_results", 10), 20)

    if not keyword:
        raise HTTPException(status_code=400, detail="keyword gerekli")

    try:
        from playwright.async_api import async_playwright
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"]
            )
            page = await browser.new_page()

            search_url = f"https://www.dhgate.com/wholesale/search.do?act=search&searchkey={keyword.replace(' ', '+')}"
            await page.goto(search_url, wait_until="domcontentloaded", timeout=30000)
            await page.wait_for_timeout(2000)

            products = await page.evaluate("""
                () => {
                    const cards = document.querySelectorAll('.gallery-item, .item-info');
                    return Array.from(cards).slice(0, 20).map(card => {
                        const name = card.querySelector('.product-title, .item-title')?.innerText || '';
                        const price = card.querySelector('.item-price, .price-box')?.innerText || '';
                        const img = card.querySelector('img')?.src || '';
                        const link = card.querySelector('a')?.href || '';
                        const minOrder = card.querySelector('.min-order')?.innerText || '';
                        const seller = card.querySelector('.seller-name')?.innerText || '';
                        return { name, price, img, link, minOrder, seller };
                    }).filter(p => p.name);
                }
            """)

            await browser.close()

            return {
                "keyword": keyword,
                "results": products[:max_results],
                "count": len(products[:max_results]),
                "source": "dhgate"
            }

    except Exception as e:
        print(f"DHgate scrape error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8001))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
