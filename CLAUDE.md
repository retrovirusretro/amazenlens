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
| AI | Claude API | Love/Hate + AI bot + Niş skoru (bireysel hesap) |
| Rate Limiting | slowapi | 200/minute global ✅ |
| Dil Desteği | i18next | TR/EN/DE/FR/ES ✅ Landing + Auth |
| Event Tracking | Supabase user_events | ✅ keyword, product_view, niche_score |
| Hosting FE | Vercel | Henüz deploy edilmedi |
| Hosting BE | Railway | ~$5/ay, henüz deploy edilmedi |

---

## 📁 Proje Yapısı

```
D:\amazenlens\
├── CLAUDE.md
├── .gitignore                    ← .env dahil ✅
├── backend/
│   ├── main.py                   ← slowapi rate limiting ✅
│   ├── .env                      ← GitHub'a gitmiyor ✅
│   ├── routers/
│   │   ├── amazon.py
│   │   ├── auth.py               ← Supabase Auth, 7 gün trial
│   │   ├── sourcing.py
│   │   ├── bulk.py
│   │   ├── blog.py
│   │   ├── reviews.py
│   │   ├── payments.py           ← Stripe checkout + webhook ✅
│   │   └── feedback.py           ← AI bot + Lens puan ✅
│   └── services/
│       ├── easyparser.py         ← Mock modda
│       ├── niche_calculator.py
│       ├── review_analyzer.py
│       ├── alibaba.py
│       ├── global_arbitrage.py   ← SSL verify=False ✅
│       ├── bulk_import.py
│       └── stripe_service.py     ← .env'den okuyor ✅
└── frontend/src/
    ├── App.jsx                   ← /app/... route yapısı ✅
    ├── main.jsx                  ← i18n import ✅
    ├── i18n.js                   ← i18next config ✅
    ├── locales/                  ← tr/en/de/fr/es.json ✅
    ├── lib/
    │   ├── api.js
    │   └── analytics.js          ← Event tracking ✅
    ├── components/
    │   ├── Layout.jsx            ← /app/... linkler ✅
    │   └── LanguageSwitcher.jsx  ← 5 dil seçici ✅
    └── pages/
        ├── LandingPage.jsx       ← V3 Bold Gradient, i18n ✅
        ├── AuthPage.jsx          ← Google+GitHub OAuth, i18n ✅
        ├── Dashboard.jsx         ← Plan Supabase'den çekiliyor ✅
        ├── SearchPage.jsx        ← Event tracking ✅
        ├── ProductPage.jsx       ← Event tracking ✅
        ├── NichePage.jsx         ← Event tracking ✅
        ├── UnavailablePage.jsx
        ├── SourcingPage.jsx
        ├── BulkPage.jsx
        ├── BlogPage.jsx / BlogPostPage.jsx / BlogAdminPage.jsx
        ├── CalculatorPage.jsx
        ├── PricingPage.jsx
        └── FeedbackPage.jsx      ← AI bot ✅
```

---

## 🚀 Başlatma

```powershell
# Backend
cd "D:\amazenlens\backend"
venv\Scripts\activate
py main.py

# Frontend
cd "D:\amazenlens\frontend"

npm run dev

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
EASYPARSER_API_KEY ✅ (mock modda)
STRIPE_SECRET_KEY ✅ (test mode)
STRIPE_WEBHOOK_SECRET ✅ (stripe listen ile)
STRIPE_STARTER_PRICE_ID ✅
STRIPE_PRO_PRICE_ID ✅
STRIPE_AGENCY_PRICE_ID ✅
FRONTEND_URL=http://localhost:5173 ✅
KEEPA_API_KEY ✅ (aktif, ~60 token/dk)
SCRAPERAPI_KEY ✅ (5000 req/ay, reviews için)
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
/app/dashboard       → Dashboard (private)
/app/search          → SearchPage (private)
/app/product/:asin   → ProductPage (private)
/app/niche           → NichePage (private)
/app/sourcing        → SourcingPage (private)
/app/bulk            → BulkPage (private)
/app/calculator      → CalculatorPage (private)
/app/pricing         → PricingPage (private)
/app/feedback        → FeedbackPage (private)
/app/blog            → BlogPage (private)
/app/blog/:slug      → BlogPostPage (private)
/app/blog-admin      → BlogAdminPage (private)
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

## 📊 FAZ TAKIBI

### ✅ FAZ 1 — TAMAMLANANLAR

| Özellik | Durum |
|---------|-------|
| Kullanıcı kaydı/girişi + Google/GitHub OAuth | ✅ |
| Keyword araması + ürün detayı | ✅ Mock |
| Unavailable Scanner (3 sekme) | ✅ |
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

### ❌ BEKLEYENLER

| Özellik | Not |
|---------|-----|
| Keepa API | $20/ay |
| Easyparser mock'tan çıkış | 100 kredi var |
| Canlıya çık (Vercel + Railway) | Sıradaki! |
| Stripe canlı webhook | Deploy sonrası |
| Dil desteği tüm sayfalar | Canlı sonrası |

### 🟡 FAZ 2 — PLANLANANLAR

| Özellik | Öncelik |
|---------|---------|
| Chrome Eklentisi | 🔴 |
| Trend Radar | 🔴 |
| Easyparser Webhook → WebSocket (onayladı) | 🔴 |
| Business Valuation | 🔴 |
| Product Opportunity Gap | 🔴 |
| WhatsApp/Telegram Alertleri | 🟡 |
| AI Listing Optimizer | 🟡 |

### 🟠 FAZ 3

Mobil Uygulama, Barkod Okuyucu, API Erişimi, Satıcı Segmentasyonu, SnapSearch, Telegram Alertleri

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
