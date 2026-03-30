# CLAUDE.md — AmazenLens AI Asistan Rehberi

Bu dosyayı her oturumun başında oku. Tüm kararlar burada.

---

## 🎯 Proje Özeti

**AmazenLens** — Amazon satıcıları için global araştırma SaaS platformu.
Helium 10 + Jungle Scout + AMZScout + SmartScout'un en iyi özelliklerini tek platformda birleştiriyor.
Türk kullanıcıya özel: Trendyol arbitrajı + Alibaba entegrasyonu + Türkçe arayüz.

**Hedef:** Global SaaS, yatırım alabilir ölçekte, $100K–$500K seed round hedefi.
**GitHub:** https://github.com/retrovirusretro/amazenlens

---

## 🛠️ Tech Stack

| Katman | Teknoloji | Notlar |
|--------|-----------|--------|
| Backend | Python 3.11 + FastAPI | Python 3.13/3.14 pydantic-core sorunu var! |
| Frontend | React + Vite | localhost:5173 |
| Veritabanı | Supabase (PostgreSQL) | mnpwuaupqkkgdoryfqlr |
| Auth | Supabase Auth | Google + GitHub OAuth ✅ |
| Ödeme | Stripe 8.0.0 | ✅ ÇALIŞIYOR — webhook + plan güncelleme |
| Amazon Verisi | Easyparser API | Mock modda (100 kredi var) |
| Amazon Fallback | ScraperAPI Structured | Easyparser fiyat=0 döndürünce devreye giriyor |
| Stok Takibi | Keepa API | ~60 token/dk, availabilityAmazon: 0=stokta 3=yok |
| Trend Verisi | pytrends + ScraperAPI proxy | 429 alınca ScraperAPI proxy, son çare mock |
| AI | Claude API | Love/Hate + AI bot + Niş skoru (bireysel hesap) |
| Rate Limiting | slowapi | 200/minute global ✅ |
| Dil Desteği | i18next | TR/EN/DE/FR/ES ✅ Landing + Auth + bazı iç sayfalar |
| Event Tracking | Supabase user_events | ✅ keyword, product_view, niche_score |
| PWA | vite-plugin-pwa | ✅ manifest + service worker + offline cache |
| Chrome Ext. | WXT framework | ✅ Build çalışıyor, overlay Amazon'da görünüyor |
| Hosting FE | Vercel | Henüz deploy edilmedi |
| Hosting BE | Railway | ~$5/ay, henüz deploy edilmedi |

---

## 📁 Proje Yapısı

