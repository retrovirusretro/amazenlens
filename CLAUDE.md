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

## 🛠️ Tech Stack (Kesin Kararlar)

| Katman | Teknoloji | Notlar |
|--------|-----------|--------|
| Backend | Python 3.11 + FastAPI | Python 3.14 desteklenmiyor! |
| Frontend | React + Vite | localhost:5173 |
| Veritabanı | Supabase (PostgreSQL) | mnpwuaupqkkgdoryfqlr |
| Auth | Supabase Auth | Email doğrulama KAPALI (dev) |
| Ödeme | Stripe | Henüz entegre edilmedi |
| Amazon Verisi | Easyparser API | Rainforest yerine (10x hızlı, ~$30/ay) |
| Fiyat Geçmişi | Keepa API | Faz 1 pending |
| Multi-market | Algopix API | Faz 2 |
| AI | Claude API (Anthropic) | Niş skoru yorumları |
| Hosting FE | Vercel | Henüz deploy edilmedi |
| Hosting BE | Railway | Henüz deploy edilmedi |

---

## 📁 Mevcut Proje Yapısı

```
C:\Users\Gökhan Ustaosmanoğlu\amazenlens\
├── CLAUDE.md                     ← Bu dosya
├── docs/
│   └── spec.md                   ← Tüm özellikler ve fazlar
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── .env                      ← GitHub'a yüklenmiyor! ✅
│   ├── database/
│   │   └── supabase.py
│   ├── middleware/
│   │   └── auth.py
│   ├── routers/
│   │   ├── amazon.py
│   │   ├── auth.py
│   │   ├── sourcing.py
│   │   ├── bulk.py
│   │   └── blog.py
│   └── services/
│       ├── easyparser.py
│       ├── niche_calculator.py
│       ├── alibaba.py
│       ├── global_arbitrage.py
│       └── bulk_import.py
└── frontend/
    └── src/
        ├── App.jsx
        ├── lib/api.js             ← API_URL = 'http://127.0.0.1:8000'
        ├── components/
        │   ├── Layout.jsx
        │   └── Layout.css
        └── pages/
            ├── AuthPage.jsx
            ├── Dashboard.jsx
            ├── SearchPage.jsx
            ├── ProductPage.jsx
            ├── UnavailablePage.jsx
            ├── NichePage.jsx
            ├── SourcingPage.jsx
            ├── BulkPage.jsx
            ├── BlogPage.jsx
            ├── BlogPostPage.jsx
            └── BlogAdminPage.jsx
```

---

## 🔑 API Key Durumu (.env)

```env
SUPABASE_URL=https://mnpwuaupqkkgdoryfqlr.supabase.co  ✅
SUPABASE_ANON_KEY=eyJ...                                ✅
SUPABASE_SERVICE_KEY=eyJ...                             ✅
ANTHROPIC_API_KEY=sk-ant-...                            ✅
EASYPARSER_API_KEY=602a3292-...                         ✅

STRIPE_SECRET_KEY=buraya_yazacaksin                     ❌ Henüz yok
STRIPE_WEBHOOK_SECRET=buraya_yazacaksin                 ❌ Henüz yok
KEEPA_API_KEY=buraya_yazacaksin                         ❌ Henüz yok
ALIBABA_APP_KEY=buraya_yazacaksin                       ❌ Mock data
ALIBABA_APP_SECRET=buraya_yazacaksin                    ❌ Mock data
EBAY_APP_ID=buraya_yazacaksin                           ❌ Mock data
```

---

## 🚀 Backend Başlatma

