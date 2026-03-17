# AmazenLens — Ürün Spesifikasyonu (spec.md)

**Versiyon:** 2.0  
**Son güncelleme:** Mart 2026  
**Durum:** Faz 1 büyük ölçüde tamamlandı, Faz 2 planlanıyor

---

## 1. Vizyon

Amazon satıcıları için tek platformda her şeyi sunan global araştırma ve analiz SaaS'ı.

**Temel farklılaşma:**
- Trendyol → Amazon arbitraj tespiti (dünyada yok)
- Alibaba + 1688 + Made-in-China tedarikçi entegrasyonu
- Türkçe arayüz ve Türk pazarına özel özellikler
- Global arbitraj (15+ platform)
- SnapSearch — görsel ile ürün arama (Faz 2)
- WhatsApp / Telegram fiyat alertleri (Faz 2)
- Mobil uygulama (Faz 3)
- Barkod okuyucu (Faz 3)

---

## 2. Hedef Kitle

- Türkiye'den Amazon'da satış yapan veya yapmak isteyen bireysel satıcılar
- Trendyol satıcıları → Amazon'a geçmek isteyenler
- Amazon FBA başlangıç seviyesi satıcılar (global)
- Küçük e-ticaret ajansları
- Avrupa'daki Türk diasporası (Amazon.de, Amazon.fr)

---

## 3. Rakip Analizi

| Özellik | Helium 10 | Jungle Scout | AMZScout | SmartScout | AmazenLens |
|---------|-----------|--------------|----------|------------|------------|
| Fiyat | $97+/ay | $49+/ay | $45+/ay | $65+/ay | $19+/ay |
| Türkçe | ❌ | ❌ | ❌ | ❌ | ✅ |
| Trendyol arbitraj | ❌ | ❌ | ❌ | ❌ | ✅ |
| Global Arbitraj | ❌ | ❌ | ❌ | ❌ | ✅ |
| 4 Boyutlu Niş Skoru | ❌ | ❌ | ❌ | ❌ | ✅ |
| Barkod okuyucu | ❌ | Zayıf | ❌ | ❌ | ✅ (Faz 3) |
| Mobil app | ❌ | ❌ | ❌ | ❌ | ✅ (Faz 3) |
| WhatsApp alert | ❌ | ❌ | ❌ | ❌ | ✅ (Faz 2) |

---

## 4. Özellik Listesi — Fazlara Göre

### ✅ Faz 1 — TAMAMLANANLAR

| # | Özellik | Durum | Notlar |
|---|---------|-------|--------|
| 1 | Kullanıcı kaydı/girişi | ✅ | Supabase Auth |
| 2 | Keyword araması + ürün görselleri | ✅ | Easyparser API - gerçek veri |
| 3 | Ürün detayı + platform linkleri | ✅ | Amazon/Trendyol/eBay linkleri |
| 4 | Unavailable Scanner | ✅ | Stok dışı ASIN tespiti |
| 5 | Niş Skoru (100pt) + AI yorum | ✅ | 4 boyut: Hacim+Lojistik+Rekabet+Karlılık |
| 6 | Alibaba Tedarikçi Finder | ✅ | Mock data (API key bekleniyor) |
| 7 | Global Arbitraj (Trendyol/eBay) | ✅ | Mock data |
| 8 | Toplu ASIN Import (100 ASIN) | ✅ | CSV/Excel yükleme |
| 9 | Blog Sistemi | ✅ | Admin panel + Supabase |

### ❌ Faz 1 — BEKLEYENLER

| # | Özellik | Not |
|---|---------|-----|
| 10 | Stripe Ödeme | Sonraya bırakıldı |
| 11 | 4 Dil Desteği (TR/EN/DE/FR) | Sonraya bırakıldı |
| 12 | Quick Picks / Günün Fırsatları | Sonraya bırakıldı |
| 13 | Keepa API entegrasyonu | Key yok |

---

### 🟡 Faz 2 — ARAŞTIRMA PLATFORMU