```
C:\Users\Gökhan Ustaosmanoğlu\amazenlens\
├── CLAUDE.md
├── .gitignore                    ← .env dahil ✅
├── backend/
│   ├── main.py                   ← slowapi rate limiting ✅
│   ├── .env                      ← GitHub'a gitmiyor ✅
│   ├── routers/
│   │   ├── amazon.py             ← Easyparser + ScraperAPI fallback
│   │   ├── auth.py               ← Supabase Auth, 7 gün trial
│   │   ├── sourcing.py
│   │   ├── bulk.py
│   │   ├── blog.py
│   │   ├── reviews.py
│   │   ├── payments.py           ← Stripe checkout + webhook ✅
│   │   └── feedback.py           ← AI bot + Lens puan ✅
│   └── services/
│       ├── easyparser.py         ← Mock modda (100 kredi var)
│       ├── scraperapi_amazon.py  ← Fallback: fiyat=0 veya başlık boş ise
│       ├── keepa_service.py      ← Stok takibi, availabilityAmazon
│       ├── trend_service.py      ← pytrends, ScraperAPI proxy, mock fallback
│       ├── niche_calculator.py
│       ├── review_analyzer.py
│       ├── alibaba.py            ← Mock Türk tedarikçi verisi
│       ├── global_arbitrage.py   ← SSL verify=False ✅
│       ├── playwright_client.py  ← Trendyol scraping (PLAYWRIGHT_WORKER_URL yoksa mock)
│       ├── bulk_import.py
│       └── stripe_service.py     ← .env'den okuyor ✅
├── extension/                    ← WXT Chrome Extension
│   ├── entrypoints/
│   │   ├── popup/                ← Popup UI
│   │   ├── background.ts         ← Service worker
│   │   └── content/index.tsx     ← Amazon sayfasında overlay (content script)
│   └── .output/chrome-mv3/       ← Build çıktısı buraya
└── frontend/src/
    ├── App.jsx                   ← /app/... route yapısı ✅
    ├── main.jsx                  ← i18n import ✅
    ├── i18n.js                   ← i18next config ✅
    ├── locales/                  ← tr/en/de/fr/es.json ✅
    ├── lib/
    │   ├── api.js
    │   └── analytics.js          ← Event tracking ✅
    ├── components/
    │   ├── Layout.jsx            ← /app/... linkler, Stok Takibi eklendi ✅
    │   └── LanguageSwitcher.jsx  ← 5 dil seçici ✅
    └── pages/
        ├── LandingPage.jsx       ← V3 Bold Gradient, i18n ✅
        ├── AuthPage.jsx          ← Google+GitHub OAuth, i18n ✅
        ├── Dashboard.jsx         ← Plan Supabase'den çekiliyor ✅
        ├── SearchPage.jsx        ← CategoryDrillDown hover 3-seviye ✅
        ├── ProductPage.jsx       ← Event tracking ✅
        ├── NichePage.jsx         ← Event tracking ✅
        ├── UnavailablePage.jsx   ← 3 sekme (ASIN/Keyword/Kategori)
        ├── SourcingPage.jsx
        ├── BulkPage.jsx
        ├── TrendRadarPage.jsx    ← Google Trends, SVG chart, ScraperAPI proxy ✅
        ├── BlogPage.jsx / BlogPostPage.jsx / BlogAdminPage.jsx
        ├── CalculatorPage.jsx
        ├── PricingPage.jsx
        ├── FeedbackPage.jsx      ← AI bot ✅
        ├── ApiDocsPage.jsx       ← Yeni ✅
        ├── ContactPage.jsx       ← Yeni ✅
        ├── PrivacyPage.jsx       ← Yeni ✅
        └── TermsPage.jsx         ← Yeni ✅
```

---

## 🚀 Başlatma

```powershell
# Backend
cd "C:\Users\Gökhan Ustaosmanoğlu\amazenlens\backend"
venv\Scripts\activate
py main.py

# Frontend
cd "C:\Users\Gökhan Ustaosmanoğlu\amazenlens\frontend"
npm run dev

# Chrome Extension (build)
cd "C:\Users\Gökhan Ustaosmanoğlu\amazenlens\extension"
npm run build
# Sonra Chrome > Extensions > Load unpacked > .output/chrome-mv3

# Stripe webhook test (ayrı terminal)
stripe listen --forward-to localhost:8000/api/payments/webhook
```

⚠️ Backend: http://127.0.0.1:8000 (Edge proxy localhost'u engelliyor!)

---

## 🔑 .env Durumu

```env
SUPABASE_URL ✅
SUPABASE_ANON_KEY ✅
SUPABASE_SERVICE_KEY ✅
ANTHROPIC_API_KEY ✅ (bireysel hesap, $5 kredi)
EASYPARSER_API_KEY ✅ (mock modda, 100 kredi)
STRIPE_SECRET_KEY ✅ (test mode)
STRIPE_WEBHOOK_SECRET ✅ (stripe listen ile)
STRIPE_STARTER_PRICE_ID ✅
STRIPE_PRO_PRICE_ID ✅
STRIPE_AGENCY_PRICE_ID ✅
FRONTEND_URL=http://localhost:5173 ✅
KEEPA_API_KEY ✅ (aktif, ~60 token/dk)
SCRAPERAPI_KEY ✅ (5000 req/ay — ürün fallback + Trend Radar proxy)
PLAYWRIGHT_WORKER_URL ❌ (Trendyol scraping için Railway'e ayrı servis lazım)
```

---

## 💰 Fiyatlandırma

| Plan | USD | Arama/Gün |
|------|-----|-----------|
| Free | $0 | 5 |
| Starter | $19/ay | 50 |
| Pro | $49/ay | 200 |
| Agency | $99/ay | Sınırsız |

7 gün ücretsiz trial ✅ — kart bilgisi gerekmez

---

## 🗺️ Route Yapısı

