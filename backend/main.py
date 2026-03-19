from dotenv import load_dotenv
from pathlib import Path
import os

load_dotenv(Path(__file__).parent / ".env")
print("FRONTEND_URL:", os.getenv("FRONTEND_URL"))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="AmazenLens API",
    description="Amazon Ürün Araştırma Platformu",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:5176",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175",
    "http://127.0.0.1:5176",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from routers.amazon import router as amazon_router
from routers.auth import router as auth_router
from routers.sourcing import router as sourcing_router
from routers.bulk import router as bulk_router
from routers.blog import router as blog_router
from routers.reviews import router as reviews_router
from routers.payments import router as payments_router

app.include_router(amazon_router)
app.include_router(auth_router)
app.include_router(sourcing_router)
app.include_router(bulk_router)
app.include_router(blog_router)
app.include_router(reviews_router)
app.include_router(payments_router)

@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}

@app.get("/")
async def root():
    return {"message": "AmazenLens API çalışıyor 🚀", "docs": "/docs"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)