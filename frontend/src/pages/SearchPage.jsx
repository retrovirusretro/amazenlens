import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import { searchProducts } from '../lib/api'
import { track, Events } from '../lib/analytics'
import CategoryDrillDown, { AMAZON_CATEGORIES, getCatLabel } from '../components/CategoryDrillDown'

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

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

const seededRandom = (seed) => { const x = Math.abs(Math.sin(seed + 1) * 10000); return x - Math.floor(x) }

const getMockData = (asin) => {
  const seed = asin.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return {
    bsr: Math.floor(seededRandom(seed) * 20000) + 200,
    reviews: Math.floor(seededRandom(seed + 1) * 4000) + 50,
    sellers: Math.floor(seededRandom(seed + 2) * 15) + 1,
    fba: seededRandom(seed + 3) > 0.35,
    points: Array.from({ length: 8 }, (_, i) => Math.floor(seededRandom(seed + i + 10) * 60) + 20)
  }
}

const bsrToSales = (bsr) => {
  if (!bsr || bsr <= 0) return 0
  // Power-law formulu — akademik literatür (Sports & Outdoors kategorisi)
  const k = 1900, alpha = 0.78
  const sales = Math.round(k * Math.pow(bsr, -alpha))
  return Math.max(1, sales)
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
    const getVal = (p) => {
      if (key === 'price') return p.price || 0
      if (key === 'bsr') return p.bestseller_rank || 0
      if (key === 'reviews') return p.reviews_count || 0
      if (key === 'sales') return bsrToSales(p.bestseller_rank || 0)
      if (key === 'revenue') return bsrToSales(p.bestseller_rank || 0) * 30 * (p.price || 0)
      if (key === 'sellers') return p.sellers_count || 0
      if (key === 'rating') return p.rating || 0
      if (key === 'niche') return p.niche_score || 0
      return 0
    }
    const valA = getVal(a), valB = getVal(b)
    return dir === 'asc' ? valA - valB : valB - valA
  })
}