```powershell
cd "C:\Users\Gökhan Ustaosmanoğlu\amazenlens\backend"
venv\Scripts\activate
py main.py
# veya
py -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

⚠️ **ÖNEMLİ:** Edge tarayıcı kurumsal proxy localhost'u engelliyor!
- Backend: http://127.0.0.1:8000 (localhost değil!)
- Frontend: http://localhost:5173 (bu çalışıyor)
- Swagger: http://127.0.0.1:8000/docs

## 🖥️ Frontend Başlatma

```powershell
cd "C:\Users\Gökhan Ustaosmanoğlu\amazenlens\frontend"
npm run dev
```

---

## 💰 Fiyatlandırma Planları

| Plan | Fiyat | Hedef |
|------|-------|-------|
| Free | $0 | 5 arama/gün — deneme |
| Starter | $19/ay | Bireysel Türk satıcı |
| Pro | $49/ay | Ciddi satıcı |
| Agency | $99/ay | Ajans / büyük satıcı |

---

## 📊 Mevcut Durum — FAZ TAKIBI

### ✅ FAZ 1 — TAMAMLANANLAR

| # | Özellik | Durum |
|---|---------|-------|
| 1 | Kullanıcı kaydı/girişi (Supabase Auth) | ✅ Çalışıyor |
| 2 | Keyword araması + ürün görselleri | ✅ Gerçek veri (Easyparser) |
| 3 | Ürün detayı + platform linkleri | ✅ Çalışıyor |
| 4 | Unavailable Scanner | ✅ Çalışıyor |
| 5 | Niş Skoru (100pt) + AI yorum | ✅ Çalışıyor |
| 6 | Alibaba Tedarikçi Finder | ✅ Mock data (API key yok) |
| 7 | Global Arbitraj (Trendyol/eBay) | ✅ Mock data |
| 8 | Toplu ASIN Import (100 ASIN) | ✅ Mock data |
| 9 | Blog Sistemi (Admin + Liste + Detay) | ✅ Supabase'de saklı |

### ❌ FAZ 1 — BEKLEYENLER

| # | Özellik | Not |
|---|---------|-----|
| 10 | Stripe Ödeme Sistemi | Sonraya bırakıldı |
| 11 | 4 Dil Desteği (TR/EN/DE/FR) | Sonraya bırakıldı |
| 12 | Quick Picks / Günün Fırsatları | Sonraya bırakıldı |
| 13 | Keepa API entegrasyonu | Key yok |

### 🟡 FAZ 2 — PLANLANANLAR

- Chrome & Edge Eklentisi
- AI Listing Optimizer
- AI Review Analyzer (ürün bazlı + keyword bazlı)
- Keyword Explorer
- Reverse ASIN
- Always Be Scanning (arka plan tarama)
- Wholesale Manifest Upload
- WhatsApp / Telegram Alertleri
- Sales Estimator
- FBA Kar Hesaplayıcı
- SnapSearch (görsel arama)

### 🟠 FAZ 3
- iOS + Android App
- Barkod Okuyucu
- Seller Map
- 1688 + Made-in-China + DHgate entegrasyonu
- Türk Tedarikçi Veritabanı

### 🔵 FAZ 4
- Intelligence API
- ML Model Eğitimi
- EtsyLens
- Sesli Asistan

---

## 🏆 Rakiplerden Farklılaştırıcılar

| Özellik | AmazenLens | Helium 10 | Jungle Scout | AMZScout |
|---------|------------|-----------|--------------|----------|
| Trendyol Arbitraj | ✅ | ❌ | ❌ | ❌ |
| Türkçe Arayüz | ✅ | ❌ | ❌ | ❌ |
| Niş Skoru (4 boyut) | ✅ 100pt | Sınırlı | Orta | 7/10 |
| Fiyat başlangıç | $19/ay | $97/ay | $49/ay | $49/ay |
| Global Arbitraj | ✅ | ❌ | ❌ | ❌ |
| Türk Tedarikçi DB | ✅ (Faz 3) | ❌ | ❌ | ❌ |

---

## ⚠️ Önemli Kodlama Kuralları

1. `.env` dosyası asla GitHub'a yüklenmesin ✅ (zaten gitignore'da)
2. API key'ler sadece backend'de, frontend'de asla
3. Python 3.11 kullan — 3.13/3.14 pydantic-core sorunu yaratıyor!
4. Alibaba/eBay API key yoksa mock data döndür
5. Backend her zaman 127.0.0.1:8000 (localhost değil)
6. Venv: backend/venv klasöründe, .venv veya .venv-1 değil!

---

## 🗺️ Yatırım Hedefleri

- TÜBİTAK BiGG: 900K TL (başvuru hazırlandı)
- KOSGEB: 375K TL
- EIC Accelerator: €2.5M
- Y Combinator: $500K

---

## 🔄 Bu Dosyayı Ne Zaman Güncelle

- Yeni özellik tamamlandığında
- Faz geçişlerinde
- Tech stack değiştiğinde
- API key eklendiğinde
- Her oturum sonunda "CLAUDE.md'i güncelle" dersen Claude güncelleyecek