```
/                    → LandingPage (public)
/auth                → AuthPage (public)
/privacy             → PrivacyPage (public)
/terms               → TermsPage (public)
/contact             → ContactPage (public)
/blog                → BlogPage (public, Google indexleyebilsin)
/blog/:slug          → BlogPostPage (public)
/app/dashboard       → Dashboard (private)
/app/search          → SearchPage (private)
/app/product/:asin   → ProductPage (private)
/app/niche           → NichePage (private)
/app/sourcing        → SourcingPage (private)
/app/bulk            → BulkPage (private)
/app/calculator      → CalculatorPage (private)
/app/pricing         → PricingPage (private)
/app/feedback        → FeedbackPage (private)
/app/about           → AboutPage (private)
/app/keywords        → KeywordPage (private)
/app/trends          → TrendRadarPage (private)
/app/unavailable     → UnavailablePage (private) ← Stok Takibi
/app/api-docs        → ApiDocsPage (private)
/app/blog            → BlogPage (private)
/app/blog/:slug      → BlogPostPage (private)
/app/blog-admin      → BlogAdminPage (private, adminOnly)
```

---

## 📊 Supabase Tablolar

| Tablo | Notlar |
|-------|--------|
| profiles | plan, stripe_customer_id, searches_per_day — UNIQUE email ✅ |
| feedback | Feedback sistemi |
| lens_points | Lens puan takibi |
| user_events | Event tracking ✅ |
| blog_posts | Blog sistemi |

RLS: Tüm tablolarda aktif ✅

---

## 🔧 Mock Döndüren Servisler (Dikkat!)

| Servis | Durum | Gerçek API |
|--------|-------|-----------|
| `easyparser.py` | Mock modda | 100 kredi var, aktifleştirilebilir |
| `alibaba.py` | Mock Türk tedarikçi | Gerçek B2B API yok (KobiVadisi vs hepsi kapalı) |
| `global_arbitrage.py` | Mock | Trendyol/Hepsiburada scraping gerekli |
| `playwright_client.py` | PLAYWRIGHT_WORKER_URL yoksa mock | Railway'de ayrı Playwright servisi lazım |
| `trend_service.py` | 429 alınca mock | ScraperAPI proxy önce deneniyor |
| `scraperapi_amazon.py` | Gerçek API ✅ | Easyparser fallback olarak kullanıyor |
| `keepa_service.py` | Gerçek API ✅ | availabilityAmazon: 0=stokta, 3=yok |

---

## 📊 FAZ TAKIBI

### ✅ FAZ 1 — TAMAMLANANLAR

