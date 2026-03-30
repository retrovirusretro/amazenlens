# AmazenLens — Açık Kaynak Kaynaklar Rehberi
## GitHub, Gitee, GitVerse ve Diğer Platformlardan Ücretsiz Kaynaklar

**Hazırlanma Tarihi:** Mart 2026  
**Kapsam:** Tüm AmazenLens modülleri için kullanılabilecek açık kaynak kod, kütüphane ve araçlar

---

## 📋 İÇİNDEKİLER

1. [Keyword Scanner Modülü](#1-keyword-scanner)
2. [Niş Skoru Modülü](#2-niş-skoru)
3. [Arbitraj Modülü](#3-arbitraj)
4. [Tedarikçi Finder Modülü](#4-tedarikçi-finder)
5. [SaaS Altyapısı](#5-saas-altyapısı)
6. [Review Analizi Modülü](#6-review-analizi)
7. [Rusya, Çin ve Diğer Ülkeler](#7-diğer-ülke-platformları)
8. [pip ile Kurulabilir Kütüphaneler](#8-pip-kütüphaneleri)

---

## 1. KEYWORD SCANNER

### 🥇 EN DEĞERLİ: Amazon Autocomplete Algoritması

**github.com/TunaYagci/amazon-estimation**
- **Ne yapar:** Amazon autocomplete API ile keyword hacmi 0-100 arası skorlar
- **Dil:** Python
- **Nasıl çalışır:** Binary search ile keyword'ün kaç harfle önerilerde çıktığını ölçer
- **AmazenLens'e uyarlaması:**
```python
# Doğrudan keyword_scanner.py'e entegre edilir
# Amazon autocomplete URL: https://completion.amazon.com/search/complete
# Ücretsiz, API key gerektirmez
```

**github.com/mister0/rate-product-amazon**
- **Ne yapar:** Amazon autocomplete ile keyword "sıcaklık" skoru
- **Dil:** Python, microservis mimarisi
- **AmazenLens'e uyarlaması:** FastAPI endpoint olarak direkt kullanılabilir

**github.com/drawrowfly/amazon-keyword-scraper-go**
- **Ne yapar:** Her keyword için aktif ürün sayısını da hesaplar
- **Dil:** GoLang
- **Not:** Python'a port edilmesi gerekir ama algoritma mantığı değerli

**github.com/rafalf/amazon-search-rank**
- **Ne yapar:** Bir ASIN'in belirli keyword'de kaçıncı sırada olduğunu bulur
- **Dil:** Python + Selenium
- **AmazenLens'e uyarlaması:** Reverse ASIN modülünün temel mantığı

### Amazon Keyword Scraper (Apify)
- **URL:** blog.apify.com/how-to-scrape-amazon-keywords-autocomplete
- **Ne yapar:** Amazon arama çubuğundan keyword scraping
- **Ücretsiz tier:** Mevcut
- **Python kodu:** Dokümantasyonda hazır

---

## 2. NİŞ SKORU

### 🥇 EN DEĞERLİ: Keepa Python Kütüphanesi

**github.com/akaszynski/keepa**
```bash
pip install keepa
```
- **Ne yapar:** Keepa API'nin resmi Python wrapper'ı
- **Özellikler:**
  - BSR geçmişi (2+ yıl)
  - Fiyat geçmişi (Amazon, FBA, FBM ayrı)
  - Review sayısı geçmişi
  - Buy Box geçmişi
  - Satıcı sayısı değişimi
- **AmazenLens'e uyarlaması:** keepa_service.py dosyasına direkt entegre

```python
import keepa
api = keepa.Keepa(KEEPA_API_KEY)
products = api.query('B08N5WRWNW', stats=90, history=True)
bsr_history = products[0]['data']['df_NEW']
```

**github.com/kf106/amazon-bestseller**
- **Ne yapar:** Selenium ile birden fazla Amazon pazarında BSR takibi
- **Dil:** Python + Selenium + ChromeDriver
- **AmazenLens'e uyarlaması:** Cross-market BSR karşılaştırması için

**github.com/eaintkyawthmu/Amazon-Bestseller-Scraper**
- **Ne yapar:** Amazon bestseller sayfasından ürün detayları
- **Dil:** Python + BeautifulSoup

### BSR → Satış Tahmini Formülü (Açık Kaynak Matematiksel Model)
```python
# Power-law formülü - akademik çalışmalardan türetilmiş
# Kategori bazlı k ve alpha değerleri
CATEGORY_PARAMS = {
    "Electronics":     {"k": 3100, "alpha": 0.85},
    "Home & Kitchen":  {"k": 2800, "alpha": 0.82},
    "Sports":          {"k": 1900, "alpha": 0.78},
    "Toys & Games":    {"k": 2200, "alpha": 0.80},
    "Health":          {"k": 1700, "alpha": 0.76},
}

def bsr_to_sales(bsr: int, category: str) -> int:
    params = CATEGORY_PARAMS.get(category, {"k": 2000, "alpha": 0.80})
    return int(params["k"] * (bsr ** -params["alpha"]))
```

---

## 3. ARBİTRAJ

### 🥇 EN DEĞERLİ: PricePoint Arbitrage Engine

**github.com/sburl/PricePoint-Public**
- **Ne yapar:** Amazon + eBay + Facebook fiyat karşılaştırma ve arbitraj fırsatı bulma
- **Dil:** Python
- **Özellikler:**
  - BSR'dan satış tahmini
  - Kar marjı hesaplama
  - Capital allocation optimizasyonu
- **AmazenLens'e uyarlaması:** global_arbitrage.py dosyasına entegre

**github.com/Loag/amazon-ebay-arb**
- **Ne yapar:** Amazon ↔ eBay arbitraj
- **Dil:** Python
- **Gereksinimler:** Amazon PA-API + eBay developer hesabı

**github.com/theriley106/AmazonTextbookArbitrage**
- **Ne yapar:** Fiyat karşılaştırma ve arbitraj fırsat tespiti
- **Dil:** Python

**github.com/PragatiVerma18/amazon-price-tracker-python**
- **Ne yapar:** Fiyat düşünce email bildirimi
- **Dil:** Python + BeautifulSoup
- **AmazenLens'e uyarlaması:** Fiyat/Stok takibi + WhatsApp alert özelliğine

### Fiyat Karşılaştırma Motorları (Çoklu Platform)
**github.com/ash04-creater/Amazon-Flipkart-Price-Comparison-Engine**
- Çoklu platform fiyat karşılaştırma mantığı
- Trendyol karşılaştırmasına uyarlanabilir

---

## 4. TEDARİKÇİ FINDER

### Alibaba Scraper'ları

**github.com/scrapehero/alibaba-scraper** 🥇
- **Ne yapar:** Scrapy spider ile Alibaba arama sayfası
- **Çekilen veriler:** Fiyat, MOQ, tedarikçi adı, doğrulama durumu, sipariş sayısı
- **Dil:** Python + Scrapy
- **AmazenLens'e uyarlaması:** alibaba.py dosyasına entegre

**github.com/ScrapingAnt/alibaba_scraper**
- Rotating proxy + headless Chrome
- Anti-bot korumasını aşıyor
- Production için daha güvenli

**github.com/oxylabs/alibaba-scraper**
- Oxylabs API wrapper
- Yapılandırılmış JSON output

**github.com/poneoneo/Alibaba-CLI-Scraper**
- CLI aracı + AI ile doğal dil sorgusu
- "yoga mat under $5 MOQ 100" gibi sorgular

### AliExpress Scraper'ları

**GitHub Topics: aliexpress-scraper**
- 50+ repo mevcut
- En iyi: Apify DHgate Listings Scraper (Python kodu hazır)

### DHgate için Apify Scraper
```python
# Apify DHgate Listings Scraper - Python kodu
from apify_client import ApifyClient

client = ApifyClient("<TOKEN>")
run_input = {
    "searchUrls": ["https://www.dhgate.com/w/yoga-mat.html"]
}
run = client.actor("piotrv1001/dhgate-listings-scraper").call(run_input=run_input)
for item in client.dataset(run["defaultDatasetId"]).iterate_items():
    print(item)
```

### OpenCV ile Amazon-AliExpress Görsel Eşleştirme
**GitHub: opencv amazon aliexpress compare-images**
- Ürün görselini Amazon'dan alıp AliExpress'te benzerini buluyor
- SnapSearch özelliği için temel mantık!

---

## 5. SAAS ALTYAPISI

### Stripe + Supabase + Vercel

**github.com/vercel/nextjs-subscription-payments** 🥇
- Vercel'in resmi SaaS starter'ı
- Stripe webhook, plan yönetimi, RLS hepsi hazır
- **Referans al:** payments.py için webhook mantığı

**github.com/KolbySisk/next-supabase-stripe-starter**
- TypeScript + Supabase + Stripe
- Metadata ile plan özellikleri yönetimi
- Tip güvenli abonelik kontrolü

**Medium: FastAPI + Supabase + Stripe**
- URL: medium.com/@ojasskapre/implementing-stripe-subscriptions-with-supabase-next-js-and-fastapi
- Birebir aynı stack: FastAPI + Supabase + Stripe
- Tam Python kodu mevcut

### FastAPI Boilerplate'ler

**github.com/fastapi/full-stack-fastapi-template**
- FastAPI + React + PostgreSQL + Docker
- CI/CD dahil production-ready template
- AmazenLens backend için referans

### Rate Limiting
**github.com/laurentS/slowapi** (zaten kullanıyoruz)
```bash
pip install slowapi
```

---

## 6. REVIEW ANALİZİ

**github.com/luminati-io/Amazon-scraper** 🥇
- Review scraping + sentiment
- `bought_past_month` metriği var
- Niş skora eklenebilir

**github.com/berksudan/Sentiment-Analysis-on-E-Commerce**
- Amazon yorumları NLP analizi
- PyQT4 + Python 3 + BeautifulSoup

**Yandex: Natasha (Rusça NLP)**
- github.com/natasha/natasha
- Rusça metin analizi
- Faz 3 Rusya pazarı için

**SpaCy ile E-ticaret NLP (GitHub Topics)**
- react + nlp + spacy + fastapi kombinasyonu mevcut
- Keyword çıkarma, ürün kategorileme

---

## 7. DİĞER ÜLKE PLATFORMLARI

### 🇨🇳 ÇİN — Gitee.com

**Gitee nedir:**
- github.com/mirrors/* altında GitHub repolarının aynası
- Çin'de GitHub alternatifi
- Bazı Çin'e özgü projeler burada

**AmazenLens için Gitee'de bulunabilecekler:**
- 1688.com scraper'ları (Alibaba'nın Çin versiyonu — çok daha ucuz tedarikçiler)
- Taobao fiyat karşılaştırma araçları
- Çince NLP kütüphaneleri

**Gitee'de arama yapılacak terimler:**
```
site:gitee.com 1688 爬虫 python     (1688 scraper)
site:gitee.com 淘宝 价格比较         (Taobao fiyat karşılaştırma)
site:gitee.com 跨境电商 关键词       (cross-border ecommerce keyword)
```

**Önemli Çin açık kaynak araçları:**
- **JD.com scraper** (gitee.com'da mevcut) — JD Çin'in Amazon'u
- **Pinduoduo fiyat tracker** — Çin'in en ucuz e-ticaret sitesi
- **CNKI akademik** — Çin e-ticaret araştırmaları

### 🇷🇺 RUSYA — GitVerse & GitFlic

**GitVerse (Sberbank)**
- URL: gitverse.ru
- GigaCode AI asistanı dahil
- Yandex, Sber açık kaynak projeleri burada

**AmazenLens için değerli Rus açık kaynakları:**

```python
# Natasha - Rusça NLP (Faz 3 için)
pip install natasha
# Rusça ürün isimlerini parse eder, keyword çıkarır

# Razdel - Rusça metin bölme
pip install razdel

# Navec - Rusça word embeddings
pip install navec
```

**GitFlic (Astra Group)**
- URL: gitflic.ru
- Rusya'nın en aktif GitHub alternatifi
- Import/export araçları var

**Yandex açık kaynak projeleri (GitHub'da mevcut):**
- **CatBoost** — BSR ranking modeli için ML kütüphanesi
- **YTsaurus** — Büyük veri işleme
- **Natasha** — Rusça NLP

### 🇰🇷 GÜNEY KORE

**GitHub'da Korece e-ticaret:**
- Coupang scraper'ları (Kore'nin Amazon'u)
- Naver Shopping API wrapper'ları
- **Faz 2 KO dil desteği için:** KoNLPy (Korece NLP)

```bash
pip install konlpy  # Korece keyword analizi
```

### 🇯🇵 JAPONYA

**GitHub'da Japonca e-ticaret:**
- Rakuten API wrapper'ları
- Yahoo Japan Shopping scraper'ları
- **Faz 2 JA dil desteği için:** fugashi, mecab-python3

```bash
pip install fugashi  # Japonca metin analizi
pip install unidic-lite  # Japonca sözlük
```

### 🇩🇪 ALMANYA

**GitHub'da Almanca e-ticaret:**
- Otto.de scraper'ları
- Zalando API wrapper'ları
- **Almanca keyword analizi:**

```bash
pip install spacy
python -m spacy download de_core_news_sm  # Almanca NLP modeli
```

### 🇧🇷 BREZİLYA (Faz 3)

**Mercado Libre API** (resmi, ücretsiz)
- Latin Amerika'nın Amazon'u
- Açık API — authentication gerektiriyor

---

## 8. PIP KÜTÜPHANELERİ

### Hemen Kurulabilir — Ücretsiz

```bash
# === TEMEL ===
pip install keepa              # Keepa API - BSR geçmişi
pip install pytrends           # Google Trends - Trend Radar
pip install python-amazon-paapi # Amazon PA-API wrapper

# === NLP & AI ===
pip install spacy              # NLP - keyword çıkarma
pip install transformers       # HuggingFace - sentiment analizi
pip install nltk               # Doğal dil işleme
pip install textblob           # Basit sentiment analizi

# === SCRAPING ===
pip install scrapy             # Spider framework - Alibaba
pip install playwright         # Headless browser - Trendyol
pip install httpx              # Async HTTP - Easyparser
pip install beautifulsoup4     # HTML parse

# === VERİ ANALİZİ ===
pip install pandas             # Veri işleme
pip install numpy              # Matematiksel hesaplamalar
pip install scipy              # Gini katsayısı hesabı

# === GÖRSEL ===
pip install opencv-python      # SnapSearch - görsel eşleştirme
pip install Pillow             # Görsel işleme

# === DİL DESTEĞİ ===
pip install natasha            # Rusça NLP (Faz 3)
pip install konlpy             # Korece NLP (Faz 2)
pip install fugashi            # Japonca NLP (Faz 2)

# === BACKEND ===
pip install slowapi            # Rate limiting (mevcut)
pip install apscheduler        # Cron jobs - Quick Picks
pip install redis              # Cache - API maliyet düşürme
pip install celery             # Task queue - Bulk işlemler
```

---

## 9. HAZIR KOD ÖRNEKLERİ

### Amazon Autocomplete Keyword Skoru

```python
import httpx
import asyncio
from typing import List

AUTOCOMPLETE_URL = "https://completion.amazon.com/search/complete"

async def get_keyword_score(keyword: str, domain: str = "com") -> int:
    """
    Kaynak: github.com/TunaYagci/amazon-estimation
    Adaptasyon: AmazenLens keyword_scanner.py
    """
    score = 0
    total_weight = 0
    
    async with httpx.AsyncClient(timeout=10) as client:
        for i in range(1, len(keyword) + 1):
            prefix = keyword[:i]
            weight = 1.25 ** (len(keyword) - i)
            total_weight += weight
            
            try:
                resp = await client.get(
                    AUTOCOMPLETE_URL,
                    params={
                        "method": "completion",
                        "search-alias": "aps",
                        "mkt": "1",
                        "q": prefix
                    }
                )
                data = resp.json()
                suggestions = [s.lower() for s in data[1]]
                if keyword.lower() in suggestions:
                    score += weight
            except:
                pass
    
    if total_weight == 0:
        return 0
    return min(int((score / total_weight) * 100), 100)
```

### BSR'dan Satış Tahmini

```python
def bsr_to_monthly_sales(bsr: int, category: str) -> int:
    """
    Kaynak: Akademik power-law modeli
    Jungle Scout / Helium 10'ın kullandığı yöntem
    """
    PARAMS = {
        "Electronics":     (3100, 0.85),
        "Home & Kitchen":  (2800, 0.82),
        "Sports":          (1900, 0.78),
        "Toys":            (2200, 0.80),
        "Health":          (1700, 0.76),
        "Beauty":          (2000, 0.79),
        "Clothing":        (2500, 0.83),
        "default":         (2000, 0.80),
    }
    
    k, alpha = PARAMS.get(category, PARAMS["default"])
    
    if bsr <= 0:
        return 0
    
    sales = int(k * (bsr ** -alpha))
    return max(0, min(sales, 50000))  # Makul sınırlar
```

### Gini Katsayısı (Niş Rekabet Ölçümü)

```python
import numpy as np

def gini_coefficient(revenues: List[float]) -> float:
    """
    Kaynak: Akademik ekonomi literatürü
    Kullanım: Niş rekabet skoru
    Gini < 0.3 = Dağılmış pazar (girilebilir)
    Gini > 0.6 = Konsantre pazar (riskli)
    """
    if not revenues or len(revenues) < 2:
        return 0.0
    
    arr = np.array(sorted(revenues))
    n = len(arr)
    
    if arr.sum() == 0:
        return 0.0
    
    index = np.arange(1, n + 1)
    return (2 * np.sum(index * arr) - (n + 1) * arr.sum()) / (n * arr.sum())
```

### Review Velocity Index (RVI)

```python
def calculate_rvi(
    current_reviews: int,
    reviews_30_days_ago: int,
    reviews_90_days_ago: int
) -> dict:
    """
    Kaynak: AmazenLens özgün metodoloji
    Keepa verisiyle hesaplanır
    """
    monthly_velocity = current_reviews - reviews_30_days_ago
    quarterly_velocity = (current_reviews - reviews_90_days_ago) / 3
    
    trend = "stable"
    if monthly_velocity > quarterly_velocity * 1.3:
        trend = "accelerating"  # İvmeleniyor — iyi işaret
    elif monthly_velocity < quarterly_velocity * 0.7:
        trend = "decelerating"  # Yavaşlıyor — dikkat

    return {
        "monthly_new_reviews": monthly_velocity,
        "avg_monthly_velocity": quarterly_velocity,
        "trend": trend,
        "score": min(int(monthly_velocity / 10), 100)  # 0-100 skor
    }
```

---

## 10. REFERANS LİNKLER

### GitHub
| Repo | Modül | Yıldız |
|------|-------|--------|
| github.com/akaszynski/keepa | Niş Skoru | ⭐⭐⭐⭐⭐ |
| github.com/TunaYagci/amazon-estimation | Keyword | ⭐⭐⭐⭐⭐ |
| github.com/scrapehero/alibaba-scraper | Tedarikçi | ⭐⭐⭐⭐ |
| github.com/sburl/PricePoint-Public | Arbitraj | ⭐⭐⭐⭐ |
| github.com/vercel/nextjs-subscription-payments | SaaS | ⭐⭐⭐⭐⭐ |
| github.com/luminati-io/Amazon-scraper | Review | ⭐⭐⭐⭐ |
| github.com/drawrowfly/amazon-keyword-scraper-go | Keyword | ⭐⭐⭐ |
| github.com/natasha/natasha | Rusça NLP | ⭐⭐⭐⭐ |

### Diğer Platformlar
| Platform | URL | Ne Aranacak |
|----------|-----|-------------|
| Gitee (Çin) | gitee.com | 1688 爬虫, 跨境电商 |
| GitVerse (Rusya) | gitverse.ru | ecommerce, NLP |
| GitFlic (Rusya) | gitflic.ru | Amazon scraper |
| Hugging Face | huggingface.co | Sentiment modelleri |
| PyPI | pypi.org | Tüm pip paketleri |

---

*Bu rehber AmazenLens'in tüm Faz 1-4 modülleri için hazırlanmıştır.*
*Güncelleme: Mart 2026*
