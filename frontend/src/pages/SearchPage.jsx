import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { searchProducts } from '../lib/api'

const CATEGORIES = [
  { label: 'Tümü', value: '' },
  { label: '🏠 Home & Kitchen', value: 'Home & Kitchen' },
  { label: '🏃 Sports', value: 'Sports & Outdoors' },
  { label: '🔌 Electronics', value: 'Electronics' },
  { label: '👶 Baby', value: 'Baby' },
  { label: '🐾 Pet Supplies', value: 'Pet Supplies' },
  { label: '🌿 Garden', value: 'Patio, Lawn & Garden' },
  { label: '💊 Health', value: 'Health & Household' },
  { label: '🎨 Arts & Crafts', value: 'Arts, Crafts & Sewing' },
  { label: '🚗 Automotive', value: 'Automotive' },
  { label: '👗 Clothing', value: 'Clothing, Shoes & Jewelry' },
  { label: '🧸 Toys', value: 'Toys & Games' },
  { label: '🔧 Tools', value: 'Tools & Home Improvement' },
  { label: '🍕 Grocery', value: 'Grocery & Gourmet Food' },
]

const MARKETS = [
  { flag: '🇺🇸', label: 'amazon.com', value: 'US' },
  { flag: '🇩🇪', label: 'amazon.de', value: 'DE' },
  { flag: '🇬🇧', label: 'amazon.co.uk', value: 'UK' },
  { flag: '🇫🇷', label: 'amazon.fr', value: 'FR' },
  { flag: '🇨🇦', label: 'amazon.ca', value: 'CA' },
]

const SCORE_COLOR = (s) => s >= 70 ? '#34c759' : s >= 50 ? '#ff9f0a' : '#ff3b30'
const SCORE_BG = (s) => s >= 70 ? '#e8f9ee' : s >= 50 ? '#fff4e0' : '#fff1f0'
const SCORE_TEXT = (s) => s >= 70 ? '#1a7f37' : s >= 50 ? '#b45309' : '#c00'