| Özellik | Durum |
|---------|-------|
| Kullanıcı kaydı/girişi + Google/GitHub OAuth | ✅ |
| Keyword araması + ürün detayı | ✅ Mock |
| Unavailable Scanner (3 sekme: ASIN/Keyword/Kategori) | ✅ |
| Niş Skoru 100pt (Unmet Demand + Red Flags + 3 Prong) | ✅ |
| Global Arbitraj + Euro Flips | ✅ Mock |
| Toplu ASIN Import (CSV/Excel) | ✅ |
| Blog Sistemi | ✅ |
| Love/Hate Analizi (Claude API) | ✅ |
| Stripe Ödeme + Webhook + Plan güncelleme | ✅ |
| Landing Page V3 (Bold Gradient) | ✅ |
| 5 Dil Desteği TR/EN/DE/FR/ES (Landing+Auth) | ✅ |
| Güvenlik (Rate limiting, RLS, .gitignore) | ✅ |
| Event Tracking (user_events) | ✅ |
| Feedback + AI Bot + Lens Puan | ✅ |
| Dashboard plan güncelleme (Supabase'den) | ✅ |
| Trend Radar (Google Trends + ScraperAPI proxy + mock fallback) | ✅ |
| SearchPage — 3 seviyeli hover CategoryDrillDown | ✅ |
| PWA (vite-plugin-pwa, manifest, service worker) | ✅ |
| Chrome Extension (WXT, overlay, content script) | ✅ Build çalışıyor |
| Stok Takibi sidebar'a eklendi | ✅ |
| Yeni public sayfalar: Privacy, Terms, Contact, ApiDocs | ✅ |
| Logo SVG (dark/light/icon/512) | ✅ |

### ❌ BEKLEYEN / YAPILACAKLAR

| Özellik | Not |
|---------|-----|
| Unavailable Scanner — ASIN tab Keepa gerçek stok | Keepa `availabilityAmazon` kullanılacak, ScraperAPI ikinci doğrulama |
| Unavailable Scanner — CategoryDrillDown hover menü | SearchPage ile aynı mantık, drill-down eklenecek |
| Trendyol gerçek veri | Playwright Worker Railway servisi (PLAYWRIGHT_WORKER_URL) |
| Türk tedarikçi ağı güçlendirme | Trendyol scraping + Akakçe benzeri fiyat karşılaştırma |
| Akakçe / fiyat karşılaştırma arbitrajı | SourcingPage'e entegre edilecek |
| Chrome Extension — BSR + Google Trends mini chart | Overlay'e eklenecek |
| Chrome Extension — Draggable/resizable overlay | |
| Pitch Deck (İTÜ Çekirdek, PDF <1MB) | |
| Canlıya çık (Vercel + Railway) | Sıradaki öncelik! |
| Stripe canlı webhook | Deploy sonrası |
| Dil desteği tüm iç sayfalar | |
| Keepa API ProductPage entegrasyonu | 60 token/dk var |

### 🟡 FAZ 2 — PLANLANANLAR

| Özellik | Öncelik |
|---------|---------|
| Easyparser Webhook → WebSocket | 🔴 |
| Business Valuation | 🔴 |
| Product Opportunity Gap | 🔴 |
| WhatsApp/Telegram Alertleri | 🟡 |
| AI Listing Optimizer | 🟡 |
| Rank Tracker | 🟡 |

### 🟠 FAZ 3

Mobil Uygulama, Barkod Okuyucu, API Erişimi, Satıcı Segmentasyonu, SnapSearch, Telegram Alertleri

---

## 🇹🇷 Trendyol / Türk Market Arbitrajı (Araştırma Durumu)

- **Trendyol API:** Halka açık API yok. Scraping gerekli (Playwright Worker veya ScraperAPI).
- **Akakçe:** Fiyat karşılaştırma sitesi — `akakce.com/pg/?q=keyword` scrape edilebilir, JS-heavy.
- **Hepsiburada:** `hepsiburada.com/ara?q=keyword` — ScraperAPI ile çekilebilir.
- **n11:** Kapanıyor (Trendyol'a entegre).
- **Türk B2B (Tedarikçi):** KobiVadisi, TOBB, TIM, Kolay İhracat — hepsinin public API'si yok, government partnership gerekiyor. Şu an mock veri.
- **Strateji:** ScraperAPI ile Trendyol/Hepsiburada/Akakçe fiyatlarını çek → Amazon fiyatıyla karşılaştır → arbitraj fırsatı göster.

---

## 🔌 Playwright Worker Kurulumu (Trendyol için)

Playwright ücretsiz open-source, Railway'de ayrı servis olarak deploy edilmeli:
1. Yeni Railway servisi: `playwright-worker` (Node.js)
2. `@playwright/mcp` veya özel Express + Playwright scraper
3. Railway'de `PLAYWRIGHT_WORKER_URL` env var'ını backend'e ekle
4. `playwright_client.py` bu URL'yi kullanarak Trendyol'u scrape eder

---

## 🏆 Rakip Karşılaştırma

| Özellik | AmazenLens | Helium 10 | Jungle Scout |
|---------|------------|-----------|--------------|
| Fiyat | $19/ay | $97/ay | $49/ay |
| Türkçe | ✅ | ❌ | ❌ |
| Trendyol Arbitraj | ✅ | ❌ | ❌ |
| Love/Hate AI | ✅ Claude | Zayıf | Zayıf |
| 5 Dil | ✅ | ❌ | ❌ |

---

## 🗺️ Yatırım Hedefleri

- TÜBİTAK BiGG: 900K TL (pitch deck ✅)
- KOSGEB: 375K TL
- EIC Accelerator: €2.5M
- Y Combinator: $500K

---

## ⚠️ Kodlama Kuralları

1. `.env` asla GitHub'a gitmesin ✅
2. Tüm `navigate()` → `/app/...` formatında
3. Python 3.11 (3.13/3.14 pydantic sorunu)
4. httpx'te `verify=False` (Windows SSL)
5. Backend: 127.0.0.1:8000
6. Venv: backend/venv (`.venv` değil!)
7. Stripe test: `stripe listen --forward-to localhost:8000/api/payments/webhook`
8. Dev server worktree'den çalışır: `.claude/worktrees/stoic-borg/frontend/`
   Ana repo'yu düzenlersen worktree'ye `cp` ile kopyala!
9. Keepa `availabilityAmazon`: 0 = stokta var, 3 = stokta yok
