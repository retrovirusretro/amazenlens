# CLAUDE.md — AmazenLens AI Asistan Rehberi
# Son Güncelleme: Mart 2026 — v3.0

Bu dosyayı her oturumun başında oku. Tüm kararlar burada.

---

## 🎯 Proje Özeti

**AmazenLens** — Amazon satıcıları için global araştırma SaaS platformu.
Helium 10 + Jungle Scout + AMZScout + SmartScout'un en iyi özelliklerini tek platformda birleştiriyor.
Türk kullanıcıya özel: Trendyol arbitrajı + Alibaba entegrasyonu + Türkçe arayüz.

**Hedef:** Global SaaS, yatırım alabilir ölçekte, $100K–$500K seed round hedefi.
**TÜBİTAK BiGG 1512 grant başvurusu** devam ediyor.
**İkinci ürün:** MarketLens TR — Trendyol/Hepsiburada/N11/Çiçeksepeti için kullanıcı veri havuzu modeli.

---

## 🛠️ Tech Stack (Kesin Kararlar)

| Katman | Teknoloji | Notlar |
|--------|-----------|--------|
| Backend | Python 3.11.9 + FastAPI | Railway'de deploy edildi |
| Frontend | React + Vite + CSS Modules | Vercel'de deploy edildi |
| Veritabanı | Supabase (PostgreSQL + RLS) | Tablolar hazır |
| Auth | Supabase Auth | Direkt Supabase calls |
| Ödeme | Stripe | Test mod → Live geçiş yapılıyor |
| Amazon Verisi | Easyparser API (Starter plan) | Webhook desteği onaylandı |
| BSR Geçmişi | Keepa API | pip install keepa |
| AI Ana | Anthropic Claude API | Niş skoru, AI bot |
| AI Ücretsiz | Google Gemini 2.5 Flash | Buyer intent, listing |
| AI Batch | DeepSeek V3 | $0.14/1M token |
| AI NLP | HuggingFace Inference API | Sentiment, ABSA, embedding |
| AI Backup | OpenRouter (Llama 4 Scout) | Fallback zinciri |
| Trend Verisi | pytrends (API key yok) | Google Trends, tamamen ücretsiz |
| Hosting FE | Vercel | Canlı |
| Hosting BE | Railway | amazenlens-production.up.railway.app |
| Dil Desteği | i18next | TR/EN/DE/FR (Faz 1) |
| Dev Araçlar | Cursor / Claude Code | Google Antigravity production için hazır DEĞİL |

---

## 🌐 Canlı URL'ler

- **Backend:** https://amazenlens-production.up.railway.app
- **Frontend:** Vercel (canlı)
- **API Portal (planlı):** https://developers.amazenlens.com
- **RapidAPI (planlı):** API monetizasyonu için

---

## 📁 Proje Yapısı

```
amazenlens/
├── CLAUDE.md
├── docs/
│   ├── spec.md
│   ├── architecture.md
│   └── roadmap.md
├── backend/                   ← Python 3.11.9 FastAPI
│   ├── main.py
│   ├── requirements.txt
│   ├── .python-version        ← 3.11.9 (Railway için kritik)
│   ├── .env
│   ├── routers/
│   │   ├── amazon.py
│   │   ├── niche.py
│   │   ├── sourcing.py
│   │   ├── payments.py
│   │   ├── ai_analysis.py     ← Gemini + Claude endpoints
│   │   └── visual_search.py
│   └── services/
│       ├── easyparser_service.py
│       ├── keepa_service.py
│       ├── gemini_service.py
│       ├── huggingface_service.py
│       ├── deepseek_service.py
│       ├── openrouter_service.py
│       ├── trend_service.py
│       ├── absa_service.py
│       ├── review_helpfulness.py
│       ├── product_potential.py
│       ├── ai_router.py       ← Akıllı model yönlendirme
│       ├── ai_cache.py        ← Redis cache
│       ├── stripe_service.py  ← Key sadece .env'den (hardcode YASAK)
│       ├── niche_calculator.py
│       ├── alibaba.py
│       ├── global_arbitrage.py
│       ├── bulk_import.py     ← pandas kaldırıldı, openpyxl kullanıyor
│       └── sales_estimator.py
└── frontend/                  ← React + Vite
    ├── vite.config.js         ← Proxy: /api/* → Railway URL
    ├── vercel.json            ← Rewrite kuralları
    └── src/
        ├── pages/
        │   ├── AuthPage.jsx
        │   ├── Dashboard.jsx
        │   ├── KeywordScannerPage.jsx
        │   ├── NichePage.jsx
        │   ├── SourcingPage.jsx
        │   ├── ReviewIntelligencePage.jsx  ← Yeni (ABSA)
        │   ├── ListingOptimizerPage.jsx
        │   ├── TrendRadarPage.jsx
        │   ├── BulkPage.jsx
        │   ├── FeedbackPage.jsx
        │   └── PricingPage.jsx
        └── locales/ (tr/en/de/fr)
```