const seededRandom = (seed) => {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

const getMockData = (asin) => {
  const seed = asin.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const bsr = Math.floor(seededRandom(seed) * 20000) + 200
  const reviews = Math.floor(seededRandom(seed + 1) * 4000) + 50
  const sellers = Math.floor(seededRandom(seed + 2) * 15) + 1
  const fba = seededRandom(seed + 3) > 0.35 // %65 FBA
  const points = Array.from({ length: 8 }, (_, i) =>
    Math.floor(seededRandom(seed + i + 10) * 60) + 20
  )
  return { bsr, reviews, sellers, fba, points }
}

const bsrToSales = (bsr) => {
  if (!bsr) return 50
  if (bsr < 500) return Math.floor(seededRandom(bsr) * 1000) + 800
  if (bsr < 2000) return Math.floor(seededRandom(bsr) * 500) + 300
  if (bsr < 5000) return Math.floor(seededRandom(bsr) * 200) + 100
  if (bsr < 15000) return Math.floor(seededRandom(bsr) * 100) + 30
  return Math.floor(seededRandom(bsr) * 30) + 5
}

const estRevenue = (sales, price) => {
  const monthly = sales * 30 * (price || 0)
  if (monthly >= 100000) return `$${(monthly / 1000).toFixed(0)}K`
  if (monthly >= 1000) return `$${(monthly / 1000).toFixed(1)}K`
  return `$${monthly.toFixed(0)}`
}

const revenueColor = (sales, price) => {
  const monthly = sales * 30 * (price || 0)
  if (monthly >= 50000) return { color: '#1a7f37', bg: '#e8f9ee' }
  if (monthly >= 10000) return { color: '#b45309', bg: '#fff4e0' }
  return { color: '#8e8e93', bg: '#f5f5f7' }
}

const sortData = (data, key, dir) => {
  return [...data].sort((a, b) => {
    const mockA = getMockData(a.asin)
    const mockB = getMockData(b.asin)
    const getVal = (p, mock) => {
      if (key === 'price') return p.price || 0
      if (key === 'bsr') return p.bestseller_rank || mock.bsr
      if (key === 'reviews') return p.reviews_count || mock.reviews
      if (key === 'sales') return bsrToSales(p.bestseller_rank || mock.bsr)
      if (key === 'revenue') return bsrToSales(p.bestseller_rank || mock.bsr) * 30 * (p.price || 0)
      if (key === 'sellers') return p.sellers_count || mock.sellers
      if (key === 'rating') return p.rating || 0
      if (key === 'niche') return p.niche_score || 0
      return 0
    }
    const valA = getVal(a, mockA)
    const valB = getVal(b, mockB)
    return dir === 'asc' ? valA - valB : valB - valA
  })
}

const MiniChart = ({ points, color }) => {
  const max = Math.max(...points)
  const min = Math.min(...points)
  const range = max - min || 1
  const normalize = (v) => 24 - ((v - min) / range) * 20
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * 9} ${normalize(p)}`).join(' ')
  return (
    <svg width="63" height="28" viewBox="0 0 63 28" style={{ display: 'block' }}>
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const SortHeader = ({ label, sortKey, currentKey, currentDir, onClick, center }) => (
  <div onClick={onClick} style={{
    textAlign: center ? 'center' : 'right',
    cursor: sortKey ? 'pointer' : 'default',
    color: currentKey === sortKey ? '#0071e3' : '#aeaeb2',
    display: 'flex', alignItems: 'center',
    justifyContent: center ? 'center' : 'flex-end',
    gap: '3px', userSelect: 'none',
    fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.4px'
  }}>
    {label}
    {sortKey && (
      <span style={{ fontSize: '9px' }}>
        {currentKey === sortKey ? (currentDir === 'desc' ? '↓' : '↑') : '↕'}
      </span>
    )}
  </div>
)

function SearchPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [keyword, setKeyword] = useState(searchParams.get('q') || '')
  const [selectedCat, setSelectedCat] = useState(searchParams.get('cat') || '')
  const [selectedMarket, setSelectedMarket] = useState(searchParams.get('market') || 'US')
  const [showMarketDD, setShowMarketDD] = useState(false)
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sortKey, setSortKey] = useState('revenue')
  const [sortDir, setSortDir] = useState('desc')
  const [filters, setFilters] = useState({
    priceMin: '', priceMax: '', bsrMax: '',
    reviewsMax: '', ratingMin: '', revenueMin: '',
    fbaOnly: false, maxSellers: ''
  })

  const currentMarket = MARKETS.find(m => m.value === selectedMarket) || MARKETS[0]

  useEffect(() => {
    const q = searchParams.get('q')
    if (q) { setKeyword(q); doSearch(q) }
  }, [])

  const doSearch = async (q) => {
    const term = q || keyword
    if (!term.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await searchProducts(term)
      setResults(res.data.results || [])
      setSearchParams({ q: term, cat: selectedCat, market: selectedMarket })
    } catch (err) {
      setError('Arama sırasında hata oluştu.')
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const filtered = useMemo(() => {
    let data = selectedCat
      ? results.filter(p => p.category?.toLowerCase().includes(selectedCat.toLowerCase()))
      : results

    data = data.filter(p => {
      const mock = getMockData(p.asin)
      const price = p.price || 0
      const bsr = p.bestseller_rank || mock.bsr
      const reviews = p.reviews_count || mock.reviews
      const rating = p.rating || 0
      const sales = bsrToSales(bsr)
      const revenue = sales * 30 * price
      const sellers = p.sellers_count || mock.sellers
      const fba = p.fba_status === 'FBA' || mock.fba

      if (filters.priceMin && price < parseFloat(filters.priceMin)) return false
      if (filters.priceMax && price > parseFloat(filters.priceMax)) return false
      if (filters.bsrMax && bsr > parseInt(filters.bsrMax)) return false
      if (filters.reviewsMax && reviews > parseInt(filters.reviewsMax)) return false
      if (filters.ratingMin && rating < parseFloat(filters.ratingMin)) return false
      if (filters.revenueMin && revenue < parseFloat(filters.revenueMin) * 1000) return false
      if (filters.fbaOnly && !fba) return false
      if (filters.maxSellers && sellers > parseInt(filters.maxSellers)) return false
      return true
    })

    if (sortKey) data = sortData(data, sortKey, sortDir)
    return data
  }, [results, selectedCat, sortKey, sortDir, filters])

  const activeFilterCount = Object.values(filters).filter(v => v !== '' && v !== false).length

  const totalMarketSize = useMemo(() => {
    return filtered.reduce((acc, p) => {
      const mock = getMockData(p.asin)
      const bsr = p.bestseller_rank || mock.bsr
      const sales = bsrToSales(bsr)
      return acc + sales * 30 * (p.price || 0)
    }, 0)
  }, [filtered])

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Topbar */}
      <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '14px 16px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ fontSize: '18px', fontWeight: '600', color: '#1d1d1f', letterSpacing: '-0.3px' }}>Ürün Araştırması</div>
          <div style={{ position: 'relative' }}>
            <div onClick={() => setShowMarketDD(!showMarketDD)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f5f5f7', border: '0.5px solid #d2d2d7', borderRadius: '8px', padding: '7px 12px', cursor: 'pointer', fontSize: '13px', color: '#1d1d1f' }}>
              <span>{currentMarket.flag}</span><span>{currentMarket.label}</span>
              <svg width="11" height="11" fill="none" stroke="#aeaeb2" strokeWidth="1.5" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9" /></svg>
            </div>
            {showMarketDD && (
              <div style={{ position: 'absolute', top: '38px', right: 0, background: 'white', border: '0.5px solid #d2d2d7', borderRadius: '10px', padding: '6px', zIndex: 100, minWidth: '160px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                {MARKETS.map(m => (
                  <div key={m.value} onClick={() => { setSelectedMarket(m.value); setShowMarketDD(false) }}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '7px', cursor: 'pointer', fontSize: '13px', background: selectedMarket === m.value ? '#f0f0f5' : 'transparent', fontWeight: selectedMarket === m.value ? '500' : '400', color: '#1d1d1f' }}>
                    <span>{m.flag}</span><span>{m.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input type="text" value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && doSearch()}
            placeholder="Keyword veya ASIN gir... (örn: yoga mat, B07YX93GFC)"
            style={{ flex: 1, padding: '9px 14px', borderRadius: '8px', border: '0.5px solid #d2d2d7', fontSize: '13px', fontFamily: 'inherit', color: '#1d1d1f', outline: 'none', background: '#f5f5f7' }}
          />
          <button onClick={() => doSearch()} disabled={loading} style={{ background: '#0071e3', color: 'white', border: 'none', padding: '9px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
            {loading ? 'Aranıyor...' : 'Ara'}
          </button>
          <button onClick={() => setShowFilterPanel(!showFilterPanel)} style={{ background: showFilterPanel ? '#1d1d1f' : 'white', color: showFilterPanel ? 'white' : '#1d1d1f', border: '0.5px solid #d2d2d7', padding: '9px 14px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="11" y1="18" x2="13" y2="18" />
            </svg>
            Filtrele {activeFilterCount > 0 && `(${activeFilterCount})`}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
          {CATEGORIES.map(cat => (
            <div key={cat.value} onClick={() => setSelectedCat(cat.value)} style={{ fontSize: '12px', padding: '5px 12px', borderRadius: '20px', border: `0.5px solid ${selectedCat === cat.value ? '#1d1d1f' : '#d2d2d7'}`, background: selectedCat === cat.value ? '#1d1d1f' : 'white', color: selectedCat === cat.value ? 'white' : '#3c3c43', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {cat.label}
            </div>
          ))}
        </div>
      </div>

      {/* Filtre Paneli */}
      {showFilterPanel && (
        <div style={{ background: 'white', borderRadius: '10px', border: '0.5px solid #e5e5ea', padding: '16px', marginBottom: '10px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px', marginBottom: '12px' }}>
            {[
              { label: 'Min Fiyat ($)', key: 'priceMin', placeholder: '0' },
              { label: 'Max Fiyat ($)', key: 'priceMax', placeholder: '999' },
              { label: 'Max BSR', key: 'bsrMax', placeholder: '50000' },
              { label: 'Max Yorum', key: 'reviewsMax', placeholder: '5000' },
              { label: 'Min Puan', key: 'ratingMin', placeholder: '3.5' },
              { label: 'Min Gelir (K$)', key: 'revenueMin', placeholder: '10' },
            ].map(f => (
              <div key={f.key}>
                <div style={{ fontSize: '11px', color: '#8e8e93', marginBottom: '4px' }}>{f.label}</div>
                <input type="number" placeholder={f.placeholder} value={filters[f.key]}
                  onChange={e => setFilters(prev => ({ ...prev, [f.key]: e.target.value }))}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '7px', border: '0.5px solid #d2d2d7', fontSize: '13px', fontFamily: 'inherit', outline: 'none', color: '#1d1d1f', boxSizing: 'border-box' }}
                />
              </div>
            ))}
          </div>
          {/* Ekstra filtreler */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', paddingTop: '12px', borderTop: '0.5px solid #f5f5f7' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', color: '#1d1d1f' }}>
              <input type="checkbox" checked={filters.fbaOnly}
                onChange={e => setFilters(prev => ({ ...prev, fbaOnly: e.target.checked }))}
                style={{ width: '14px', height: '14px', cursor: 'pointer' }}
              />
              Sadece FBA
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#8e8e93' }}>Max Satıcı:</span>
              <input type="number" placeholder="10" value={filters.maxSellers}
                onChange={e => setFilters(prev => ({ ...prev, maxSellers: e.target.value }))}
                style={{ width: '70px', padding: '6px 10px', borderRadius: '7px', border: '0.5px solid #d2d2d7', fontSize: '13px', fontFamily: 'inherit', outline: 'none', color: '#1d1d1f' }}
              />
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
              <button onClick={() => setFilters({ priceMin: '', priceMax: '', bsrMax: '', reviewsMax: '', ratingMin: '', revenueMin: '', fbaOnly: false, maxSellers: '' })}
                style={{ padding: '7px 14px', border: '0.5px solid #d2d2d7', borderRadius: '7px', background: 'white', fontSize: '12px', cursor: 'pointer', color: '#1d1d1f', fontFamily: 'inherit' }}>
                Temizle
              </button>
              <button onClick={() => setShowFilterPanel(false)}
                style={{ padding: '7px 14px', background: '#0071e3', color: 'white', border: 'none', borderRadius: '7px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                Uygula
              </button>
            </div>
          </div>
        </div>
      )}

      {error && <p style={{ color: '#ff3b30', marginBottom: '12px', fontSize: '13px' }}>{error}</p>}

      {filtered.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', padding: '0 4px' }}>
          <div style={{ fontSize: '13px', color: '#8e8e93' }}>
            {filtered.length} ürün · {keyword && `"${keyword}"`}
            {selectedCat && ` · ${selectedCat}`}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ fontSize: '11px', color: '#8e8e93' }}>Tahmini Pazar</div>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#1a7f37', background: '#e8f9ee', padding: '4px 12px', borderRadius: '20px' }}>
              🔥 ${totalMarketSize >= 1000000 ? `${(totalMarketSize / 1000000).toFixed(1)}M` : totalMarketSize >= 1000 ? `${(totalMarketSize / 1000).toFixed(0)}K` : totalMarketSize.toFixed(0)}/ay
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px', color: '#8e8e93' }}>
          <div style={{ width: '28px', height: '28px', border: '2px solid #f0f0f5', borderTop: '2px solid #0071e3', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }}></div>
          <div style={{ fontSize: '13px' }}>Aranıyor...</div>
        </div>
      )}

      {!loading && results.length === 0 && !error && (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: '#8e8e93' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔍</div>
          <div style={{ fontSize: '15px', fontWeight: '500', color: '#1d1d1f', marginBottom: '6px' }}>Aramaya başla</div>
          <div style={{ fontSize: '13px' }}>Keyword veya ASIN girerek Amazon'da ürün araştır</div>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <>
          {/* Tablo Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '46px 1fr 58px 65px 75px 72px 62px 78px 75px 50px 36px', gap: '7px', padding: '0 16px 8px' }}>
            <div></div>
            <div style={{ fontSize: '10px', color: '#aeaeb2', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Ürün</div>
            <SortHeader label="Fiyat" sortKey="price" currentKey={sortKey} currentDir={sortDir} onClick={() => handleSort('price')} />
            <div style={{ fontSize: '10px', color: '#aeaeb2', textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'center' }}>Trend</div>
            <SortHeader label="BSR" sortKey="bsr" currentKey={sortKey} currentDir={sortDir} onClick={() => handleSort('bsr')} />
            <SortHeader label="Yorum" sortKey="reviews" currentKey={sortKey} currentDir={sortDir} onClick={() => handleSort('reviews')} />
            <SortHeader label="Est.Sales" sortKey="sales" currentKey={sortKey} currentDir={sortDir} onClick={() => handleSort('sales')} />
            <SortHeader label="🔥 Revenue" sortKey="revenue" currentKey={sortKey} currentDir={sortDir} onClick={() => handleSort('revenue')} />
            <SortHeader label="Satıcı/FBA" sortKey="sellers" currentKey={sortKey} currentDir={sortDir} onClick={() => handleSort('sellers')} />
            <SortHeader label="Puan" sortKey="rating" currentKey={sortKey} currentDir={sortDir} onClick={() => handleSort('rating')} />
            <SortHeader label="Niş" sortKey="niche" currentKey={sortKey} currentDir={sortDir} onClick={() => handleSort('niche')} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {filtered.map((product) => {
              const mock = getMockData(product.asin)
              const bsr = product.bestseller_rank || mock.bsr
              const reviews = product.reviews_count || mock.reviews
              const sales = bsrToSales(bsr)
              const score = product.niche_score || 0
              const color = SCORE_COLOR(score)
              const revenue = estRevenue(sales, product.price)
              const revStyle = revenueColor(sales, product.price)
              const sellers = product.sellers_count || mock.sellers
              const fba = product.fba_status || (mock.fba ? 'FBA' : 'FBM')

              return (
                <div key={product.asin}
                  onClick={() => navigate(`/app/product/${product.asin}`)}
                  style={{ background: 'white', borderRadius: '10px', border: '0.5px solid #e5e5ea', padding: '11px 16px', cursor: 'pointer', transition: 'border-color 0.15s', display: 'grid', gridTemplateColumns: '46px 1fr 58px 65px 75px 72px 62px 78px 75px 50px 36px', gap: '7px', alignItems: 'center' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#0071e3'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#e5e5ea'}
                >
                  {/* Görsel */}
                  <div style={{ width: '46px', height: '46px', borderRadius: '8px', background: '#f5f5f7', overflow: 'hidden', flexShrink: 0 }}>
                    {product.image && <img src={product.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />}
                  </div>

                  {/* Ürün */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '12.5px', fontWeight: '500', color: '#1d1d1f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '4px' }}>
                      {product.title}
                    </div>
                    <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                      <span style={{ fontSize: '10px', color: '#aeaeb2', fontFamily: 'monospace' }}>{product.asin}</span>
                      {product.in_stock === false && <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '3px', background: '#fff1f0', color: '#c00', fontWeight: '500' }}>Stokta Yok</span>}
                    </div>
                    <div style={{ height: '3px', background: '#f0f0f5', borderRadius: '2px', marginTop: '5px' }}>
                      <div style={{ height: '100%', borderRadius: '2px', background: color, width: `${score}%` }}></div>
                    </div>
                  </div>

                  {/* Fiyat */}
                  <div style={{ textAlign: 'right', fontSize: '12.5px', fontWeight: '500', color: '#1d1d1f' }}>
                    {product.price ? `$${product.price}` : '-'}
                  </div>

                  {/* Mini Grafik */}
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <MiniChart points={mock.points} color="#0071e3" />
                  </div>

                  {/* BSR */}
                  <div style={{ textAlign: 'right', fontSize: '12px', color: '#1d1d1f' }}>
                    #{bsr.toLocaleString()}
                  </div>

                  {/* Yorum */}
                  <div style={{ textAlign: 'right', fontSize: '12px', color: '#1d1d1f' }}>
                    {reviews.toLocaleString()}
                  </div>

                  {/* Est. Sales */}
                  <div style={{ textAlign: 'right', fontSize: '12px', color: '#1d1d1f' }}>
                    ~{sales.toLocaleString()}
                  </div>

                  {/* Revenue */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-block', fontSize: '11.5px', fontWeight: '600', color: revStyle.color, background: revStyle.bg, padding: '3px 7px', borderRadius: '6px' }}>
                      {revenue}/ay
                    </div>
                  </div>

                  {/* Satıcı / FBA */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: fba === 'FBA' ? '#0071e3' : '#b45309', marginBottom: '2px' }}>
                      {fba}
                    </div>
                    <div style={{ fontSize: '10px', color: '#8e8e93' }}>
                      👥 {sellers} satıcı
                    </div>
                  </div>

                  {/* Puan */}
                  <div style={{ textAlign: 'right', fontSize: '12px', color: '#1d1d1f' }}>
                    {product.rating ? `${product.rating} ⭐` : '-'}
                  </div>

                  {/* Niş */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '34px', height: '34px', borderRadius: '50%', background: SCORE_BG(score), fontSize: '11px', fontWeight: '600', color: SCORE_TEXT(score) }}>
                      {score || '-'}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

export default SearchPage
