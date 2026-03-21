# Keyword Scanner — Hazır Kod Örnekleri
# Kaynak: github.com/TunaYagci/amazon-estimation (uyarlandı)
# github.com/niammus/SearchVolume (uyarlandı)
# github.com/alikilickaya/amazon-search-volume-estimator (uyarlandı)

import httpx
import asyncio
from typing import List, Dict

AUTOCOMPLETE_URL = "https://completion.amazon.com/search/complete"

# ──────────────────────────────────────────────
# 1. TEMEL KEYWORD SKORU (0-100)
# ──────────────────────────────────────────────

async def get_keyword_score(keyword: str, domain: str = "com") -> int:
    """
    Amazon autocomplete API ile keyword arama hacmi tahmini.
    Keyword ne kadar az harfle önerilerde çıkıyorsa o kadar popüler.
    """
    score = 0.0
    total_weight = 0.0
    EXPONENTIAL_FACTOR = 1.25

    async with httpx.AsyncClient(timeout=10) as client:
        substrings = [keyword[:i] for i in range(1, len(keyword) + 1)]
        
        for i, prefix in enumerate(substrings):
            weight = EXPONENTIAL_FACTOR ** (len(keyword) - i - 1)
            total_weight += weight
            
            try:
                resp = await client.get(
                    AUTOCOMPLETE_URL,
                    params={
                        "method": "completion",
                        "search-alias": "aps",
                        "mkt": "1",
                        "q": prefix,
                        "x": "String"
                    },
                    headers={"User-Agent": "Mozilla/5.0"}
                )
                data = resp.json()
                suggestions = [s.lower() for s in data[1]] if len(data) > 1 else []
                
                if keyword.lower() in suggestions:
                    score += weight
                    
            except Exception as e:
                pass  # Hata olursa o prefix'i atla
    
    if total_weight == 0:
        return 0
    
    return min(int((score / total_weight) * 100), 100)


# ──────────────────────────────────────────────
# 2. LONG-TAIL KEYWORD GENİŞLETME
# ──────────────────────────────────────────────

async def get_long_tail_keywords(seed: str, domain: str = "com") -> List[str]:
    """
    Seed keyword'den long-tail keyword listesi üretir.
    Amazon autocomplete'i sistematik şekilde sorgular.
    """
    results = set()
    
    # Alfabe + rakam kombinasyonları
    chars = "abcdefghijklmnopqrstuvwxyz0123456789"
    suffixes = [
        "for", "best", "cheap", "buy", "review", "vs",
        "how to", "under", "with", "without", "top",
        "organic", "large", "small", "heavy", "light",
        "pro", "plus", "set", "kit", "bundle"
    ]
    
    queries = [f"{seed} {s}" for s in suffixes]
    queries += [f"{seed} {c}" for c in chars]
    
    async with httpx.AsyncClient(timeout=10) as client:
        for query in queries[:30]:  # İlk 30 sorguyu çek
            try:
                resp = await client.get(
                    AUTOCOMPLETE_URL,
                    params={
                        "method": "completion",
                        "search-alias": "aps",
                        "mkt": "1",
                        "q": query
                    },
                    headers={"User-Agent": "Mozilla/5.0"}
                )
                data = resp.json()
                if len(data) > 1:
                    for suggestion in data[1]:
                        if suggestion.lower() != seed.lower():
                            results.add(suggestion)
            except:
                pass
            
            await asyncio.sleep(0.1)  # Rate limiting
    
    return list(results)[:50]


# ──────────────────────────────────────────────
# 3. REVERSE ASIN — ASIN'DEN KEYWORD ÇIKARMA
# Kaynak: github.com/rafalf/amazon-search-rank mantığı
# ──────────────────────────────────────────────