---

## 🔑 Ortam Değişkenleri (.env)

```env
# Mevcut (Railway'de aktif)
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
SUPABASE_ANON_KEY=
STRIPE_SECRET_KEY=          # sk_live_xxx — asla hardcode
STRIPE_WEBHOOK_SECRET=      # whsec_live_xxx
ANTHROPIC_API_KEY=
EASYPARSER_API_KEY=

# Yeni eklenecek (Faz 1)
GEMINI_API_KEY=             # aistudio.google.com — ÜCRETSİZ
HF_API_TOKEN=               # huggingface.co/settings/tokens — ÜCRETSİZ
OPENROUTER_API_KEY=         # openrouter.ai — ÜCRETSİZ tier
DEEPSEEK_API_KEY=           # $0.14/1M token
KEEPA_API_KEY=
REDIS_URL=

# Faz 2
GOOGLE_CLOUD_API_KEY=       # Vision API, Translate API
```

**KRİTİK:** stripe_service.py'de geçmiş hardcode sorunu vardı — düzeltildi. Key asla koda yazılmaz.

---

## 💰 Fiyatlandırma

### SaaS Planları
| Plan | Fiyat | Arama/Gün |
|------|-------|-----------|
| Free | $0 | 5 |
| Starter | $19/ay | 50 |
| Pro | $49/ay | 200 |
| Agency | $99/ay | Sınırsız |

### API Planları (B2B Gelir Kolu)
| Plan | Fiyat | Kota |
|------|-------|------|
| Developer | $49/ay | 5.000 sorgu |
| Startup | $149/ay | 25.000 sorgu |
| Growth | $399/ay | 100.000 sorgu |
| Business | $999/ay | 500.000 sorgu |
| Enterprise | Özel | Sınırsız + SLA |

**Usage-based:** Niş Skoru $0.05 · Keyword $0.02 · Review ABSA $0.10/ASIN

---

## 🤖 AI Mimarisi: Hangi Model Hangi Görev

| Görev | Model | Aylık Maliyet |
|-------|-------|---------------|
| Buyer intent | Gemini 2.5 Flash | $0 |
| Toplu keyword batch | Gemini Flash-Lite | $0 |
| Review sentiment (100+ dil) | HF XLM-RoBERTa | $0 |
| ABSA boyut analizi | HF DeBERTa-ABSA | $0 |
| Listing optimizer | Gemini 2.5 Flash | $0 |
| Trend analizi | pytrends | $0 |
| Keyword embedding | HF MiniLM | $0 |
| Fallback LLM | Llama 4 Scout (OpenRouter) | $0 |
| Niş skoru açıklaması | Claude API | ~$2-5 |
| AI Bot | Claude API | ~$3-8 |
| Bulk keyword | DeepSeek V3 | ~$1-3 |

**Toplam tahmini: $6-16/ay (100 kullanıcıya kadar)**

**Fallback zinciri:** Gemini Flash → Llama 4 Scout → Mistral 7B

**Redis cache:** 24 saat → maliyet %70 düşer

**Gemini uyarısı:** Google Aralık 2025'te kotaları %50-80 kıstı. Production'da tamamen ücretsiz kotaya güvenme. Flash-Lite ile başla, büyüyünce billing aç.

