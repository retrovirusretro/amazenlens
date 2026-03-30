from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import os
from services.bulk_import import parse_excel_file, process_bulk_asins

router = APIRouter(prefix="/api/bulk", tags=["Bulk Import"])

EASYPARSER_KEY = os.getenv("EASYPARSER_API_KEY", "")
print(f"EASYPARSER KEY: {EASYPARSER_KEY[:8]}...")

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    if not file.filename.endswith(('.csv', '.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Sadece CSV veya Excel dosyası yükleyin")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Dosya boyutu 5 MB'ı geçemez")
    asins = parse_excel_file(content, file.filename)
    
    if not asins:
        raise HTTPException(status_code=400, detail="Geçerli ASIN bulunamadı. Dosyada 'ASIN' kolonu olmalı.")
    
    return {
        "message": f"{len(asins)} ASIN bulundu",
        "asins": asins,
        "preview": asins[:5]
    }

@router.post("/process")
async def process_asins(data: dict):
    asins = data.get("asins", [])
    if not asins:
        raise HTTPException(status_code=400, detail="ASIN listesi boş")
    if len(asins) > 100:
        raise HTTPException(status_code=400, detail="Maksimum 100 ASIN")
    
    results = await process_bulk_asins(asins, EASYPARSER_KEY)
    return results