async def get_asin_rank_for_keyword(asin: str, keyword: str, pages: int = 3) -> int:
    """
    Bir ASIN'in belirli bir keyword'de Amazon'da kaçıncı sırada olduğunu bulur.
    Easyparser search API kullanır.
    """
    # Bu fonksiyon Easyparser API ile çalışır
    # Easyparser olmadan çalışacak mock versiyonu:
    
    EASYPARSER_KEY = "YOUR_KEY"  # .env'den gelecek
    
    async with httpx.AsyncClient(timeout=30) as client:
        for page in range(1, pages + 1):
            try:
                resp = await client.get(
                    "https://realtime.easyparser.com/v1/request",
                    params={
                        "platform": "AMZ",
                        "operation": "SEARCH",
                        "keyword": keyword,
                        "page": page,
                        "domain": ".com"
                    },
                    headers={"Authorization": f"Bearer {EASYPARSER_KEY}"}
                )
                data = resp.json()
                products = data.get("results", [])
                
                for i, product in enumerate(products):
                    if product.get("asin") == asin:
                        position = (page - 1) * 16 + i + 1  # Sayfa başına ~16 ürün
                        return position
                        
            except Exception as e:
                print(f"Hata: {e}")
    
    return -1  # Bulunamadı


# ──────────────────────────────────────────────
# 4. IQ SKORU HESABI
# Kaynak: Helium 10 Magnet IQ Score mantığı
# ──────────────────────────────────────────────

def calculate_iq_score(volume_score: int, competing_products: int) -> float:
    """
    IQ Score = Arama Hacmi / Rakip Ürün Sayısı
    Yüksek skor = Yüksek talep + Düşük rekabet = Fırsat
    """
    if competing_products <= 0:
        return 0.0
    
    # Normalize et
    normalized_competing = competing_products / 1000
    
    if normalized_competing <= 0:
        return 100.0
    
    iq = volume_score / normalized_competing
    return round(min(iq, 100), 2)


# ──────────────────────────────────────────────
# 5. TITLE DENSITY HESABI
# ──────────────────────────────────────────────

def calculate_title_density(keyword: str, titles: List[str]) -> int:
    """
    İlk sayfadaki kaç ürünün başlığında keyword var?
    Düşük title density = Ranking fırsatı
    """
    keyword_lower = keyword.lower()
    count = sum(1 for title in titles if keyword_lower in title.lower())
    return count


# ──────────────────────────────────────────────
# 6. TAM KEYWORD ANALİZ RAPORU
# ──────────────────────────────────────────────

async def full_keyword_analysis(keyword: str) -> Dict:
    """
    Tek keyword için tam analiz raporu.
    """
    print(f"'{keyword}' analiz ediliyor...")
    
    # 1. Arama hacmi
    volume = await get_keyword_score(keyword)
    
    # 2. Long-tail keyword'ler
    long_tails = await get_long_tail_keywords(keyword)
    
    # 3. Buyer intent tespiti (basit kural bazlı)
    high_intent = ["buy", "best", "cheap", "deal", "discount", "order", "purchase"]
    low_intent  = ["how to", "what is", "review", "vs", "compare", "difference"]
    
    kw_lower = keyword.lower()
    if any(w in kw_lower for w in high_intent):
        buyer_intent = "high"
    elif any(w in kw_lower for w in low_intent):
        buyer_intent = "low"
    else:
        buyer_intent = "medium"
    
    # 4. Fırsat sınıflandırması
    if volume >= 70:
        opportunity = "🔥 Yüksek Hacim"
    elif volume >= 40:
        opportunity = "✅ Orta Hacim"
    else:
        opportunity = "⚠️ Düşük Hacim"
    
    return {
        "keyword": keyword,
        "volume_score": volume,
        "buyer_intent": buyer_intent,
        "opportunity": opportunity,
        "long_tail_count": len(long_tails),
        "top_long_tails": long_tails[:10],
    }


# Test için
if __name__ == "__main__":
    async def test():
        result = await full_keyword_analysis("yoga mat")
        print(result)
    
    asyncio.run(test())