| # | Özellik | İlham |
|---|---------|-------|
| 1 | Chrome & Edge Eklentisi | Jungle Scout |
| 2 | AI Listing Optimizer | Helium 10 (Scribbles) |
| 3 | Review Analyzer — Ürün Bazlı | AMZScout + Jungle Scout |
| 4 | Review Analyzer — Keyword Bazlı 🆕 | Rakiplerde yok! |
| 5 | Keyword Explorer | Helium 10 (Cerebro) |
| 6 | Reverse ASIN | Helium 10 |
| 7 | Always Be Scanning | Tactical Arbitrage |
| 8 | Wholesale Manifest Upload | Tactical Arbitrage |
| 9 | WhatsApp / Telegram Alertleri | — |
| 10 | Sales Estimator (BSR → satış tahmini) | Jungle Scout |
| 11 | FBA Kar Hesaplayıcı (gelişmiş) | — |
| 12 | SnapSearch (görsel arama) | Google Lens |
| 13 | Fiyat & Stok Takibi | — |
| 14 | Algopix API entegrasyonu | Multi-market veri |
| 15 | PDF/Sheets export | — |
| 16 | IP Alert | Helium 10 |
| 17 | Store Analysis | SmartScout |

---

### 🟠 Faz 3 — MOBİL & GELİŞMİŞ

| # | Özellik |
|---|---------|
| 1 | iOS + Android App (React Native) |
| 2 | Barkod Okuyucu (mağazada anında analiz) |
| 3 | Seller Map (coğrafi satıcı haritası) |
| 4 | 1688 + Made-in-China + DHgate entegrasyonu |
| 5 | Türk Tedarikçi Veritabanı (EasyToptan, YeniToptancı) |
| 6 | Pan-European FBA rehberi |
| 7 | Merch/POD modu |

---

### 🔵 Faz 4 — ENTERPRİSE

| # | Özellik |
|---|---------|
| 1 | Intelligence API (Fal.ai modeli) |
| 2 | ML Model Eğitimi |
| 3 | EtsyLens |
| 4 | Amazon Appstore başvurusu |
| 5 | Sesli Asistan |
| 6 | White-label B2B |
| 7 | Patent Risk Tarayıcı |

---

## 5. Niş Skor Sistemi (100 Puan)

```
Niş Skoru = Hacim & Depolama (25) + Lojistik (25) + Rekabet (25) + Karlılık (25)
```

### 5.1 Hacim & Depolama (25 puan)

| Kriter | Puan |
|--------|------|
| Ürün boyutu (küçük standard = 10) | 0–10 |
| Amazon boyut sınıfı | 0–8 |
| Uzun dönem depolama riski | 0–7 |

### 5.2 Lojistik (25 puan)

| Kriter | Puan |
|--------|------|
| Ağırlık (< 1 lb = 10 puan) | 0–10 |
| FBA uygunluğu | 0–5 |
| Kırılgan mı? (değilse +5) | 0–5 |
| Alibaba'da var mı? | 0–5 |

### 5.3 Rekabet (25 puan)

| Kriter | Puan |
|--------|------|
| Rakip sayısı (< 10 = 8) | 0–8 |
| Ortalama review (< 500 = 7) | 0–7 |
| Büyük marka varlığı (yoksa +5) | 0–5 |
| Patent riski (yoksa +5) | 0–5 |

### 5.4 Karlılık (25 puan)

| Kriter | Puan |
|--------|------|
| Satış fiyatı ($15–50 ideal) | 0–8 |
| Tahmini kar marjı (> %40 = 10) | 0–10 |
| Fiyat rekabeti (savaş yoksa +7) | 0–7 |

### Skor Değerlendirmesi

| Skor | Karar |
|------|-------|
| 90–100 | 🟢 Mükemmel — Hemen gir |
| 70–89 | 🟡 İyi — Araştır |
| 50–69 | 🟠 Orta — Dikkatli ol |
| 0–49 | 🔴 Zayıf — Kaçın |

---

## 6. Blog Sistemi

### Supabase Tablosu: blog_posts

```sql
id, title_tr, title_en, slug, summary_tr, summary_en,
content_tr, content_en, cover_image, category, tags[],
author, published, featured, read_time, view_count,
created_at, updated_at
```

### İçerik Kategorileri

- Başlangıç
- Ürün Araştırması
- Arbitraj
- Tedarik
- Finansal
- Araç & Teknoloji

