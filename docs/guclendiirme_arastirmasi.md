# AmazenLens — Güçlendirme Araştırması

**Tarih:** Mart 2026  
**Kaynak:** Rakip analizi + pazar araştırması

---

## 🔴 FAZ 1 GÜÇLENDİRMELERİ

### 1. Keywords on Fire (Faz 1 — Orta zorluk — 🔴 Yüksek etki)
ZonGuru'nun en sevilen özelliği. Sadece arama hacmi değil, her keyword'den elde edilen aylık tahmini gelir, ortalama PPC teklif maliyeti ve rakiplerin o keyword'deki sıralaması gösteriliyor.

**Bizim durumumuz:** BSR → satış tahmini altyapısı hazır. Üstüne tahmini aylık gelir = satış × fiyat hesabı eklemek yeterli.

**Yapılacak:** SearchPage'de Est.Sales kolonuna "Est. Revenue" ekle → $X/ay tahmini gelir göster.

---

### 2. Niche Skoru → "Unmet Demand" Tespiti (Faz 1 — Orta — 🔴 Yüksek)
Amazon'un kendi AI'ı artık müşterilerin aradığı ama bulamadığı ürünleri tespit edip "Unmet Demand Insights" olarak sunuyor. Biz bunu niche skoruna entegre edebiliriz.

**Formül:** Düşük review sayısı + yüksek satış hacmi + yüksek fiyat = karşılanmamış talep

**Yapılacak:** Niş Skoru sayfasına "⚠️ Bu niş'te karşılanmamış talep tespit edildi" uyarısı ekle.

---

### 3. Love/Hate Kelime Bulutu (Faz 1 — Kolay — 🔴 Yüksek)
ZonGuru'nun Love/Hate aracı ürün yorumlarını tarayarak müşterilerin ne sevdiğini ve nefret ettiğini iki sütunda gösteriyor — binlerce yorumu elle okuma ihtiyacını ortadan kaldırıyor.

**Bizim durumumuz:** Claude API hazır. Yorumları alıp analiz ettirmek yeterli.

**Yapılacak:** ProductPage'e yeni sekme — "💚 Seviyor / ❤️ Nefret Ediyor" iki sütun + kelime bulutu.

---

### 4. Euro Flips — Avrupa Pazarları Arası Arbitraj (Faz 1 — Kolay — 🟡 Orta)
FBA Wizard Pro, Amazon UK ve Avrupa pazarları arasındaki arbitraj fırsatlarını tespit ediyor.

**Bizim durumumuz:** Global arbitraj altyapısı hazır. Sadece Amazon.de, Amazon.fr, Amazon.co.uk eklemek gerekiyor.

**Yapılacak:** SourcingPage arbitraj modülüne Amazon.de ve Amazon.co.uk fiyat karşılaştırması ekle.

---

### 5. Product Opportunity Gap — Rakipsiz! (Faz 1 — Orta — 🔴 Yüksek)
Amazon'un kendi Product Opportunity Explorer aracı ücretsiz ve güçlü — müşteri duygu analizi, iade verileri ve özellik tercihlerini sunuyor ama gelişmiş filtreler, tarihsel veri, niş skoru ve Alibaba bağlantısından yoksun.

**Bizim farkımız:** Amazon POE verilerini alıp üstüne Niş Skoru + Alibaba fiyatı + Arbitraj + Kar hesabı entegre ederiz → "Bu fırsatı yakala" butonu. Hiçbir rakipte bu entegrasyon yok.

**Yapılacak:** 
- Amazon POE API veya scraping ile fırsat verileri çek
- Mevcut niş skoru + alibaba + kar hesabı ile birleştir
- Dashboard'a "🎯 Amazon Fırsatları" widget ekle

---

## 🟡 FAZ 2 GÜÇLENDİRMELERİ

### 6. Business Valuation Tool (Faz 2 — Orta — 🔴 Yüksek)
Sadece ZonGuru'da var, ama zayıf versiyonu. Bizim versiyonumuz çok daha güçlü olabilir.

