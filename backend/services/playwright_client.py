"""
Playwright Worker İstemcisi
Railway'deki Playwright Worker servisine istek atar.
PLAYWRIGHT_WORKER_URL ve WORKER_SECRET .env'den okunur.
Worker yoksa mock döner.
"""
import os
import httpx

WORKER_URL = os.getenv("PLAYWRIGHT_WORKER_URL", "").rstrip("/")
WORKER_SECRET = os.getenv("WORKER_SECRET", "amazenlens-worker-secret")
TIMEOUT = 60


def _headers():
    return {"x-worker-secret": WORKER_SECRET, "Content-Type": "application/json"}


async def _post(endpoint: str, payload: dict) -> dict | None:
    if not WORKER_URL:
        return None
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT, verify=False) as client:
            resp = await client.post(
                f"{WORKER_URL}{endpoint}",
                json={**payload, "secret": WORKER_SECRET},
                headers=_headers(),
            )
        if resp.status_code == 200:
            return resp.json()
        print(f"[playwright_client] {endpoint} HTTP {resp.status_code}: {resp.text[:200]}")
        return None
    except Exception as e:
        print(f"[playwright_client] {endpoint} error: {e}")
        return None


async def scrape_trendyol(keyword: str, max_results: int = 10) -> dict:
    result = await _post("/scrape/trendyol", {"keyword": keyword, "max_results": max_results})
    if result:
        return result
    # Mock fallback
    return {
        "results": [],
        "source": "trendyol",
        "mock": True,
        "error": "PLAYWRIGHT_WORKER_URL tanımlı değil veya Worker erişilemiyor",
    }


async def scrape_akakce(keyword: str, max_results: int = 10) -> dict:
    result = await _post("/scrape/akakce", {"keyword": keyword, "max_results": max_results})
    if result:
        return result
    return {"results": [], "source": "akakce", "mock": True}


async def scrape_hepsiburada(keyword: str, max_results: int = 10) -> dict:
    result = await _post("/scrape/hepsiburada", {"keyword": keyword, "max_results": max_results})
    if result:
        return result
    return {"results": [], "source": "hepsiburada", "mock": True}


async def scrape_dhgate(keyword: str, max_results: int = 10) -> dict:
    result = await _post("/scrape/dhgate", {"keyword": keyword, "max_results": max_results})
    if result:
        return result
    return {"results": [], "source": "dhgate", "mock": True}


async def scrape_alibaba(keyword: str, max_results: int = 10) -> dict:
    result = await _post("/scrape/alibaba", {"keyword": keyword, "max_results": max_results})
    if result:
        return result
    return {"results": [], "source": "alibaba", "mock": True}