### Planlanan Blog Makaleleri (İlk 10)

1. Amazon FBA Nedir? Türkiye'den Nasıl Başlanır? ✅ (eklendi)
2. Trendyol'dan Amazon'a Arbitraj: 2026 Tam Rehberi
3. Alibaba'dan Güvenli Ürün Alma Rehberi
4. Amazon'da Karlı Ürün Nasıl Bulunur?
5. Helium 10 vs AmazenLens Karşılaştırma
6. BSR Nedir? Nasıl Yorumlanır?
7. Amazon'da İlk $1000: Gerçek Hikaye
8. FBA Masrafları: Gerçek Karlılık Hesabı
9. ABD'de Vergi: Türk Girişimci Ne Yapmalı?
10. Amazon Niş Skoru Nedir?

---

## 7. Veri Modeli (Supabase)

```sql
profiles         — id, email, plan, api_calls_this_month
search_history   — id, user_id, query, results
tracked_products — id, user_id, asin, alert_price
feature_requests — id, user_id, feature, votes
blog_posts       — id, title_tr/en, slug, content, published
```

---

## 8. API Endpoint'leri

```
GET  /api/amazon/search?q={keyword}
GET  /api/amazon/product/{asin}
POST /api/amazon/unavailable-scanner
GET  /api/amazon/niche-score/{asin}

GET  /api/sourcing/alibaba?keyword={q}
GET  /api/sourcing/arbitrage?keyword={q}&amazon_price={p}
GET  /api/sourcing/profit-calc?amazon_price={p}&alibaba_price={a}

POST /api/bulk/upload
POST /api/bulk/process

POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me

GET  /api/blog/posts
GET  /api/blog/posts/{slug}
POST /api/blog/posts
PUT  /api/blog/posts/{slug}
DELETE /api/blog/posts/{slug}
```

---

## 9. Deployment Planı

| Servis | Platform | Maliyet | Durum |
|--------|----------|---------|-------|
| Frontend | Vercel | Ücretsiz | ❌ Henüz yok |
| Backend | Railway | ~$5/ay | ❌ Henüz yok |
| Veritabanı | Supabase | Ücretsiz | ✅ Aktif |
| Domain | Namecheap | ~$12/yıl | ❌ Henüz yok |

---

## 10. Araştırma Havuzu (Rakip Analizleri)

### AMZScout'tan Alınan Fikirler
- Overall Score: Profit + Demand + Competition (3 boyut)
- "New Niche" ve "Trending" rozetleri
- LQS (Listing Quality Score)
- RPR (Review Per Rating) metriği
- "Find on Alibaba" butonu (bizde var ✅)

### Dan Rodgers Eğitiminden
- Red Flag sistemi: Big Brand ❌, Seasonal ❌, Low Development ❌
- "3 Prongs": High Sell Price + Development Potential + Acceptance of Low Reviews
- BSR 30 mini trend grafikleri

### Helium 10 Black Box'tan
- Pazar seçimi dropdown (.com/.de/.co.uk)
- Shipping Size Tier filtresi
- Niche sekmesi ayrı

### Tactical Arbitrage'dan
- Always Be Scanning
- Wholesale Manifest Upload

---

## 11. Ortaklık Fırsatları

| Partner | Konu | Durum |
|---------|------|-------|
| Manay CPA | ABD vergi danışmanlığı | Planlanan |
| Fullfill Logistics | ABD ara depo (NJ) | Planlanan |
| AMZ Prep | FBA hazırlık | Planlanan |
| EasyToptan | Türk tedarikçi | Faz 3 |

---

## 12. Değişiklik Geçmişi

| Tarih | Değişiklik |
|-------|------------|
| Mart 2025 | İlk versiyon |
| Mart 2026 | Faz 1 büyük ölçüde tamamlandı |
| Mart 2026 | Easyparser API (Rainforest yerine) |
| Mart 2026 | Blog sistemi eklendi |
| Mart 2026 | Toplu ASIN Import eklendi |
| Mart 2026 | Python 3.11 zorunlu hale geldi |
| Mart 2026 | OneDrive'dan C:\Users\Gökhan\amazenlens'e taşındı |
