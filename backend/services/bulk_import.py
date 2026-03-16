import pandas as pd
import httpx
import asyncio
from typing import List

async def process_asin(asin: str, easyparser_key: str) -> dict:
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(
                "https://api.easyparser.io/amazon/product",
                params={"asin": asin.strip(), "marketplace": "US"},
                headers={"X-API-KEY": easyparser_key}
            )
            if response.status_code == 200:
                data = response.json()
                product = data.get("data", {})
                return {
                    "asin": asin.strip(),
                    "title": product.get("title", ""),
                    "price": product.get("price", 0),
                    "bsr": product.get("bestseller_rank", 0),
                    "reviews": product.get("reviews_count", 0),
                    "rating": product.get("rating", 0),
                    "status": "success"
                }
    except Exception as e:
        pass
    return {"asin": asin.strip(), "status": "error", "error": "API hatası"}

async def process_bulk_asins(asins: List[str], easyparser_key: str) -> dict:
    # Max 100 ASIN
    asins = asins[:100]
    
    # 5'er 5'er işle (rate limit için)
    results = []
    for i in range(0, len(asins), 5):
        batch = asins[i:i+5]
        batch_results = await asyncio.gather(*[
            process_asin(asin, easyparser_key) for asin in batch
        ])
        results.extend(batch_results)
        if i + 5 < len(asins):
            await asyncio.sleep(1)  # Rate limit
    
    success = [r for r in results if r.get("status") == "success"]
    errors = [r for r in results if r.get("status") == "error"]
    
    return {
        "total": len(asins),
        "success": len(success),
        "errors": len(errors),
        "results": results
    }

def parse_excel_file(file_content: bytes, filename: str) -> List[str]:
    import io
    try:
        if filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(file_content))
        else:
            df = pd.read_excel(io.BytesIO(file_content))
        
        # ASIN kolonunu bul
        asin_col = None
        for col in df.columns:
            if 'asin' in col.lower():
                asin_col = col
                break
        
        if asin_col:
            asins = df[asin_col].dropna().astype(str).tolist()
        else:
            # İlk kolonu dene
            asins = df.iloc[:, 0].dropna().astype(str).tolist()
        
        # ASIN formatını doğrula (B ile başlayan 10 karakter)
        valid_asins = [a.strip() for a in asins if len(a.strip()) == 10 and a.strip().startswith('B')]
        return valid_asins[:100]
    except Exception as e:
        print(f"Excel parse error: {e}")
        return []