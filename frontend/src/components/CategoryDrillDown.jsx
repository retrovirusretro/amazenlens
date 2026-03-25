import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'

export const AMAZON_CATEGORIES = [
  { label: 'Tüm Kategoriler', value: '', icon: '🌐' },
  { label: 'Elektronik', value: 'Electronics', icon: '💻', children: [
    { label: 'Bilgisayar & Aksesuarlar', value: 'Computers & Accessories', children: [
      { label: 'Dizüstü Bilgisayar', value: 'Laptops' },
      { label: 'Masaüstü Bilgisayar', value: 'Desktop Computers' },
      { label: 'Monitör', value: 'Monitors' },
      { label: 'Klavye & Fare', value: 'Keyboards & Mice' },
      { label: 'Depolama', value: 'Data Storage' },
      { label: 'Ağ Ekipmanı', value: 'Networking' },
    ]},
    { label: 'Kamera & Fotoğraf', value: 'Camera & Photo', children: [
      { label: 'DSLR Kameralar', value: 'DSLR Cameras' },
      { label: 'Aynasız Kameralar', value: 'Mirrorless Cameras' },
      { label: 'Aksiyon Kameraları', value: 'Action Cameras' },
      { label: 'Tripod & Aksesuar', value: 'Tripods & Accessories' },
    ]},
    { label: 'Cep Telefonu & Aksesuar', value: 'Cell Phones & Accessories', children: [
      { label: 'Telefon Kılıfları', value: 'Cases & Covers' },
      { label: 'Ekran Koruyucu', value: 'Screen Protectors' },
      { label: 'Kablosuz Şarj', value: 'Wireless Charging' },
      { label: 'Kulaklık', value: 'Headphones' },
    ]},
    { label: 'TV & Video', value: 'TV & Video' },
    { label: 'Ses & Ev Sineması', value: 'Audio & Home Theater' },
    { label: 'Araba Elektroniği', value: 'Car Electronics' },
    { label: 'Giyilebilir Teknoloji', value: 'Wearable Technology', children: [
      { label: 'Akıllı Saat', value: 'Smartwatches' },
      { label: 'Fitness Takipçi', value: 'Fitness Trackers' },
      { label: 'Kablosuz Kulaklık', value: 'Wireless Earbuds' },
    ]},
    { label: 'Video Oyunları', value: 'Video Games', children: [
      { label: 'PS5 Oyunları', value: 'PlayStation 5 Games' },
      { label: 'Xbox Oyunları', value: 'Xbox Games' },
      { label: 'Nintendo Switch', value: 'Nintendo Switch Games' },
      { label: 'Gaming Aksesuarları', value: 'Gaming Accessories' },
    ]},
    { label: 'Akıllı Ev', value: 'Smart Home', children: [
      { label: 'Akıllı Hoparlör', value: 'Smart Speakers' },
      { label: 'Akıllı Aydınlatma', value: 'Smart Lighting' },
      { label: 'Güvenlik Kamerası', value: 'Security Cameras' },
    ]},
  ]},
  { label: 'Ev & Mutfak', value: 'Home & Kitchen', icon: '🏠', children: [
    { label: 'Mutfak & Yemek', value: 'Kitchen & Dining', children: [
      { label: 'Pişirme Kapları', value: 'Cookware' },
      { label: 'Bıçaklar & Kesiciler', value: 'Cutlery' },
      { label: 'Küçük Mutfak Aletleri', value: 'Small Appliances' },
      { label: 'Yemek Servisi', value: 'Dinnerware' },
    ]},
    { label: 'Yatak Odası', value: 'Bedding', children: [
      { label: 'Nevresim Takımı', value: 'Comforters' },
      { label: 'Yastık', value: 'Pillows' },
      { label: 'Çarşaf', value: 'Sheets' },
    ]},
    { label: 'Banyo', value: 'Bath' },
    { label: 'Mobilya', value: 'Furniture', children: [
      { label: 'Oturma Odası', value: 'Living Room Furniture' },
      { label: 'Yatak Odası Mobilyası', value: 'Bedroom Furniture' },
      { label: 'Ofis Mobilyası', value: 'Office Furniture' },
    ]},
    { label: 'Depolama & Organizasyon', value: 'Storage & Organization' },
    { label: 'Süpürge & Zemin', value: 'Vacuums & Floor Care' },
    { label: 'Isıtma & Soğutma', value: 'Heating, Cooling & Air Quality' },
    { label: 'Dekorasyon', value: 'Home Décor' },
    { label: 'Aydınlatma', value: 'Lighting' },
  ]},
  { label: 'Giyim, Ayakkabı & Mücevher', value: 'Clothing, Shoes & Jewelry', icon: '👗', children: [
    { label: 'Kadın', value: "Women's Clothing" },
    { label: 'Erkek', value: "Men's Clothing" },
    { label: 'Kız Çocuk', value: "Girls' Clothing" },
    { label: 'Erkek Çocuk', value: "Boys' Clothing" },
    { label: 'Bebek Giyim', value: 'Baby Clothing' },
    { label: 'Saat', value: 'Watches' },
    { label: 'Mücevher', value: 'Jewelry' },
    { label: 'Bavul & Seyahat', value: 'Luggage & Travel Gear' },
    { label: 'Güneş Gözlüğü', value: 'Sunglasses' },
  ]},
  { label: 'Spor & Outdoor', value: 'Sports & Outdoors', icon: '⚽', children: [
    { label: 'Egzersiz & Fitness', value: 'Exercise & Fitness', children: [
      { label: 'Ağırlık & Dambıl', value: 'Weight Training' },
      { label: 'Kardiyo Ekipmanı', value: 'Cardio Training' },
      { label: 'Yoga Ekipmanı', value: 'Yoga Equipment' },
      { label: 'Direnç Bantları', value: 'Resistance Bands' },
    ]},
    { label: 'Yoga & Pilates', value: 'Yoga' },
    { label: 'Outdoor Rekreasyon', value: 'Outdoor Recreation', children: [
      { label: 'Kamp Ekipmanı', value: 'Camping Gear' },
      { label: 'Yürüyüş', value: 'Hiking' },
      { label: 'Tırmanma', value: 'Climbing' },
    ]},
    { label: 'Takım Sporları', value: 'Team Sports' },
    { label: 'Golf', value: 'Golf' },
    { label: 'Bisiklet', value: 'Cycling' },
    { label: 'Yüzme', value: 'Swimming' },
    { label: 'Kamp & Yürüyüş', value: 'Camping & Hiking' },
    { label: 'Avcılık & Balıkçılık', value: 'Hunting & Fishing' },
  ]},
  { label: 'Sağlık & Ev', value: 'Health & Household', icon: '💊', children: [
    { label: 'Sağlık Hizmetleri', value: 'Health Care' },
    { label: 'Ev Temizlik', value: 'Household Supplies' },
    { label: 'Kişisel Bakım', value: 'Personal Care' },
    { label: 'Bebek & Çocuk Bakımı', value: 'Baby & Child Care' },
    { label: 'Vitamin & Takviye', value: 'Vitamins & Dietary Supplements' },
    { label: 'Spor Beslenmesi', value: 'Sports Nutrition' },
    { label: 'Diyet & Kilo', value: 'Diet & Weight Management' },
  ]},
  { label: 'Güzellik & Kişisel Bakım', value: 'Beauty & Personal Care', icon: '💄', children: [
    { label: 'Cilt Bakımı', value: 'Skin Care' },
    { label: 'Saç Bakımı', value: 'Hair Care' },
    { label: 'Makyaj', value: 'Makeup' },
    { label: 'Parfüm', value: 'Fragrance' },
    { label: 'Erkek Bakımı', value: "Men's Grooming" },
    { label: 'Tırnak Bakımı', value: 'Nail Care' },
    { label: 'Güneş Kremi', value: 'Sunscreen' },
  ]},
  { label: 'Oyuncak & Oyun', value: 'Toys & Games', icon: '🧸', children: [
    { label: 'Aksiyon Figürleri', value: 'Action Figures' },
    { label: 'Lego & Yapım Setleri', value: 'Building Toys' },
    { label: 'Bebekler & Aksesuarlar', value: 'Dolls & Accessories' },
    { label: 'Eğitim & Öğrenme', value: 'Learning & Education' },
    { label: 'Bulmacalar', value: 'Puzzles' },
    { label: 'Açık Hava Oyunları', value: 'Sports & Outdoor Play' },
    { label: 'RC & Drone', value: 'Remote Control & Play Vehicles' },
    { label: 'Masa Oyunları', value: 'Board Games' },
  ]},
  { label: 'Bebek', value: 'Baby', icon: '🍼', children: [
    { label: 'Araba Koltukları', value: 'Car Seats' },
    { label: 'Bebek Arabası', value: 'Strollers' },
    { label: 'Beslenme', value: 'Feeding' },
    { label: 'Bez & Bakım', value: 'Diapering' },
    { label: 'Uyku', value: 'Baby Sleep' },
    { label: 'Bebek Güvenliği', value: 'Baby Safety' },
    { label: 'Bebek Monitörü', value: 'Baby Monitors' },
  ]},
  { label: 'Evcil Hayvan', value: 'Pet Supplies', icon: '🐾', children: [
    { label: 'Köpek', value: 'Dog Supplies' },
    { label: 'Kedi', value: 'Cat Supplies' },
    { label: 'Kuş', value: 'Bird Supplies' },
    { label: 'Balık & Akvaryum', value: 'Fish & Aquatic Pets' },
    { label: 'Küçük Hayvanlar', value: 'Small Animals' },
    { label: 'Sürüngenler', value: 'Reptiles' },
  ]},
  { label: 'Otomotiv', value: 'Automotive', icon: '🚗', children: [
    { label: 'Araba Bakımı', value: 'Car Care' },
    { label: 'Dış Aksesuarlar', value: 'Exterior Accessories' },
    { label: 'İç Aksesuarlar', value: 'Interior Accessories' },
    { label: 'Parçalar & Ekipman', value: 'Parts & Accessories' },
    { label: 'Araç & Ekipman', value: 'Automotive Tools' },
    { label: 'Motosiklet & ATV', value: 'Motorcycles & ATVs' },
    { label: 'GPS & Navigasyon', value: 'GPS & Navigation' },
  ]},
  { label: 'Alet & Yapı', value: 'Tools & Home Improvement', icon: '🔧', children: [
    { label: 'Elektrikli Aletler', value: 'Power Tools' },
    { label: 'El Aletleri', value: 'Hand Tools' },
    { label: 'Elektrik', value: 'Electrical' },
    { label: 'Aydınlatma', value: 'Lighting & Ceiling Fans' },
    { label: 'Sıhhi Tesisat', value: 'Plumbing' },
    { label: 'Boya', value: 'Paint' },
    { label: 'Güvenlik', value: 'Safety & Security' },
  ]},
  { label: 'Bahçe & Dış Mekan', value: 'Patio, Lawn & Garden', icon: '🌿', children: [
    { label: 'Bahçe Aletleri', value: 'Gardening Tools' },
    { label: 'Çim Bakımı', value: 'Lawn Mowers' },
    { label: 'Bitki & Tohum', value: 'Plants & Seeds' },
    { label: 'Açık Hava Mobilyası', value: 'Patio Furniture' },
    { label: 'BBQ & Izgara', value: 'Grills & Outdoor Cooking' },
    { label: 'Sulama', value: 'Watering Equipment' },
  ]},
  { label: 'Sanat & El Sanatları', value: 'Arts, Crafts & Sewing', icon: '🎨', children: [
    { label: 'Boyama', value: 'Painting' },
    { label: 'Çizim', value: 'Drawing' },
    { label: 'Dikiş', value: 'Sewing' },
    { label: 'Örgü & Tığ', value: 'Knitting & Crochet' },
    { label: 'Takı Yapımı', value: 'Beading & Jewelry Making' },
    { label: 'Scrapbooking', value: 'Scrapbooking' },
  ]},
  { label: 'Ofis Ürünleri', value: 'Office Products', icon: '📎', children: [
    { label: 'Ofis Elektroniği', value: 'Office Electronics' },
    { label: 'Ofis Mobilyası', value: 'Office Furniture' },
    { label: 'Kırtasiye', value: 'Office & School Supplies' },
    { label: 'Yazı Araçları', value: 'Writing Instruments' },
    { label: 'Dosyalama', value: 'Filing & Storage' },
  ]},
  { label: 'Gıda & İçecek', value: 'Grocery & Gourmet Food', icon: '🍎', children: [
    { label: 'Atıştırmalık', value: 'Snacks & Sweets' },
    { label: 'İçecekler', value: 'Beverages' },
    { label: 'Kahvaltılık', value: 'Breakfast Foods' },
    { label: 'Organik', value: 'Natural & Organic' },
    { label: 'Uluslararası Gıdalar', value: 'International Foods' },
    { label: 'Kahve & Çay', value: 'Coffee & Tea' },
  ]},
  { label: 'Müzik Aletleri', value: 'Musical Instruments', icon: '🎸', children: [
    { label: 'Gitarlar', value: 'Guitars' },
    { label: 'Davul & Perküsyon', value: 'Drums & Percussion' },
    { label: 'Klavye & MIDI', value: 'Keyboards & MIDI' },
    { label: 'Kayıt Ekipmanı', value: 'Recording Equipment' },
    { label: 'Nefesli Çalgılar', value: 'Wind & Woodwind' },
  ]},
  { label: 'Endüstriyel & Bilimsel', value: 'Industrial & Scientific', icon: '🔬', children: [
    { label: 'Lab & Bilimsel', value: 'Lab & Scientific' },
    { label: 'Endüstriyel Donanım', value: 'Industrial Hardware' },
    { label: 'İş Güvenliği', value: 'Safety' },
    { label: 'Temizlik', value: 'Janitorial' },
    { label: 'Test & Ölçüm', value: 'Test & Measurement' },
  ]},
]