**DeepSeek güvenlik notu:** Çin merkezli. Kullanıcı PII (e-posta, kimlik) asla gönderilmez. Sadece genel içerik üretimi.

---

## 📊 Akademik Temeller

### BSR → Satış (IEEE 2020)
```
Aylık Satış = k × (BSR)^(-α)
Spor: k=1900, α=0.78 | Electronics: k=3100, α=0.85
```

### Niş Rekabet: Gini
- < 0.30: Girilebilir ✅ | 0.30-0.50: Dikkatli | > 0.70: Kaçın 🔴

### ABSA (Springer AI Review 2024 — arXiv:2311.10777)
5 boyut: Fiyat · Kalite · Kargo · Dayanıklılık · Müşteri Hizmetleri
Model: yangheng/deberta-v3-base-absa-v1.1 (HuggingFace, ücretsiz)

### Review Yardımlılık (arXiv:2412.02884)
Ağırlıklar: Görsel %35 · Güvenilirlik %30 · Yaş %20 · Metin %15 → %96.91 doğruluk
Formül: `0.35*img + 0.30*cred + 0.20*age + 0.15*text`

### Cold-Start Ürün Skoru (ScienceDirect 2025)
EfficientNet (görsel) + CatBoost → BSR geçmişi olmadan potansiyel tahmini, baseline +%23

### Talep Tahmini (arXiv:2405.13995)
GAN-Event LSTM + NeuralProphet + pytrends → 90 günlük tahmin + mevsimsellik

### LLM Query-Product Alaka (arXiv:2502.15990)
CoT + ICL + RAG → insan etiketçi seviyesi keyword-ürün alaka skoru

### Multimodal Listing (arXiv:2510.21835)
Görsel → attribute çıkar → listing üret. Hallüsinasyon dramatik azalıyor.

### Amazon Reviews Dataset
McAuley-Lab/Amazon-Reviews-2023 (HuggingFace) — 200M yorum, 29 kategori, ücretsiz

---

## 🔌 API Endpoint'ler (Satılabilecek)

```
POST /v1/niche/score          → Niş skoru (0-100)
POST /v1/keyword/analyze      → Buyer intent + hacim
POST /v1/keyword/expand       → Long-tail expansion
POST /v1/review/absa          → 5 boyut sentiment
POST /v1/review/helpfulness   → Kritik yorum sıralaması
POST /v1/product/potential    → Cold-start ürün skoru
POST /v1/demand/forecast      → 90 günlük talep tahmini
```

**Eksik altyapı (1 haftalık iş):**
- api_keys tablosu (Supabase)
- usage tracking (her çağrıyı logla)
- Stripe metered billing
- developers.amazenlens.com (Swagger UI + key panel)

---

## 🗄️ Supabase Tabloları

**Mevcut:** profiles · search_history · tracked_products · feature_requests · feedback · blog_posts · lens_points · user_events

**Eklenecek:** api_keys · api_usage_logs

**RLS kuralı:** `auth.uid()::text = user_id` (uuid cast şart)

**Blog admin eklemek:**
```sql
UPDATE profiles SET role = 'admin'
WHERE email = 'kullanici@email.com';
```
Ya da: Supabase Dashboard → Authentication → Users → Invite User

---

## 📦 Açık Kaynak Kaynaklar

| Repo / Paket | Kullanım | Öncelik |
|--------------|---------|---------|
| akaszynski/keepa | BSR geçmişi | ⭐⭐⭐⭐⭐ |
| TunaYagci/amazon-estimation | Keyword hacmi | ⭐⭐⭐⭐⭐ |
| vercel/nextjs-subscription-payments | SaaS altyapı | ⭐⭐⭐⭐⭐ |
| scrapehero/alibaba-scraper | Tedarikçi | ⭐⭐⭐⭐ |
| rafalf/amazon-search-rank | Reverse ASIN | ⭐⭐⭐⭐ |
| pytrends | Google Trends | ⭐⭐⭐⭐⭐ |
| catboost (Yandex) | ML ranking | ⭐⭐⭐⭐ |
| neuralprophet | Talep tahmini | ⭐⭐⭐⭐ |

