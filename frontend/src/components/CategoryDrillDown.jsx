import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
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

// Dile göre kategori adı
export const getCatLabel = (cat, lang) => lang === 'tr' ? cat.label : (cat.value || cat.label)

// Seçili kategoriyi bul (tüm seviyelerde)
function findCatByValue(val) {
  for (const l1 of AMAZON_CATEGORIES) {
    if (l1.value === val) return l1
    for (const l2 of (l1.children || [])) {
      if (l2.value === val) return l2
      for (const l3 of (l2.children || [])) {
        if (l3.value === val) return l3
      }
    }
  }
  return null
}

const PANEL_WIDTH = 200
const PANEL_MAX_HEIGHT = 380

export default function CategoryDrillDown({ selected, onSelect }) {
  const { i18n } = useTranslation()
  const lang = i18n.language?.split('-')[0] || 'tr'
  const [open, setOpen] = useState(false)
  const [hoveredL1, setHoveredL1] = useState(null)
  const [hoveredL2, setHoveredL2] = useState(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const triggerRef = useRef(null)
  const menuRef = useRef(null)

  const selectedCat = selected ? findCatByValue(selected) : null

  const openMenu = () => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    // Menünün ekran dışına çıkmasını önle
    const menuWidth = PANEL_WIDTH * 3
    let left = rect.left
    if (left + menuWidth > window.innerWidth - 16) {
      left = Math.max(8, window.innerWidth - menuWidth - 16)
    }
    setPos({ top: rect.bottom + 6, left })
    setOpen(true)
  }

  // Dışarı tıklamada kapat
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (
        !menuRef.current?.contains(e.target) &&
        !triggerRef.current?.contains(e.target)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const selectAndClose = (val) => {
    onSelect(val)
    setOpen(false)
  }

  const activeL1Cat = AMAZON_CATEGORIES.find(c => c.value === hoveredL1)
  const activeL2Cat = activeL1Cat?.children?.find(c => c.value === hoveredL2)

  return (
    <>
      {/* Trigger */}
      <div ref={triggerRef} onClick={openMenu}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '7px 12px', borderRadius: '8px', cursor: 'pointer',
          fontSize: '12.5px', fontWeight: selected ? '500' : '400',
          background: selected ? '#1d1d1f' : 'white',
          color: selected ? 'white' : '#3c3c43',
          border: `0.5px solid ${selected ? '#1d1d1f' : '#d2d2d7'}`,
          userSelect: 'none', transition: 'all 0.12s',
          maxWidth: '240px',
        }}>
        <span style={{ fontSize: '14px' }}>
          {selectedCat?.icon || '🌐'}
        </span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedCat
            ? getCatLabel(selectedCat, lang)
            : (lang === 'tr' ? 'Tüm Kategoriler' : 'All Categories')}
        </span>
        {selected && (
          <span onClick={e => { e.stopPropagation(); selectAndClose('') }}
            style={{ marginLeft: '2px', opacity: 0.6, fontSize: '11px', lineHeight: 1 }}>✕</span>
        )}
        <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5"
          viewBox="0 0 24 24" style={{ opacity: 0.5, flexShrink: 0 }}>
          <polyline points={open ? '18 15 12 9 6 15' : '6 9 12 15 18 9'} />
        </svg>
      </div>

      {/* Portal: Amazon-style 3-panel mega menu */}
      {open && createPortal(
        <div ref={menuRef}
          style={{
            position: 'fixed', top: pos.top, left: pos.left,
            zIndex: 99999, display: 'flex', flexDirection: 'row',
            background: 'white', border: '0.5px solid #e5e5ea',
            borderRadius: '12px', boxShadow: '0 16px 48px rgba(0,0,0,0.18)',
            overflow: 'hidden',
          }}>

          {/* Panel 1: L1 Kategoriler */}
          <div style={{ width: PANEL_WIDTH, overflowY: 'auto', maxHeight: PANEL_MAX_HEIGHT }}>
            <div style={sectionHeader}>
              {lang === 'tr' ? 'Departman' : 'Department'}
            </div>
            <MenuItem
              label={lang === 'tr' ? 'Tüm Kategoriler' : 'All Categories'}
              icon="🌐"
              active={!selected}
              onClick={() => selectAndClose('')}
            />
            {AMAZON_CATEGORIES.slice(1).map(cat => (
              <MenuItem
                key={cat.value}
                label={getCatLabel(cat, lang)}
                icon={cat.icon}
                hasChildren={!!cat.children}
                active={selected === cat.value}
                highlighted={hoveredL1 === cat.value}
                onMouseEnter={() => { setHoveredL1(cat.value); setHoveredL2(null) }}
                onClick={() => { if (!cat.children) { selectAndClose(cat.value) } else { setHoveredL1(cat.value) } }}
              />
            ))}
          </div>

          {/* Panel 2: L2 Alt kategoriler */}
          {activeL1Cat?.children && (
            <div style={{
              width: PANEL_WIDTH, overflowY: 'auto', maxHeight: PANEL_MAX_HEIGHT,
              borderLeft: '0.5px solid #f0f0f0',
            }}>
              <div style={sectionHeader}>{getCatLabel(activeL1Cat, lang)}</div>
              {activeL1Cat.children.map(l2 => (
                <MenuItem
                  key={l2.value}
                  label={getCatLabel(l2, lang)}
                  hasChildren={!!l2.children}
                  active={selected === l2.value}
                  highlighted={hoveredL2 === l2.value}
                  onMouseEnter={() => setHoveredL2(l2.value)}
                  onClick={() => selectAndClose(l2.value)}
                />
              ))}
            </div>
          )}

          {/* Panel 3: L3 Alt-alt kategoriler */}
          {activeL2Cat?.children && (
            <div style={{
              width: PANEL_WIDTH, overflowY: 'auto', maxHeight: PANEL_MAX_HEIGHT,
              borderLeft: '0.5px solid #f0f0f0',
            }}>
              <div style={sectionHeader}>{getCatLabel(activeL2Cat, lang)}</div>
              {activeL2Cat.children.map(l3 => (
                <MenuItem
                  key={l3.value}
                  label={getCatLabel(l3, lang)}
                  active={selected === l3.value}
                  onClick={() => selectAndClose(l3.value)}
                />
              ))}
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  )
}

// ─── Alt bileşenler ──────────────────────────────────────────────────────────

function MenuItem({ label, icon, hasChildren, active, highlighted, onMouseEnter, onClick }) {
  return (
    <div
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '8px 12px', cursor: 'pointer', fontSize: '12.5px',
        color: active ? '#0071e3' : '#1d1d1f',
        fontWeight: active ? '500' : '400',
        background: highlighted ? '#f5f5f7' : active ? '#f0f6ff' : 'transparent',
        transition: 'background 0.08s',
      }}>
      {icon && <span style={{ fontSize: '13px', lineHeight: 1, flexShrink: 0 }}>{icon}</span>}
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      {hasChildren && (
        <svg width="9" height="9" fill="none" stroke="#aeaeb2" strokeWidth="2.5"
          viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
          <polyline points="9 18 15 12 9 6" />
        </svg>
      )}
    </div>
  )
}

const sectionHeader = {
  fontSize: '10px', color: '#8e8e93', padding: '10px 12px 5px',
  fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.6px',
  borderBottom: '0.5px solid #f5f5f7',
}