// Dile göre kategori adı — TR: Türkçe label, diğerleri: İngilizce value
export const getCatLabel = (cat, lang) => lang === 'tr' ? cat.label : (cat.value || cat.label)

export default function CategoryDrillDown({ selected, onSelect }) {
  const { i18n } = useTranslation()
  const lang = i18n.language?.split('-')[0] || 'tr'
  const [hoveredL1, setHoveredL1] = useState(null)
  const [hoveredL2, setHoveredL2] = useState(null)
  const [path, setPath] = useState(() => {
    if (!selected) return []
    for (const l1 of AMAZON_CATEGORIES) {
      if (l1.value === selected) return [l1.value]
      for (const l2 of (l1.children || [])) {
        if (l2.value === selected) return [l1.value, l2.value]
        for (const l3 of (l2.children || [])) {
          if (l3.value === selected) return [l1.value, l2.value, l3.value]
        }
      }
    }
    return []
  })
  const hoverTimerRef = useRef(null)

  const clearHover = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    hoverTimerRef.current = setTimeout(() => { setHoveredL1(null); setHoveredL2(null) }, 200)
  }
  const keepHover = () => { if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current) }

  const selectCat = (val, level) => {
    if (level === 1) setPath(val ? [val] : [])
    else if (level === 2) setPath([path[0] || hoveredL1, val])
    else if (level === 3) setPath([path[0] || hoveredL1, path[1] || hoveredL2, val])
    onSelect(val)
    setHoveredL1(null)
    setHoveredL2(null)
  }

  const getBreadcrumb = () => {
    const result = []
    if (path[0]) { const n = AMAZON_CATEGORIES.find(c => c.value === path[0]); if (n) result.push({ label: getCatLabel(n, lang), pathIndex: 1 }) }
    if (path[1]) { const l1 = AMAZON_CATEGORIES.find(c => c.value === path[0]); const n = l1?.children?.find(c => c.value === path[1]); if (n) result.push({ label: getCatLabel(n, lang), pathIndex: 2 }) }
    if (path[2]) { const l1 = AMAZON_CATEGORIES.find(c => c.value === path[0]); const l2 = l1?.children?.find(c => c.value === path[1]); const n = l2?.children?.find(c => c.value === path[2]); if (n) result.push({ label: getCatLabel(n, lang), pathIndex: 3 }) }
    return result
  }
  const breadcrumb = getBreadcrumb()

  const chipStyle = (active) => ({
    display: 'inline-flex', alignItems: 'center', gap: '5px',
    padding: '5px 12px', borderRadius: '20px', cursor: 'pointer',
    fontSize: '12px', fontWeight: active ? '500' : '400', whiteSpace: 'nowrap',
    background: active ? '#1d1d1f' : 'white',
    color: active ? 'white' : '#3c3c43',
    border: `0.5px solid ${active ? '#1d1d1f' : '#d2d2d7'}`,
    transition: 'all 0.12s', flexShrink: 0,
  })

  return (
    <div style={{ background: 'white', borderRadius: '10px', border: '0.5px solid #e5e5ea', padding: '12px 14px', marginBottom: '12px', overflow: 'hidden' }}>
      {breadcrumb.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '10px', flexWrap: 'wrap' }}>
          <span onClick={() => { setPath([]); onSelect('') }}
            style={{ fontSize: '11px', color: '#0071e3', cursor: 'pointer', fontWeight: '500' }}>
            {lang === 'tr' ? 'Tüm Kategoriler' : 'All Categories'}
          </span>
          {breadcrumb.map((b, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <svg width="10" height="10" fill="none" stroke="#aeaeb2" strokeWidth="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
              <span onClick={() => { const np = path.slice(0, b.pathIndex); setPath(np); onSelect(np[np.length-1] || '') }}
                style={{ fontSize: '11px', color: i === breadcrumb.length-1 ? '#1d1d1f' : '#0071e3', fontWeight: i === breadcrumb.length-1 ? '600' : '500', cursor: i === breadcrumb.length-1 ? 'default' : 'pointer' }}>
                {b.label}
              </span>
            </span>
          ))}
          <span onClick={() => { setPath([]); onSelect('') }}
            style={{ marginLeft: 'auto', fontSize: '11px', color: '#8e8e93', cursor: 'pointer', padding: '2px 8px', borderRadius: '6px', background: '#f5f5f7' }}>
            ✕
          </span>
        </div>
      )}

      {/* Level 1 */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
        {AMAZON_CATEGORIES.map(cat => {
          const hasL2 = cat.children?.length > 0
          const isActive = path[0] === cat.value
          const isHovered = hoveredL1 === cat.value
          return (
            <div key={cat.value} style={{ position: 'relative', flexShrink: 0 }}
              onMouseEnter={() => { keepHover(); setHoveredL1(cat.value); setHoveredL2(null) }}
              onMouseLeave={clearHover}>
              <div onClick={() => selectCat(cat.value, 1)} style={chipStyle(isActive)}>
                {cat.icon && <span>{cat.icon}</span>}
                <span>{getCatLabel(cat, lang)}</span>
                {hasL2 && <svg width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ opacity: 0.5 }}><polyline points="6 9 12 15 18 9"/></svg>}
              </div>
              {/* L2 Dropdown */}
              {hasL2 && isHovered && (
                <div onMouseEnter={keepHover} onMouseLeave={clearHover}
                  style={{ position: 'absolute', top: '100%', left: 0, marginTop: '4px', background: 'white', border: '0.5px solid #e5e5ea', borderRadius: '10px', padding: '6px', zIndex: 200, minWidth: '200px', boxShadow: '0 8px 24px rgba(0,0,0,0.10)' }}>
                  {cat.children.map(l2 => {
                    const hasL3 = l2.children?.length > 0
                    const isL2Hovered = hoveredL2 === l2.value
                    return (
                      <div key={l2.value} style={{ position: 'relative' }}
                        onMouseEnter={() => { keepHover(); setHoveredL2(l2.value) }}
                        onMouseLeave={() => setHoveredL2(null)}>
                        <div onClick={() => selectCat(l2.value, 2)}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', borderRadius: '7px', cursor: 'pointer', fontSize: '12.5px', color: path[1] === l2.value ? '#0071e3' : '#1d1d1f', fontWeight: path[1] === l2.value ? '500' : '400', background: isL2Hovered ? '#f5f5f7' : 'transparent' }}>
                          <span>{getCatLabel(l2, lang)}</span>
                          {hasL3 && <svg width="10" height="10" fill="none" stroke="#aeaeb2" strokeWidth="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>}
                        </div>
                        {/* L3 Dropdown */}
                        {hasL3 && isL2Hovered && (
                          <div onMouseEnter={keepHover}
                            style={{ position: 'absolute', top: 0, left: '100%', marginLeft: '4px', background: 'white', border: '0.5px solid #e5e5ea', borderRadius: '10px', padding: '6px', zIndex: 300, minWidth: '180px', boxShadow: '0 8px 24px rgba(0,0,0,0.10)' }}>
                            {l2.children.map(l3 => (
                              <div key={l3.value} onClick={() => selectCat(l3.value, 3)}
                                style={{ padding: '7px 10px', borderRadius: '7px', cursor: 'pointer', fontSize: '12px', color: path[2] === l3.value ? '#0071e3' : '#1d1d1f', fontWeight: path[2] === l3.value ? '500' : '400' }}
                                onMouseEnter={e => e.currentTarget.style.background = '#f5f5f7'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                {getCatLabel(l3, lang)}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