---

## 🌍 Dil ve Pazar Planı

| Faz | Diller | Pazarlar |
|-----|--------|---------|
| Faz 1 | TR/EN/DE/FR | Amazon.com, .de, .com.tr |
| Faz 2 | KO/JA/ES | Amazon.co.jp, Coupang |
| Faz 3 | PT/RU | Mercado Libre, Wildberries |

---

## 🎮 Lens Puanlar (Gamification)

**Kazanma:** feedback +50 · bug raporu +200 · niş analizi +15 · giriş +10 · davet +300
**Harcama:** PDF rapor 300pt · ekstra arama 500pt · Starter 1 ay 2000pt · Pro 1 ay 5000pt
**Supabase:** lens_points tablosu hazır | Demo HTML hazır

---

## 🔲 Chrome Eklentisi

- **Framework:** WXT (Plasmo değil — Parcel bakım sorunu)
- **Standard:** Manifest V3
- **Özellikler:** ASIN tespiti · Niş skoru overlay · Shadow DOM izolasyon · Trendyol karşılaştırması
- **Yayın:** Edge Add-ons ücretsiz (Faz 1 öncelik) · Chrome Web Store $5

---

## 📝 Hazır Blog Yazıları (Word)

1. Yapay Zeka Amazon Satıcılarının Karar Verme Biçimini Nasıl Dönüştürüyor
2. Akademik Referans Kaynakları
3. GitHub'ın Gizli Hazineleri
4. GitHub Açık Kaynak Referans Kütüphanesi
5. Dünyada Açık Kaynak AI Modeller
6. Açık Kaynak Model Referans Kütüphanesi
7. Hangi AI Hangi İş İçin
8. AI Model Referansları
9. Akademik Araştırma Raporu (bu oturum)
10. Ücretsiz AI Modeller Rehberi (bu oturum)

---

## ⚠️ Kritik Kurallar

1. **Stripe/herhangi API key asla hardcode** — sadece `os.getenv()` ile
2. **DeepSeek'e kullanıcı PII gönderilmez** — sadece genel içerik
3. **pandas bulk_import'ta kaldırıldı** — openpyxl + csv kullan
4. **Railway için .python-version = 3.11.9** — 3.13 pydantic-core hatası verir
5. **CORS:** Vercel domain + localhost:5173 (3000 değil)
6. **RLS:** auth.uid()::text = user_id (uuid cast şart)
7. **Google Antigravity:** Production için hazır DEĞİL. Cursor veya Claude Code kullan.
8. **Türkçe e-posta şifresi:** Normal şifre değil, uygulama şifresi kullanılmalı

---

## 🔄 Mevcut Durum (Mart 2026)

### ✅ Tamamlanan
- Backend Railway'de canlı
- Supabase tablolar + RLS hazır
- Stripe checkout çalışıyor (test mod)
- vercel.json rewrite eklendi
- Supabase auth migration tamamlandı
- Lens Puanlar gamification demo hazır
- Feedback + AI bot sayfası demo hazır
- 10 blog yazısı Word olarak hazır
- Akademik araştırma raporu (HTML) hazır
- AI modeller rehberi (HTML) hazır

### 🔄 Devam Eden
- Stripe live mode geçişi
- Easyparser webhook payload bekleniyor
- TÜBİTAK BiGG 1512 başvurusu

### 📋 Yapılacak (Öncelik Sırası)
1. Gemini + HuggingFace entegrasyonu (ai_analysis.py endpoint'leri)
2. Redis cache kurulumu
3. API key sistemi + usage tracking
4. Keyword Scanner sayfası
5. Review Intelligence sayfası (ABSA)
6. Stripe metered billing (API için)
7. developers.amazenlens.com
8. Chrome eklentisi MVP
9. RapidAPI listesi
10. Mobil responsive + DKIM kaydı

---

## 🔄 Bu Dosyayı Ne Zaman Güncelle

Her büyük oturum sonunda "CLAUDE.md'yi güncelle" de.
Yeni özellik · tech stack değişikliği · faz geçişi · kritik karar.