**Formül:** Aylık net kar × 36-48x çarpan = işletme değeri

**Yapılacak:** 
- Kullanıcı ürünlerini, satış hızını, kar marjını girer
- "Bu Amazon işi bugün $X'e satılabilir" hesabı yapar
- Türk satıcılar için devrimsel — Amazon işi satmak/değerlendirmek isteyenler için

---

### 7. Sezonluk Talep Tahmini + Stok Önerisi (Faz 2 — Zor — 🔴 Yüksek)
Hiçbir rakip araçta yok. Prediktif analitik + stok siparişi birleşimi.

**Özellik:** "Bu ürünün Q4'te satışı 3x artacak, şimdi 500 adet sipariş ver"

**Yapılacak:**
- Keepa API'den tarihsel BSR/fiyat verisi al
- Google Trends entegrasyonu
- Sezonluk tahmin modeli (basit ML veya kural tabanlı)
- "Ne zaman, kaç adet sipariş ver" önerisi

---

### 8. Review Analyzer — Gelişmiş (Faz 2 — Orta — 🟡 Orta)
Sadece iyi/kötü yorum değil — interaktif kelime bulutu. Tıklayınca o kelimeyle ilgili tüm yorumlar açılıyor.

**Fark:** Keyword bazlı analiz (rakiplerde yok) — "yoga mat" arayan müşterilerin tüm yorumlarından ortak şikayet ve övgüleri çıkar.

---

### 9. Listing Optimizer — Rakip Karşılaştırma (Faz 2 — Kolay — 🟡 Orta)
Jungle Scout zayıflığı: keyword eklemek için sürekli sekme geçişi, rakip listing gücünü göstermiyor, CSV export yok.

**Yapılacak:** Rakip listing ile yan yana karşılaştırma + CSV export.

---

### 10. Sales Estimator — Çoklu Kaynak (Faz 2 — Orta — 🟡 Orta)
Helium 10 %71 doğruluk oranıyla öne çıkıyor. Biz Easyparser + Keepa + kendi algoritmamızı birleştirerek daha doğru tahmin üretebiliriz.

---

## 📊 Öncelik Matrisi

| # | Özellik | Faz | Zorluk | Etki | Durum |
|---|---------|-----|--------|------|-------|
| 1 | Love/Hate Kelime Bulutu | 1 | Kolay | 🔴 Yüksek | Bekliyor |
| 2 | Product Opportunity Gap | 1 | Orta | 🔴 Yüksek | Bekliyor |
| 3 | Keywords on Fire (gelir tahmini) | 1 | Orta | 🔴 Yüksek | Bekliyor |
| 4 | Unmet Demand Tespiti | 1 | Orta | 🔴 Yüksek | Bekliyor |
| 5 | Euro Flips | 1 | Kolay | 🟡 Orta | Bekliyor |
| 6 | Business Valuation Tool | 2 | Orta | 🔴 Yüksek | Planlandı |
| 7 | Sezonluk Talep + Stok Önerisi | 2 | Zor | 🔴 Yüksek | Planlandı |
| 8 | Review Analyzer Gelişmiş | 2 | Orta | 🟡 Orta | Planlandı |
| 9 | Listing: rakip karşılaştırma | 2 | Kolay | 🟡 Orta | Planlandı |
| 10 | Sales Estimator çoklu kaynak | 2 | Orta | 🟡 Orta | Planlandı |

---

## 🗒️ Notlar

- Türkçe Topluluk + Canlı Q&A: **İPTAL edildi**
- Product Opportunity Gap: En stratejik özellik — Amazon'un kendi verisini güçlendirip sunmak hiçbir rakipte yok
- Love/Hate bulutu: Claude API hazır olduğu için en hızlı implement edilebilecek özellik
- Business Valuation: Türk satıcılar için özellikle değerli — "işimi satsam ne kadar eder?" sorusunun cevabı