const MiniChart = ({ points, color }) => {
  const max = Math.max(...points), min = Math.min(...points)
  const range = max - min || 1
  const normalize = (v) => 24 - ((v - min) / range) * 20
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * 9} ${normalize(p)}`).join(' ')
  return (
    <svg width="63" height="28" viewBox="0 0 63 28" style={{ display: 'block' }}>
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const SortHeader = ({ label, sortKey, currentKey, currentDir, onClick }) => (
  <div onClick={onClick} style={{ textAlign: 'right', cursor: sortKey ? 'pointer' : 'default', color: currentKey === sortKey ? '#0071e3' : '#aeaeb2', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '3px', userSelect: 'none', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
    {label}
    {sortKey && <span style={{ fontSize: '9px' }}>{currentKey === sortKey ? (currentDir === 'desc' ? '↓' : '↑') : '↕'}</span>}
  </div>
)

function SearchPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
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
  const [filters, setFilters] = useState({ priceMin: '', priceMax: '', bsrMax: '', reviewsMax: '', ratingMin: '', revenueMin: '', fbaOnly: false, maxSellers: '' })

  // Watchlist state (localStorage)
  const [watchlist, setWatchlist] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('watchlist_asins') || '[]')) }
    catch { return new Set() }
  })
  const [watchTooltip, setWatchTooltip] = useState(null) // asin of recently added
  const tooltipTimerRef = useRef(null)

  // Trend Radar
  const [trendData, setTrendData] = useState(null)
  const [trendLoading, setTrendLoading] = useState(false)

  // AI Keyword Suggestions
  const [aiSuggestions, setAiSuggestions] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)

  const currentMarket = MARKETS.find(m => m.value === selectedMarket) || MARKETS[0]

  useEffect(() => {
    const q = searchParams.get('q')
    if (q) { setKeyword(q); doSearch(q) }
  }, [])

  const toggleWatchlist = (product) => {
    const newSet = new Set(watchlist)
    const user = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}') } catch { return {} } })()
    if (newSet.has(product.asin)) {
      newSet.delete(product.asin)
    } else {
      newSet.add(product.asin)
      // Show tooltip
      if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current)
      setWatchTooltip(product.asin)
      tooltipTimerRef.current = setTimeout(() => setWatchTooltip(null), 1500)
      // POST to backend (fire-and-forget)
      if (user.email) {
        axios.post(`${API}/api/amazon/watchlist`, {
          user_email: user.email,
          asin: product.asin,
          title: product.title || '',
          price: product.price || 0,
          image: product.image || '',
          niche_score: product.niche_score || 0,
          bsr: product.bestseller_rank || 0,
        }).catch(() => {})
      }
    }
    localStorage.setItem('watchlist_asins', JSON.stringify([...newSet]))
    setWatchlist(newSet)
  }

  const fetchTrend = async (term) => {
    setTrendLoading(true)
    setTrendData(null)
    try {
      const res = await axios.get(`${API}/api/trends/keyword`, { params: { keyword: term, timeframe: 'today+12-m' }, timeout: 6000 })
      setTrendData(res.data)
    } catch {
      setTrendData(null)
    } finally {
      setTrendLoading(false)
    }
  }

  const fetchAiSuggestions = async (term, resultList) => {
    setAiLoading(true)
    setAiSuggestions(null)
    try {
      const avgPrice = resultList.length
        ? resultList.reduce((s, p) => s + (p.price || 0), 0) / resultList.length
        : 0
      const avgBsr = resultList.length
        ? Math.round(resultList.reduce((s, p) => s + (p.bestseller_rank || 0), 0) / resultList.length)
        : 0
      const res = await axios.post(`${API}/api/amazon/keyword-suggest`, {
        keyword: term,
        results_count: resultList.length,
        avg_price: parseFloat(avgPrice.toFixed(2)),
        avg_bsr: avgBsr,
      }, { timeout: 15000 })
      setAiSuggestions(res.data.suggestions || [])
    } catch {
      setAiSuggestions(null)
    } finally {
      setAiLoading(false)
    }
  }

  const doSearch = async (q) => {
    const term = q || keyword
    if (!term.trim()) return
    setLoading(true)
    setError('')
    setAiSuggestions(null)
    setTrendData(null)
    try {
      const res = await searchProducts(term, 1, selectedMarket)
      const resultList = res.data.results || []
      setResults(resultList)
      setSearchParams({ q: term, cat: selectedCat, market: selectedMarket })
      track(Events.KEYWORD_SEARCH, { keyword: term, market: selectedMarket, results_count: resultList.length })
      // Fire off async extras
      fetchTrend(term)
      if (resultList.length > 0) fetchAiSuggestions(term, resultList)
    } catch (err) {
      setError(t('search.error'))
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const filtered = useMemo(() => {
    let data = selectedCat ? results.filter(p => p.category?.toLowerCase().includes(selectedCat.toLowerCase())) : results
    data = data.filter(p => {
      const price = p.price || 0
      const bsr = p.bestseller_rank || 0
      const reviews = p.reviews_count || 0
      const rating = p.rating || 0
      const sales = bsrToSales(bsr)
      const revenue = sales * 30 * price
      const sellers = p.sellers_count || 0
      const fba = p.fba_status === 'FBA'
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
      const bsr = p.bestseller_rank
      if (!bsr || bsr <= 0) return acc
      return acc + bsrToSales(bsr) * 30 * (p.price || 0)
    }, 0)
  }, [filtered])

  const marketSummary = useMemo(() => {
    if (!filtered.length) return null
    const prices = filtered.map(p => p.price || 0).filter(v => v > 0)
    const bsrs = filtered.map(p => p.bestseller_rank).filter(b => b && b > 0)
    const niches = filtered.map(p => p.niche_score || 0)
    const sellers = filtered.map(p => p.sellers_count).filter(s => s && s > 0)
    const avgPrice = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0
    const avgBsr = bsrs.length ? Math.round(bsrs.reduce((a, b) => a + b, 0) / bsrs.length) : 0
    const avgNiche = niches.length ? Math.round(niches.reduce((a, b) => a + b, 0) / niches.length) : 0
    const avgSellers = sellers.length ? Math.round(sellers.reduce((a, b) => a + b, 0) / sellers.length) : 0
    const bsrUnder5k = filtered.filter(p => p.bestseller_rank && p.bestseller_rank < 5000).length
    const opportunityScore = filtered.length ? Math.round((bsrUnder5k / filtered.length) * 5) : 0
    const competition = avgSellers <= 3 ? 'Düşük' : avgSellers <= 7 ? 'Orta' : 'Yüksek'
    const competitionPct = Math.min(100, Math.round((avgSellers / 15) * 100))
    return { avgPrice, avgBsr, avgNiche, avgSellers, opportunityScore, competition, competitionPct, bsrUnder5k }
  }, [filtered])

  // Seçili kategori label'ını bul
  const selectedCatLabel = (() => {
    for (const cat of AMAZON_CATEGORIES) {
      if (cat.value === selectedCat) return cat.label
      if (cat.children) {
        const child = cat.children.find(c => c.value === selectedCat)
        if (child) return child.label
      }
    }
    return 'Tüm Kategoriler'
  })()

  // Trend direction from trendData
  const trendInfo = (() => {
    if (!trendData || !trendData.interest_over_time) return null
    const vals = trendData.interest_over_time.map(d => d.value || 0)
    if (vals.length < 6) return null
    const half = Math.floor(vals.length / 2)
    const recent = vals.slice(-3).reduce((a, b) => a + b, 0) / 3
    const prev = vals.slice(half - 3, half).reduce((a, b) => a + b, 0) / 3
    if (recent > prev * 1.1) return { label: 'Yükselen trend', icon: '📈', color: '#1a7f37', bg: '#e8f9ee' }
    if (recent < prev * 0.9) return { label: 'Düşen trend', icon: '📉', color: '#c00', bg: '#fff1f0' }
    return { label: 'Stabil', icon: '➡️', color: '#8e8e93', bg: '#f5f5f7' }
  })()

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Topbar */}
      <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '14px 16px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ fontSize: '18px', fontWeight: '600', color: '#1d1d1f', letterSpacing: '-0.3px' }}>{t('search.title')}</div>
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

        <div style={{ display: 'flex', gap: '8px' }}>
          <input type="text" value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && doSearch()}
            placeholder={t('search.placeholder')}
            style={{ flex: 1, padding: '9px 14px', borderRadius: '8px', border: '0.5px solid #d2d2d7', fontSize: '13px', fontFamily: 'inherit', color: '#1d1d1f', outline: 'none', background: '#f5f5f7' }}
          />
          <button onClick={() => doSearch()} disabled={loading} style={{ background: '#0071e3', color: 'white', border: 'none', padding: '9px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
            {loading ? t('search.searching') : t('search.btn')}
          </button>
          <button onClick={() => setShowFilterPanel(!showFilterPanel)} style={{ background: showFilterPanel ? '#1d1d1f' : 'white', color: showFilterPanel ? 'white' : '#1d1d1f', border: '0.5px solid #d2d2d7', padding: '9px 14px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
            {t('search.filter')} {activeFilterCount > 0 && `(${activeFilterCount})`}
          </button>
        </div>
        {selectedCat && (
          <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: '#8e8e93' }}>Kategori:</span>
            <span style={{ fontSize: '11px', fontWeight: '500', color: '#0071e3', background: '#e8f0fe', padding: '2px 10px', borderRadius: '10px' }}>{selectedCatLabel}</span>
            <span onClick={() => setSelectedCat('')} style={{ fontSize: '11px', color: '#8e8e93', cursor: 'pointer', padding: '2px 6px', borderRadius: '6px', background: '#f5f5f7' }}>✕ Temizle</span>
          </div>
        )}
      </div>

      {/* Filtre Paneli */}
      {showFilterPanel && (
        <div style={{ background: 'white', borderRadius: '10px', border: '0.5px solid #e5e5ea', padding: '16px', marginBottom: '10px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px', marginBottom: '12px' }}>
            {[
              { label: t('search.filter_price_min'), key: 'priceMin', placeholder: '0' },
              { label: t('search.filter_price_max'), key: 'priceMax', placeholder: '999' },
              { label: t('search.filter_bsr_max'), key: 'bsrMax', placeholder: '50000' },
              { label: t('search.filter_reviews_max'), key: 'reviewsMax', placeholder: '5000' },
              { label: t('search.filter_rating_min'), key: 'ratingMin', placeholder: '3.5' },
              { label: t('search.filter_revenue_min'), key: 'revenueMin', placeholder: '10' },
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
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', paddingTop: '12px', borderTop: '0.5px solid #f5f5f7' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', color: '#1d1d1f' }}>
              <input type="checkbox" checked={filters.fbaOnly} onChange={e => setFilters(prev => ({ ...prev, fbaOnly: e.target.checked }))} style={{ width: '14px', height: '14px', cursor: 'pointer' }} />
              {t('search.fba_only')}
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#8e8e93' }}>{t('search.max_sellers')}:</span>
              <input type="number" placeholder="10" value={filters.maxSellers}
                onChange={e => setFilters(prev => ({ ...prev, maxSellers: e.target.value }))}
                style={{ width: '70px', padding: '6px 10px', borderRadius: '7px', border: '0.5px solid #d2d2d7', fontSize: '13px', fontFamily: 'inherit', outline: 'none', color: '#1d1d1f' }}
              />
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
              <button onClick={() => setFilters({ priceMin: '', priceMax: '', bsrMax: '', reviewsMax: '', ratingMin: '', revenueMin: '', fbaOnly: false, maxSellers: '' })}
                style={{ padding: '7px 14px', border: '0.5px solid #d2d2d7', borderRadius: '7px', background: 'white', fontSize: '12px', cursor: 'pointer', color: '#1d1d1f', fontFamily: 'inherit' }}>
                {t('search.clear')}
              </button>
              <button onClick={() => setShowFilterPanel(false)}
                style={{ padding: '7px 14px', background: '#0071e3', color: 'white', border: 'none', borderRadius: '7px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                {t('search.apply')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kategori Drill-Down */}
      <CategoryDrillDown selected={selectedCat} onSelect={setSelectedCat} />

      {error && <p style={{ color: '#ff3b30', marginBottom: '12px', fontSize: '13px' }}>{error}</p>}

      <div style={{ flex: 1, minWidth: 0 }}>

      {filtered.length > 0 && (
        <>
          {/* Results info bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', padding: '0 4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ fontSize: '13px', color: '#8e8e93' }}>
                {filtered.length} {t('search.products')} · {keyword && `"${keyword}"`}
                {selectedCat && ` · ${selectedCat}`}
              </div>
              {trendInfo && (
                <span style={{ fontSize: '11px', fontWeight: '500', color: trendInfo.color, background: trendInfo.bg, padding: '3px 9px', borderRadius: '12px' }}>
                  {trendInfo.icon} {trendInfo.label}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ fontSize: '11px', color: '#8e8e93' }}>{t('search.est_market')}</div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#1a7f37', background: '#e8f9ee', padding: '4px 12px', borderRadius: '20px' }}>
                🔥 ${totalMarketSize >= 1000000 ? `${(totalMarketSize / 1000000).toFixed(1)}M` : totalMarketSize >= 1000 ? `${(totalMarketSize / 1000).toFixed(0)}K` : totalMarketSize.toFixed(0)}/{t('search.per_month')}
              </div>
            </div>
          </div>

          {/* Market Summary Card */}
          {marketSummary && (
            <div style={{ background: 'white', borderRadius: '12px', border: '1.5px solid transparent', backgroundImage: 'linear-gradient(white,white), linear-gradient(90deg,#0071e3,#34c759)', backgroundOrigin: 'border-box', backgroundClip: 'padding-box,border-box', padding: '16px 20px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f' }}>
                  📊 Pazar Analizi
                  {keyword && <span style={{ fontWeight: '400', color: '#8e8e93', marginLeft: '6px' }}>"{keyword}" · {filtered.length} ürün</span>}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '14px' }}>
                {[
                  { label: 'Ort. Fiyat', value: marketSummary.avgPrice ? `$${marketSummary.avgPrice.toFixed(1)}` : '-' },
                  { label: 'Ort. BSR', value: marketSummary.avgBsr ? `#${marketSummary.avgBsr.toLocaleString()}` : '-' },
                  { label: 'Ort. Niş', value: marketSummary.avgNiche ? `${marketSummary.avgNiche}/100` : '-' },
                  { label: 'Toplam Pazar', value: totalMarketSize >= 1000000 ? `$${(totalMarketSize / 1000000).toFixed(1)}M/ay` : totalMarketSize >= 1000 ? `$${(totalMarketSize / 1000).toFixed(0)}K/ay` : '-' },
                ].map(item => (
                  <div key={item.label}>
                    <div style={{ fontSize: '10px', color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>{item.label}</div>
                    <div style={{ fontSize: '15px', fontWeight: '600', color: '#1d1d1f' }}>{item.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* Competition bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ fontSize: '11px', color: '#8e8e93', width: '70px', flexShrink: 0 }}>Rekabet:</div>
                  <div style={{ flex: 1, height: '6px', background: '#f0f0f5', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: '3px', background: marketSummary.competition === 'Düşük' ? '#34c759' : marketSummary.competition === 'Orta' ? '#ff9f0a' : '#ff3b30', width: `${marketSummary.competitionPct}%`, transition: 'width 0.4s ease' }} />
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: '500', color: marketSummary.competition === 'Düşük' ? '#1a7f37' : marketSummary.competition === 'Orta' ? '#b45309' : '#c00', whiteSpace: 'nowrap' }}>
                    {marketSummary.competition} (ort. {marketSummary.avgSellers} satıcı)
                  </div>
                </div>
                {/* Opportunity score */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ fontSize: '11px', color: '#8e8e93', width: '70px', flexShrink: 0 }}>Fırsat:</div>
                  <div style={{ display: 'flex', gap: '3px' }}>
                    {[1,2,3,4,5].map(i => (
                      <div key={i} style={{ width: '12px', height: '12px', borderRadius: '50%', background: i <= marketSummary.opportunityScore ? '#0071e3' : '#e5e5ea' }} />
                    ))}
                  </div>
                  <div style={{ fontSize: '11px', color: '#8e8e93' }}>
                    {marketSummary.opportunityScore >= 4 ? 'Mükemmel' : marketSummary.opportunityScore >= 3 ? 'İyi' : marketSummary.opportunityScore >= 2 ? 'Orta' : 'Düşük'}
                    {marketSummary.bsrUnder5k > 0 && ` — BSR < 5K: ${marketSummary.bsrUnder5k} ürün`}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px', color: '#8e8e93' }}>
          <div style={{ width: '28px', height: '28px', border: '2px solid #f0f0f5', borderTop: '2px solid #0071e3', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }}></div>
          <div style={{ fontSize: '13px' }}>{t('search.searching')}</div>
        </div>
      )}

      {!loading && results.length === 0 && !error && (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: '#8e8e93' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔍</div>
          <div style={{ fontSize: '15px', fontWeight: '500', color: '#1d1d1f', marginBottom: '6px' }}>{t('search.empty_title')}</div>
          <div style={{ fontSize: '13px' }}>{t('search.empty_desc')}</div>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '46px 1fr 58px 65px 75px 72px 62px 78px 75px 50px 36px 28px', gap: '7px', padding: '0 16px 8px' }}>
            <div></div>
            <div style={{ fontSize: '10px', color: '#aeaeb2', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{t('search.col_product')}</div>
            <SortHeader label={t('search.col_price')} sortKey="price" currentKey={sortKey} currentDir={sortDir} onClick={() => handleSort('price')} />
            <div style={{ fontSize: '10px', color: '#aeaeb2', textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'center' }}>{t('search.col_trend')}</div>
            <SortHeader label="BSR" sortKey="bsr" currentKey={sortKey} currentDir={sortDir} onClick={() => handleSort('bsr')} />
            <SortHeader label={t('search.col_reviews')} sortKey="reviews" currentKey={sortKey} currentDir={sortDir} onClick={() => handleSort('reviews')} />
            <SortHeader label={t('search.col_sales')} sortKey="sales" currentKey={sortKey} currentDir={sortDir} onClick={() => handleSort('sales')} />
            <SortHeader label={`🔥 ${t('search.col_revenue')}`} sortKey="revenue" currentKey={sortKey} currentDir={sortDir} onClick={() => handleSort('revenue')} />
            <SortHeader label={t('search.col_sellers')} sortKey="sellers" currentKey={sortKey} currentDir={sortDir} onClick={() => handleSort('sellers')} />
            <SortHeader label={t('search.col_rating')} sortKey="rating" currentKey={sortKey} currentDir={sortDir} onClick={() => handleSort('rating')} />
            <SortHeader label={t('search.col_niche')} sortKey="niche" currentKey={sortKey} currentDir={sortDir} onClick={() => handleSort('niche')} />
            <div></div>
          </div>

          {/* AI Keyword Suggestions — above product list */}
          {(aiLoading || (aiSuggestions && aiSuggestions.length > 0)) && (
            <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '16px', marginBottom: '12px' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#1d1d1f', marginBottom: '12px' }}>
                💡 AI Öneri — {keyword && `"${keyword}"`} için alternatif keyword'ler
              </div>
              {aiLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#8e8e93', fontSize: '12px' }}>
                  <div style={{ width: '14px', height: '14px', border: '2px solid #f0f0f5', borderTop: '2px solid #0071e3', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                  AI analiz ediyor...
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {aiSuggestions.map((s, i) => {
                    const oColor = s.opportunity === 'high' ? '#1a7f37' : s.opportunity === 'medium' ? '#b45309' : '#8e8e93'
                    const oBg = s.opportunity === 'high' ? '#e8f9ee' : s.opportunity === 'medium' ? '#fff4e0' : '#f5f5f7'
                    const oIcon = s.opportunity === 'high' ? '🟢' : s.opportunity === 'medium' ? '🟡' : '🔴'
                    const oLabel = s.opportunity === 'high' ? 'Yüksek fırsat' : s.opportunity === 'medium' ? 'Orta fırsat' : 'Düşük fırsat'
                    return (
                      <div key={i}
                        onClick={() => { setKeyword(s.keyword); doSearch(s.keyword) }}
                        style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', padding: '10px 12px', borderRadius: '8px', background: '#f9f9fb', cursor: 'pointer', transition: 'background 0.1s' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f0f0f8'}
                        onMouseLeave={e => e.currentTarget.style.background = '#f9f9fb'}
                      >
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: '14px', flexShrink: 0 }}>{oIcon}</span>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '500', color: '#1d1d1f', marginBottom: '2px' }}>{s.keyword}</div>
                            <div style={{ fontSize: '11px', color: '#8e8e93' }}>{s.reason}</div>
                          </div>
                        </div>
                        <span style={{ fontSize: '10px', fontWeight: '500', color: oColor, background: oBg, padding: '3px 9px', borderRadius: '10px', whiteSpace: 'nowrap', flexShrink: 0 }}>{oLabel}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {filtered.map((product) => {
              const bsr = product.bestseller_rank || 0
              const reviews = product.reviews_count || 0
              const sales = bsrToSales(bsr)
              const score = product.niche_score || 0
              const color = SCORE_COLOR(score)
              const revenue = bsr > 0 ? estRevenue(sales, product.price) : null
              const revStyle = revenueColor(sales, product.price)
              const sellers = product.sellers_count || null
              const fba = product.fba_status || null
              const miniPoints = Array.from({ length: 8 }, (_, i) => Math.floor(Math.random() * 60) + 20)

              const isWatched = watchlist.has(product.asin)
              const showTip = watchTooltip === product.asin

              return (
                <div key={product.asin}
                  onClick={() => { track(Events.PRODUCT_VIEW, { asin: product.asin, title: product.title, price: product.price }); navigate(`/app/product/${product.asin}`) }}
                  style={{ background: 'white', borderRadius: '10px', border: '0.5px solid #e5e5ea', padding: '11px 16px', cursor: 'pointer', transition: 'border-color 0.15s', display: 'grid', gridTemplateColumns: '46px 1fr 58px 65px 75px 72px 62px 78px 75px 50px 36px 28px', gap: '7px', alignItems: 'center', position: 'relative' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#0071e3'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#e5e5ea'}
                >
                  <div style={{ width: '46px', height: '46px', borderRadius: '8px', background: '#f5f5f7', overflow: 'hidden', flexShrink: 0 }}>
                    {product.image && <img src={product.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '12.5px', fontWeight: '500', color: '#1d1d1f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '4px' }}>{product.title}</div>
                    <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                      <span style={{ fontSize: '10px', color: '#aeaeb2', fontFamily: 'monospace' }}>{product.asin}</span>
                      {product.in_stock === false && <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '3px', background: '#fff1f0', color: '#c00', fontWeight: '500' }}>{t('search.out_of_stock')}</span>}
                    </div>
                    <div style={{ height: '3px', background: '#f0f0f5', borderRadius: '2px', marginTop: '5px' }}>
                      <div style={{ height: '100%', borderRadius: '2px', background: color, width: `${score}%` }}></div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '12.5px', fontWeight: '500', color: '#1d1d1f' }}>{product.price ? `$${product.price}` : '-'}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                    <MiniChart points={miniPoints} color="#d2d2d7" />
                    <span style={{ fontSize: '9px', color: '#aeaeb2' }}>Tahmini</span>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '12px', color: bsr > 0 ? '#1d1d1f' : '#d2d2d7' }}>
                    {bsr > 0 ? `#${bsr.toLocaleString()}` : '—'}
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '12px', color: reviews > 0 ? '#1d1d1f' : '#d2d2d7' }}>
                    {reviews > 0 ? reviews.toLocaleString() : '—'}
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '12px', color: sales > 0 ? '#1d1d1f' : '#d2d2d7' }}>
                    {sales > 0 ? `~${sales.toLocaleString()}` : '—'}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {revenue ? (
                      <div style={{ display: 'inline-block', fontSize: '11.5px', fontWeight: '600', color: revStyle.color, background: revStyle.bg, padding: '3px 7px', borderRadius: '6px' }}>
                        {revenue}/{t('search.per_month')}
                      </div>
                    ) : <span style={{ color: '#d2d2d7', fontSize: '12px' }}>—</span>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: fba === 'FBA' ? '#0071e3' : fba === 'FBM' ? '#b45309' : '#d2d2d7', marginBottom: '2px' }}>
                      {fba || '—'}
                    </div>
                    <div style={{ fontSize: '10px', color: '#8e8e93' }}>
                      👥 {sellers ? `${sellers} ${t('search.sellers')}` : '—'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '12px', color: '#1d1d1f' }}>{product.rating ? `${product.rating} ⭐` : '-'}</div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '34px', height: '34px', borderRadius: '50%', background: SCORE_BG(score), fontSize: '11px', fontWeight: '600', color: SCORE_TEXT(score) }}>
                      {score || '-'}
                    </div>
                  </div>
                  {/* Watchlist button */}
                  <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                    <div
                      onClick={(e) => { e.stopPropagation(); toggleWatchlist(product) }}
                      style={{ cursor: 'pointer', fontSize: '16px', color: isWatched ? '#0071e3' : '#d2d2d7', transition: 'color 0.15s', lineHeight: 1 }}
                      title={isWatched ? 'Listeden çıkar' : 'Watchlist\'e ekle'}
                    >
                      {isWatched ? '🔖' : '🏷️'}
                    </div>
                    {showTip && (
                      <div style={{ position: 'absolute', bottom: '24px', right: 0, background: '#1d1d1f', color: 'white', fontSize: '10px', padding: '4px 8px', borderRadius: '6px', whiteSpace: 'nowrap', zIndex: 10, pointerEvents: 'none' }}>
                        Eklendi ✓
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      </div>{/* sonuç alanı */}
    </div>
  )
}

export default SearchPage
