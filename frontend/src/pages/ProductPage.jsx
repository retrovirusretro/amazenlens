import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import { track, Events } from '../lib/analytics'

const API = import.meta.env.VITE_API_URL || ''
const CACHE_TTL = 60 * 60 * 1000

const SCORE_COLOR = (s) => s >= 70 ? '#34c759' : s >= 50 ? '#ff9f0a' : '#ff3b30'
const SCORE_BG = (s) => s >= 70 ? '#e8f9ee' : s >= 50 ? '#fff4e0' : '#fff1f0'
const SCORE_TEXT = (s) => s >= 70 ? '#1a7f37' : s >= 50 ? '#b45309' : '#c00'

function cacheGet(key) {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts > CACHE_TTL) { sessionStorage.removeItem(key); return null }
    return data
  } catch { return null }
}

function cacheSet(key, data) {
  try { sessionStorage.setItem(key, JSON.stringify({ data, ts: Date.now() })) } catch {}
}

export default function ProductPage() {
  const { asin } = useParams()
  const navigate = useNavigate()
  const { i18n } = useTranslation()
  const prevAsin = useRef(null)
  const lang = i18n.language?.split('-')[0] || 'tr'

  // ── Tüm useState'ler burada — hiçbir return'den önce ──
  const [product, setProduct] = useState(null)
  const [niche, setNiche] = useState(null)
  const [suppliers, setSuppliers] = useState([])
  const [arbitrage, setArbitrage] = useState(null)
  const [reviews, setReviews] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [productLoading, setProductLoading] = useState(false)
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [keepaData, setKeepaData] = useState(null)
  const [keepaLoading, setKeepaLoading] = useState(false)
  const [winReport, setWinReport] = useState(null)
  const [winLoading, setWinLoading] = useState(false)
  const [openInsight, setOpenInsight] = useState(null) // ← düzeltildi: return'lerden önce
  const [trendsData, setTrendsData] = useState(null)
  const [trendsLoading, setTrendsLoading] = useState(false)
  const [listingReport, setListingReport] = useState(null)
  const [listingLoading, setListingLoading] = useState(false)
  const [rankKeyword, setRankKeyword] = useState('')
  const [rankResults, setRankResults] = useState(null)
  const [rankLoading, setRankLoading] = useState(false)
  const [demandData, setDemandData] = useState(null)
  const [demandLoading, setDemandLoading] = useState(false)

  useEffect(() => {
    const isVariantSwitch = prevAsin.current !== null && prevAsin.current !== asin
    if (isVariantSwitch) {
      fetchProductOnly()
    } else {
      fetchAll()
    }
    prevAsin.current = asin
    setReviews(null)
  }, [asin])

  const fetchKeepa = async () => {
    setKeepaLoading(true)
    try {
      const res = await axios.get(`${API}/api/keepa/product/${asin}`)
      setKeepaData(res.data)
    } catch (e) { console.error(e) }
    finally { setKeepaLoading(false) }
  }

  const fetchWinReport = async () => {
    if (!product) return
    setWinLoading(true)
    try {
      const res = await axios.post(`${API}/api/ai/buyer-intent`, {
        keyword: product.title?.split(' ').slice(0, 4).join(' ') || asin,
        locale: 'en'
      })
      setWinReport(res.data)
    } catch (e) { console.error(e) }
    finally { setWinLoading(false) }
  }

  const fetchRank = async () => {
    if (!rankKeyword.trim() || rankLoading) return
    setRankLoading(true)
    try {
      const keywords = rankKeyword.split(',').map(k => k.trim()).filter(Boolean).slice(0, 10)
      const res = await axios.post(`${API}/api/rank/bulk`, { asin, keywords, market: 'US' })
      setRankResults(res.data)
    } catch (e) { console.error(e) }
    finally { setRankLoading(false) }
  }

  const fetchListing = async () => {
    if (!product || listingLoading) return
    setListingLoading(true)
    try {
      const keywords = (product.title || '').split(' ').filter(w => w.length > 3).slice(0, 10)
      const res = await axios.post(`${API}/api/ai/listing-optimize`, {
        title: product.title || '',
        keywords,
        category: product.category || 'General',
        locale: lang,
        marketplace: 'Amazon.com'
      })
      setListingReport(res.data)
    } catch (e) { console.error(e) }
    finally { setListingLoading(false) }
  }

  const fetchDemand = async () => {
    if (demandData || demandLoading || !product) return
    setDemandLoading(true)
    try {
      const keyword = (product.title || '').split(' ').slice(0, 4).join(' ')
      const res = await axios.get(`${API}/api/demand/forecast?keyword=${encodeURIComponent(keyword)}&asin=${asin}&market=US&horizon=90`)
      setDemandData(res.data)
    } catch (e) { console.error(e) }
    finally { setDemandLoading(false) }
  }

  const fetchTrends = async (title) => {
    if (trendsData || trendsLoading) return
    const kw = (title || '').split(' ').slice(0, 3).join(' ')
    if (!kw) return
    setTrendsLoading(true)
    try {
      const res = await axios.get(`${API}/api/trends/keyword?keyword=${encodeURIComponent(kw)}&timeframe=today+12-m`)
      setTrendsData(res.data)
    } catch (e) { console.error(e) }
    finally { setTrendsLoading(false) }
  }

  const fetchProductOnly = async () => {
    setProductLoading(true)
    try {
      const cacheKey = `product_${asin}`
      const cached = cacheGet(cacheKey)
      if (cached) { setProduct(cached); setProductLoading(false); return }
      const res = await axios.get(`${API}/api/amazon/product/${asin}`)
      setProduct(res.data)
      cacheSet(cacheKey, res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setProductLoading(false)
    }
  }

  const fetchAll = async () => {
    setLoading(true)
    const cachedProduct = cacheGet(`product_${asin}`)
    const cachedNiche = cacheGet(`niche_${asin}`)
    const cachedSuppliers = cacheGet(`suppliers_${asin}`)
    const cachedArbitrage = cacheGet(`arbitrage_${asin}`)

    if (cachedProduct && cachedNiche && cachedSuppliers && cachedArbitrage) {
      setProduct(cachedProduct)
      setNiche(cachedNiche)
      setSuppliers(cachedSuppliers)
      setArbitrage(cachedArbitrage)
      setLoading(false)
      track(Events.PRODUCT_VIEW, { asin, title: cachedProduct?.title, price: cachedProduct?.price, from_cache: true })
      return
    }

    try {
      const prodRes = cachedProduct
        ? { data: cachedProduct }
        : await axios.get(`${API}/api/amazon/product/${asin}`)

      const productData = prodRes.data
      // niche_score is already embedded in the product response — no separate call needed
      const nicheData = cachedNiche || productData?.niche_score || {}
      setProduct(productData)
      setNiche(nicheData)
      cacheSet(`product_${asin}`, productData)
      cacheSet(`niche_${asin}`, nicheData)

      track(Events.PRODUCT_VIEW, {
        asin,
        title: productData?.title,
        price: productData?.price,
        niche_score: nicheData?.total_score,
        category: productData?.category,
      })

      // Sourcing/arbitrage are secondary — don't block product display if they fail
      const keyword = productData?.title?.split(' ').slice(0, 3).join(' ') || asin
      const price = productData?.price || 30
      try {
        const [suppRes, arbRes] = await Promise.all([
          cachedSuppliers ? Promise.resolve({ data: { suppliers: cachedSuppliers } }) : axios.get(`${API}/api/sourcing/alibaba?keyword=${encodeURIComponent(keyword)}`),
          cachedArbitrage ? Promise.resolve({ data: cachedArbitrage }) : axios.get(`${API}/api/sourcing/arbitrage?keyword=${encodeURIComponent(keyword)}&amazon_price=${price}&include_euro=true`),
        ])
        const suppData = suppRes.data.suppliers || []
        const arbData = arbRes.data
        setSuppliers(suppData)
        setArbitrage(arbData)
        cacheSet(`suppliers_${asin}`, suppData)
        cacheSet(`arbitrage_${asin}`, arbData)
      } catch { /* sourcing data optional */ }

    } catch (err) {
      console.error(err)
      setFetchError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'lovehate' && !reviews && product) {
      const cacheKey = `reviews_${asin}_${lang}`
      const cachedReviews = cacheGet(cacheKey)
      if (cachedReviews) { setReviews(cachedReviews); return }
      setReviewsLoading(true)
      axios.get(`${API}/api/reviews/analyze/${asin}?title=${encodeURIComponent(product?.title || '')}&lang=${lang}`)
        .then(r => { setReviews(r.data); cacheSet(cacheKey, r.data) })
        .catch(console.error)
        .finally(() => setReviewsLoading(false))
    }
    if (activeTab === 'keepa' && product && !trendsData) {
      fetchTrends(product.title)
    }
    if (activeTab === 'demand' && product && !demandData) {
      fetchDemand()
    }
  }, [activeTab, product])

  // ── Erken return'ler — tüm hook'lardan SONRA ──
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px', flexDirection: 'column', gap: '12px' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: '32px', height: '32px', border: '2px solid #f0f0f5', borderTop: '2px solid #0071e3', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
      <div style={{ fontSize: '13px', color: '#8e8e93' }}>Ürün analiz ediliyor...</div>
    </div>
  )

  if (!product) return (
    <div style={{ textAlign: 'center', padding: '60px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ fontSize: '40px', marginBottom: '12px' }}>{fetchError ? '⚠️' : '🔍'}</div>
      <div style={{ fontSize: '15px', fontWeight: '500', color: '#1d1d1f', marginBottom: '6px' }}>
        {fetchError ? 'Ürün yüklenemedi' : 'Ürün bulunamadı'}
      </div>
      <div style={{ fontSize: '13px', color: '#8e8e93', marginBottom: '20px' }}>
        {fetchError ? 'Backend bağlantısı kurulamadı. Lütfen backend\'in çalıştığından emin olun.' : `ASIN: ${asin}`}
      </div>
      <button onClick={() => navigate('/app/search')} style={{ background: '#0071e3', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
        ← Aramaya Dön
      </button>
    </div>
  )

  const _nicheRaw = niche?.niche_score || niche || {}
  const score = _nicheRaw?.total_score || 0
  const nicheData = _nicheRaw
  const dims = nicheData?.dimensions || {}
  const insights = nicheData?.dimension_insights || {}
  const flags = nicheData?.flags || {}
  const unmetDemand = nicheData?.unmet_demand || {}
  const prongTest = nicheData?.prong_test || {}

  const alibabaPriceMin = suppliers[0]?.price_min ? parseFloat(suppliers[0].price_min) : 3.5
  const amazonPrice = product?.price || 0
  const fbaFee = amazonPrice * 0.15 + 2.5
  const netProfit = amazonPrice - alibabaPriceMin - fbaFee
  const margin = amazonPrice > 0 ? ((netProfit / amazonPrice) * 100).toFixed(1) : 0
  const roi = alibabaPriceMin > 0 ? ((netProfit / alibabaPriceMin) * 100).toFixed(0) : 0

  const variants = product?.variants || []
  const fbaStatus = product?.fba_status
  const sellersCount = product?.sellers_count

  const tabs = [
    { key: 'overview', label: 'Genel Bakış' },
    { key: 'niche', label: 'Niş Skoru' },
    { key: 'lovehate', label: '💚❤️ Yorumlar' },
    { key: 'keepa', label: '📈 Keepa' },
    { key: 'sourcing', label: 'Tedarik' },
    { key: 'arbitrage', label: 'Arbitraj' },
    { key: 'listing', label: '✨ Listing' },
    { key: 'rank', label: '🎯 Rank' },
    { key: 'demand', label: '📊 Talep' },
  ]

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", maxWidth: '960px' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#0071e3', fontSize: '13px', cursor: 'pointer', marginBottom: '16px', padding: 0, fontFamily: 'inherit' }}>
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
        Arama Sonuçlarına Dön
      </button>

      {/* Header */}
      <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '20px', marginBottom: '12px', opacity: productLoading ? 0.6 : 1, transition: 'opacity 0.2s' }}>
        <div style={{ display: 'flex', gap: '18px', alignItems: 'flex-start' }}>
          {product.image ? (
            <img src={product.image} alt="" style={{ width: '90px', height: '90px', borderRadius: '10px', objectFit: 'contain', background: '#f5f5f7', flexShrink: 0 }} />
          ) : (
            <div style={{ width: '90px', height: '90px', borderRadius: '10px', background: 'linear-gradient(135deg,#0071e3,#34aadc)', flexShrink: 0 }}></div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '17px', fontWeight: '600', color: '#1d1d1f', lineHeight: '1.35', marginBottom: '6px', letterSpacing: '-0.3px' }}>
              {product.title || asin}
              {productLoading && <span style={{ marginLeft: '8px', fontSize: '11px', color: '#8e8e93' }}>güncelleniyor...</span>}
            </div>
            <div style={{ fontSize: '11px', color: '#8e8e93', fontFamily: 'monospace', marginBottom: '10px' }}>
              ASIN: {asin} · {product.category || 'Amazon'} {product.brand ? `· ${product.brand}` : ''}
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
              {score >= 70 && <span style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '4px', background: '#e8f9ee', color: '#1a7f37', fontWeight: '500' }}>✅ Karlı</span>}
              {fbaStatus && (
                <span style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '4px', fontWeight: '500', background: fbaStatus === 'FBA' ? '#e8f0fe' : '#fff4e0', color: fbaStatus === 'FBA' ? '#0071e3' : '#b45309' }}>
                  📦 {fbaStatus}
                </span>
              )}
              {sellersCount && <span style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '4px', background: '#f5f5f7', color: '#3c3c43', fontWeight: '500' }}>👥 {sellersCount} satıcı</span>}
              {flags.big_brand && <span style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '4px', background: '#fff1f0', color: '#c00', fontWeight: '500' }}>🚩 Big Brand</span>}
              {flags.seasonal && <span style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '4px', background: '#fff1f0', color: '#c00', fontWeight: '500' }}>🚩 Sezonluk</span>}
              {flags.low_development && <span style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '4px', background: '#fff1f0', color: '#c00', fontWeight: '500' }}>🚩 Low Dev</span>}
              {unmetDemand.detected && (
                <span style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '4px', background: '#fff4e0', color: '#b45309', fontWeight: '500' }}>
                  🔥 Unmet Demand ({unmetDemand.level})
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { label: '🇺🇸 Amazon', url: `https://amazon.com/dp/${asin}` },
                { label: '🇹🇷 Trendyol', url: `https://trendyol.com/search?q=${product.title?.split(' ').slice(0, 3).join('+')}` },
                { label: '🏭 Alibaba', url: `https://alibaba.com/trade/search?SearchText=${product.title?.split(' ').slice(0, 3).join('+')}` },
                { label: '🛒 eBay', url: `https://ebay.com/sch/i.html?_nkw=${product.title?.split(' ').slice(0, 3).join('+')}` },
              ].map(l => (
                <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '6px', border: '0.5px solid #d2d2d7', background: 'white', color: '#3c3c43', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                  {l.label}
                </a>
              ))}
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: '26px', fontWeight: '600', color: '#1d1d1f', letterSpacing: '-0.5px' }}>${amazonPrice}</div>
            <div style={{ fontSize: '11px', color: '#8e8e93', marginTop: '2px' }}>Amazon fiyatı</div>
            {margin > 0 && <div style={{ fontSize: '13px', color: '#34c759', marginTop: '6px', fontWeight: '500' }}>+%{margin} marj</div>}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end', marginTop: '10px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: SCORE_BG(score), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '600', color: SCORE_TEXT(score) }}>
                {score}
              </div>
              <div style={{ fontSize: '11px', color: '#8e8e93' }}>Niş<br />Skoru</div>
            </div>
          </div>
        </div>

        {variants.length > 0 && (
          <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '0.5px solid #f5f5f7' }}>
            <div style={{ fontSize: '12px', color: '#8e8e93', marginBottom: '8px', fontWeight: '500' }}>
              {product.variant_types?.length > 0 ? product.variant_types.join(' / ') : 'Varyantlar'} ({variants.length})
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {variants.map((v, i) => (
                <div key={i} onClick={() => navigate(`/app/product/${v.asin}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 10px', borderRadius: '8px', cursor: 'pointer', border: `0.5px solid ${v.is_current ? '#0071e3' : '#d2d2d7'}`, background: v.is_current ? '#e8f0fe' : 'white', transition: 'all 0.15s' }}>
                  {v.image && <img src={v.image} alt="" style={{ width: '24px', height: '24px', borderRadius: '4px', objectFit: 'contain' }} />}
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: v.is_current ? '600' : '400', color: v.is_current ? '#0071e3' : '#1d1d1f' }}>{v.title || v.asin}</div>
                    {v.price > 0 && <div style={{ fontSize: '10px', color: '#8e8e93' }}>${v.price}</div>}
                  </div>
                  {v.is_current && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0071e3', flexShrink: 0 }}></div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', background: 'white', borderRadius: '10px', padding: '4px', border: '0.5px solid #e5e5ea' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit', background: activeTab === t.key ? '#1d1d1f' : 'transparent', color: activeTab === t.key ? 'white' : '#8e8e93', transition: 'all 0.15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Genel Bakış */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* AI Hızlı Değerlendirme */}
        {(() => {
          const trend = nicheData?.demand_trend?.trend || ''
          const rviLabel = nicheData?.review_velocity?.label || ''
          const redFlagCount = Object.values(flags).filter(Boolean).length

          const profitBadge = score >= 70
            ? { text: '✅ Karlı', bg: '#e8f9ee', color: '#1a7f37' }
            : score >= 50
            ? { text: '⚠️ Marjinal', bg: '#fff4e0', color: '#b45309' }
            : { text: '❌ Karlı Değil', bg: '#fff1f0', color: '#c00' }

          const competBadge = rviLabel.includes('Düşük')
            ? { text: '🟢 Rekabet Az', bg: '#e8f9ee', color: '#1a7f37' }
            : rviLabel.includes('Yüksek') || rviLabel.includes('doldu')
            ? { text: '🔴 Rekabet Yüksek', bg: '#fff1f0', color: '#c00' }
            : { text: '🟡 Rekabet Orta', bg: '#fff4e0', color: '#b45309' }

          const trendBadge = trend === 'yükselen' || trend === 'hızlı yükselen'
            ? { text: '🔥 Yükselen Trend', bg: '#fff4e0', color: '#b45309' }
            : trend === 'düşen' || trend === 'hızlı düşen'
            ? { text: '📉 Düşen Trend', bg: '#fff1f0', color: '#c00' }
            : { text: '➡️ Stabil Trend', bg: '#f5f5f7', color: '#3c3c43' }

          const summary = nicheData?.recommendation || (
            score >= 70 ? 'Bu ürün karlı bir niş adayı. Detaylı analiz için aşağıdaki bölümleri incele.' :
            score >= 50 ? 'Orta potansiyelli ürün. Riskler var, derinlemesine araştır.' :
            'Bu niş zayıf görünüyor. Tedarik ve rekabet koşullarını dikkatlice değerlendir.'
          )

          return (
            <div style={{ background: 'linear-gradient(135deg, #1d1d1f 0%, #2d2d30 100%)', borderRadius: '14px', padding: '18px 20px', color: 'white' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.5px', marginBottom: '12px' }}>🤖 HIZLI DEĞERLENDİRME</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                {[profitBadge, competBadge, trendBadge].map((b, i) => (
                  <span key={i} style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '20px', background: b.bg, color: b.color, fontWeight: '600' }}>{b.text}</span>
                ))}
                {redFlagCount > 0 && (
                  <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '20px', background: '#fff1f0', color: '#c00', fontWeight: '600' }}>🚩 {redFlagCount} Risk</span>
                )}
                {unmetDemand.detected && (
                  <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '20px', background: '#fff4e0', color: '#b45309', fontWeight: '600' }}>⚡ Fırsat</span>
                )}
              </div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', lineHeight: '1.6', marginBottom: '14px' }}>
                {summary}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[
                  { label: '📊 Niş Detayı', tab: 'niche', bg: 'rgba(255,255,255,0.12)', color: 'white' },
                  { label: '🏭 Tedarik Bul', tab: 'sourcing', bg: 'rgba(52,199,89,0.2)', color: '#34c759' },
                  { label: '💚 Yorumları Gör', tab: 'lovehate', bg: 'rgba(0,113,227,0.2)', color: '#4da3ff' },
                ].map(btn => (
                  <button key={btn.tab} onClick={() => setActiveTab(btn.tab)}
                    style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: btn.bg, color: btn.color, fontSize: '11px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>
          )
        })()}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f', marginBottom: '14px' }}>Ürün Metrikleri</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {[
                { l: 'BSR', v: product.bestseller_rank ? `#${product.bestseller_rank.toLocaleString()}` : '-' },
                { l: 'Yorum', v: product.reviews_count?.toLocaleString() || '-' },
                { l: 'Puan', v: product.rating ? `${product.rating} ⭐` : '-' },
                { l: 'Satıcı Sayısı', v: sellersCount ? `${sellersCount} satıcı` : '-' },
                { l: 'Fulfillment', v: fbaStatus || '-' },
                { l: 'FBA Ücreti', v: `$${fbaFee.toFixed(2)}` },
              ].map(item => (
                <div key={item.l} style={{ background: '#f5f5f7', borderRadius: '8px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '10px', color: '#8e8e93', marginBottom: '4px' }}>{item.l}</div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: item.l === 'Fulfillment' ? (fbaStatus === 'FBA' ? '#0071e3' : '#b45309') : '#1d1d1f' }}>{item.v}</div>
                </div>
              ))}
            </div>
            {product.features?.length > 0 && (
              <div style={{ marginTop: '14px' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#1d1d1f', marginBottom: '8px' }}>Özellikler</div>
                {product.features.slice(0, 4).map((f, i) => (
                  <div key={i} style={{ display: 'flex', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ color: '#34c759', flexShrink: 0, fontSize: '12px' }}>✓</span>
                    <span style={{ fontSize: '11px', color: '#3c3c43', lineHeight: '1.5' }}>{f}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f', marginBottom: '14px' }}>Kar Analizi</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
              {[
                { l: 'Satış Fiyatı', v: `$${amazonPrice}`, c: '#1d1d1f' },
                { l: 'Alibaba Maliyeti', v: `$${alibabaPriceMin}`, c: '#ff3b30' },
                { l: 'FBA Ücreti', v: `$${fbaFee.toFixed(2)}`, c: '#ff9f0a' },
                { l: 'Net Kar', v: `$${netProfit.toFixed(2)}`, c: '#34c759' },
              ].map(item => (
                <div key={item.l} style={{ background: '#f5f5f7', borderRadius: '8px', padding: '10px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: '#8e8e93', marginBottom: '4px' }}>{item.l}</div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: item.c }}>{item.v}</div>
                </div>
              ))}
            </div>
            <div style={{ background: netProfit > 0 ? '#e8f9ee' : '#fff1f0', borderRadius: '8px', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: netProfit > 0 ? '#1a7f37' : '#c00' }}>
                  {netProfit > 0 ? '✅ Karlı Ürün' : '❌ Zararlı Ürün'}
                </div>
                <div style={{ fontSize: '11px', color: netProfit > 0 ? '#34c759' : '#ff3b30', marginTop: '2px' }}>ROI: %{roi}</div>
              </div>
              <div style={{ fontSize: '24px', fontWeight: '600', color: netProfit > 0 ? '#1a7f37' : '#c00' }}>%{margin}</div>
            </div>
            {prongTest.verdict && (
              <div style={{ background: '#f5f5f7', borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#1d1d1f', marginBottom: '8px' }}>3 Prong Testi</div>
                <div style={{ fontSize: '12px', color: '#3c3c43', marginBottom: '6px' }}>{prongTest.verdict}</div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[
                    { label: 'Yüksek Fiyat', ok: prongTest.high_price },
                    { label: 'Geliştirilebilir', ok: prongTest.dev_potential },
                    { label: 'Az Review', ok: prongTest.low_review_ok },
                  ].map(p => (
                    <div key={p.label} style={{ flex: 1, textAlign: 'center', padding: '6px 4px', borderRadius: '6px', background: p.ok ? '#e8f9ee' : '#fff1f0', fontSize: '10px', fontWeight: '500', color: p.ok ? '#1a7f37' : '#c00' }}>
                      {p.ok ? '✅' : '❌'}<br />{p.label}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      )}

      {/* Niş Skoru */}
      {activeTab === 'niche' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '24px', paddingBottom: '20px', borderBottom: '0.5px solid #f5f5f7' }}>
              <div style={{ position: 'relative', width: '100px', height: '100px', flexShrink: 0 }}>
                <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: '100px', height: '100px' }}>
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#f0f0f5" strokeWidth="8" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke={SCORE_COLOR(score)} strokeWidth="8"
                    strokeDasharray={`${(score / 100) * 263.9} 263.9`} strokeLinecap="round" />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: '600', color: '#1d1d1f' }}>{score}</div>
                  <div style={{ fontSize: '11px', color: '#8e8e93' }}>/100</div>
                </div>
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#1d1d1f', marginBottom: '6px' }}>
                  {score >= 90 ? '🟢 Mükemmel — Hemen gir' : score >= 70 ? '🟡 İyi — Araştır' : score >= 50 ? '🟠 Orta — Dikkatli ol' : '🔴 Zayıf — Kaçın'}
                </div>
                <div style={{ fontSize: '13px', color: '#8e8e93', lineHeight: '1.6' }}>
                  {nicheData?.recommendation || nicheData?.ai_comment || 'Bu ürün analiz edildi.'}
                </div>
              </div>
            </div>
            {[
              { key: 'volume', label: 'Hacim & Depolama', max: 25, color: '#0071e3', desc: 'Ürün boyutu, BSR bazlı depolama riski' },
              { key: 'logistics', label: 'Lojistik', max: 25, color: '#34c759', desc: 'Ağırlık, FBA uygunluğu, kırılganlık' },
              { key: 'competition', label: 'Rekabet', max: 25, color: '#ff9f0a', desc: 'RVI, büyük marka, patent riski' },
              { key: 'profitability', label: 'Karlılık', max: 25, color: '#af52de', desc: 'Fiyat aralığı, marj, talep trendi' },
            ].map(dim => {
              const val = dims[dim.key] ?? 0
              const insight = insights[dim.key] || {}
              const isOpen = openInsight === dim.key
              return (
                <div key={dim.key} style={{ marginBottom: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: '#1d1d1f' }}>{dim.label}</div>
                      <div style={{ fontSize: '11px', color: '#8e8e93', marginTop: '2px' }}>{dim.desc}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ fontSize: '15px', fontWeight: '600', color: dim.color }}>{val}/{dim.max}</div>
                      {insight.reasons?.length > 0 && (
                        <button onClick={() => setOpenInsight(isOpen ? null : dim.key)}
                          style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', border: `0.5px solid ${dim.color}`, background: isOpen ? dim.color : 'white', color: isOpen ? 'white' : dim.color, cursor: 'pointer', fontFamily: 'inherit' }}>
                          {isOpen ? 'Kapat' : 'Neden?'}
                        </button>
                      )}
                    </div>
                  </div>
                  <div style={{ height: '6px', background: '#f0f0f5', borderRadius: '3px', marginBottom: isOpen ? '10px' : '0' }}>
                    <div style={{ height: '100%', borderRadius: '3px', background: dim.color, width: `${(val / dim.max) * 100}%` }}></div>
                  </div>
                  {isOpen && insight.reasons?.length > 0 && (
                    <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px 12px', marginTop: '4px' }}>
                      {insight.reasons.map((r, i) => (
                        <div key={i} style={{ fontSize: '12px', color: '#374151', marginBottom: '4px', display: 'flex', gap: '6px' }}>
                          <span style={{ color: dim.color, flexShrink: 0 }}>•</span>{r}
                        </div>
                      ))}
                      {insight.actions?.length > 0 && (
                        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '0.5px solid #e2e8f0' }}>
                          <div style={{ fontSize: '11px', fontWeight: '600', color: '#1d1d1f', marginBottom: '4px' }}>Ne yapmalısın?</div>
                          {insight.actions.map((a, i) => (
                            <div key={i} style={{ fontSize: '12px', color: '#374151', marginBottom: '4px', display: 'flex', gap: '6px' }}>
                              <span style={{ color: '#34c759', flexShrink: 0 }}>→</span>{a}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {unmetDemand.detected && (
            <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '16px 20px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f', marginBottom: '12px' }}>
                🔥 Karşılanmamış Talep
                <span style={{ marginLeft: '8px', fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: '#fff4e0', color: '#b45309' }}>{unmetDemand.level}</span>
              </div>
              {unmetDemand.signals?.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', padding: '10px 12px', background: '#fff4e0', borderRadius: '8px' }}>
                  <span style={{ color: '#ff9f0a', flexShrink: 0 }}>⚡</span>
                  <span style={{ fontSize: '12px', color: '#92400e' }}>{s}</span>
                </div>
              ))}
            </div>
          )}

          {keepaData?.price_war?.detected && (
            <div style={{ background: 'white', borderRadius: '12px', border: `0.5px solid ${keepaData.price_war.level === 'critical' ? '#ffd0ce' : '#fde68a'}`, padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f' }}>⚔️ Fiyat Savaşı</div>
                <span style={{ fontSize: '11px', padding: '2px 10px', borderRadius: '10px', fontWeight: '600',
                  background: keepaData.price_war.level === 'critical' ? '#fee2e2' : '#fff4e0',
                  color: keepaData.price_war.level === 'critical' ? '#dc2626' : '#b45309'
                }}>{keepaData.price_war.level_tr}</span>
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>💡 {keepaData.price_war.recommendation}</div>
              {keepaData.price_war.signals?.map((s, i) => (
                <div key={i} style={{ fontSize: '12px', padding: '6px 10px', borderRadius: '6px', marginBottom: '4px', background: '#fff7ed', color: '#374151' }}>{s.message}</div>
              ))}
            </div>
          )}

          {keepaData?.cultural_calendar?.best_listing_time && (
            <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '16px 20px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f', marginBottom: '10px' }}>📅 En İyi Listeleme Zamanı</div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1, background: '#f0fdf4', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Önerilen Ay</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#16a34a' }}>{keepaData.cultural_calendar.best_listing_time.month_name}</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>{keepaData.cultural_calendar.best_listing_time.for_event}</div>
                </div>
                <div style={{ flex: 1, background: '#f8fafc', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Aciliyet</div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#1d1d1f', marginTop: '4px' }}>{keepaData.cultural_calendar.best_listing_time.urgency}</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Boost: {keepaData.cultural_calendar.best_listing_time.boost_score}/100</div>
                </div>
              </div>
            </div>
          )}

          <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f' }}>🏆 Bu Nişi Kazanmak İçin Ne Lazım?</div>
              {!winReport && (
                <button onClick={fetchWinReport} disabled={winLoading}
                  style={{ padding: '6px 14px', background: '#1d1d1f', color: 'white', border: 'none', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                  {winLoading ? '⏳ Analiz ediliyor...' : '🤖 AI Raporu Al'}
                </button>
              )}
            </div>
            {winReport ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
                  {[
                    { label: 'Buyer Intent', value: winReport.intent_score + '/100', color: '#0071e3' },
                    { label: 'Rekabet', value: winReport.competition_level, color: '#ff9f0a' },
                    { label: 'Buyer Stage', value: winReport.buyer_stage, color: '#34c759' },
                  ].map((item, i) => (
                    <div key={i} style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: item.color }}>{item.value}</div>
                      <div style={{ fontSize: '10px', color: '#8e8e93' }}>{item.label}</div>
                    </div>
                  ))}
                </div>
                {winReport.summary && (
                  <div style={{ fontSize: '12px', color: '#374151', padding: '10px 12px', background: '#f0fdf4', borderRadius: '8px', marginBottom: '10px' }}>
                    💡 {winReport.summary}
                  </div>
                )}
                {winReport.long_tail_ideas?.length > 0 && (
                  <div>
                    <div style={{ fontSize: '11px', color: '#8e8e93', marginBottom: '6px' }}>🎯 Hedef Keywordler</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {winReport.long_tail_ideas.map((kw, i) => (
                        <span key={i} style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: '#e8f0fe', color: '#0071e3' }}>{kw}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', padding: '16px' }}>
                AI raporu için butona tıkla — buyer intent, hedef keywordler ve strateji
              </div>
            )}
          </div>

          {Object.values(flags).some(v => v) && (
            <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '16px 20px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f', marginBottom: '12px' }}>🚩 Red Flags</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {[
                  { key: 'big_brand', label: 'Büyük Marka' },
                  { key: 'seasonal', label: 'Sezonluk' },
                  { key: 'low_development', label: 'Düşük Gelişim' },
                  { key: 'patent_risk', label: 'Patent Riski' },
                  { key: 'fragile', label: 'Kırılgan' },
                  { key: 'heavy', label: 'Çok Ağır' },
                ].filter(f => flags[f.key]).map(f => (
                  <div key={f.key} style={{ fontSize: '12px', padding: '6px 12px', borderRadius: '8px', background: '#fff1f0', color: '#c00', border: '0.5px solid #ffd0ce', fontWeight: '500' }}>
                    🚩 {f.label}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Love/Hate */}
      {activeTab === 'lovehate' && (
        <div>
          {reviewsLoading ? (
            <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '60px', textAlign: 'center' }}>
              <div style={{ width: '32px', height: '32px', border: '2px solid #f0f0f5', borderTop: '2px solid #0071e3', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }}></div>
              <div style={{ fontSize: '13px', color: '#8e8e93' }}>Claude AI yorumları analiz ediyor...</div>
            </div>
          ) : reviews ? (
            <div>
              {reviews.mock && (
                <div style={{ background: '#fff9e6', border: '1px solid #ffe066', borderRadius: '10px', padding: '10px 16px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '16px' }}>⚠️</span>
                  <div>
                    <div style={{ fontSize: '12.5px', fontWeight: '600', color: '#92400e' }}>Bu ürün için gerçek yorum verisi bulunamadı</div>
                    <div style={{ fontSize: '11.5px', color: '#b45309', marginTop: '2px' }}>Aşağıdaki veriler örnek analizdir — bu ürüne ait değildir.</div>
                  </div>
                </div>
              )}
              <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '16px 20px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f' }}>Genel Memnuniyet</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ fontSize: '22px', fontWeight: '600', color: reviews.sentiment_score >= 70 ? '#34c759' : '#ff9f0a' }}>%{reviews.sentiment_score}</div>
                  </div>
                </div>
                <div style={{ height: '6px', background: '#f0f0f5', borderRadius: '3px', marginBottom: '8px' }}>
                  <div style={{ height: '100%', borderRadius: '3px', background: '#34c759', width: `${reviews.sentiment_score}%` }}></div>
                </div>
                <div style={{ fontSize: '12px', color: '#8e8e93' }}>{reviews.total_reviews_analyzed} yorum · {reviews.summary}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', overflow: 'hidden' }}>
                  <div style={{ padding: '14px 16px 10px', background: '#e8f9ee', borderBottom: '0.5px solid #b7f0c8' }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#1a7f37' }}>💚 Müşteriler Seviyor</div>
                  </div>
                  <div style={{ padding: '12px 16px' }}>
                    {reviews.love?.map((item, i) => (
                      <div key={i} style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: i < reviews.love.length - 1 ? '0.5px solid #f5f5f7' : 'none' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <div style={{ fontSize: '13px', fontWeight: '500', color: '#1d1d1f' }}>{item.word}</div>
                          <div style={{ fontSize: '11px', fontWeight: '600', color: '#34c759', background: '#e8f9ee', padding: '1px 8px', borderRadius: '10px' }}>{item.count}</div>
                        </div>
                        <div style={{ height: '3px', background: '#f0f0f5', borderRadius: '2px', marginBottom: '4px' }}>
                          <div style={{ height: '100%', borderRadius: '2px', background: '#34c759', width: `${Math.min((item.count / (reviews.love[0]?.count || 1)) * 100, 100)}%` }}></div>
                        </div>
                        <div style={{ fontSize: '11px', color: '#8e8e93', fontStyle: 'italic' }}>"{item.example}"</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', overflow: 'hidden' }}>
                  <div style={{ padding: '14px 16px 10px', background: '#fff1f0', borderBottom: '0.5px solid #ffd0ce' }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#c00' }}>❤️ Şikayet Konuları</div>
                  </div>
                  <div style={{ padding: '12px 16px' }}>
                    {reviews.hate?.map((item, i) => (
                      <div key={i} style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: i < reviews.hate.length - 1 ? '0.5px solid #f5f5f7' : 'none' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <div style={{ fontSize: '13px', fontWeight: '500', color: '#1d1d1f' }}>{item.word}</div>
                          <div style={{ fontSize: '11px', fontWeight: '600', color: '#ff3b30', background: '#fff1f0', padding: '1px 8px', borderRadius: '10px' }}>{item.count}</div>
                        </div>
                        <div style={{ height: '3px', background: '#f0f0f5', borderRadius: '2px', marginBottom: '4px' }}>
                          <div style={{ height: '100%', borderRadius: '2px', background: '#ff3b30', width: `${Math.min((item.count / (reviews.hate[0]?.count || 1)) * 100, 100)}%` }}></div>
                        </div>
                        <div style={{ fontSize: '11px', color: '#8e8e93', fontStyle: 'italic' }}>"{item.example}"</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ background: 'linear-gradient(135deg,#0071e3,#34aadc)', borderRadius: '12px', padding: '16px 20px', marginTop: '12px', color: 'white' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>💡 Ürün Geliştirme Fırsatı</div>
                <div style={{ fontSize: '12px', opacity: 0.9, lineHeight: '1.6' }}>
                  Müşterilerin en çok şikayet ettiği <strong>"{reviews.hate?.[0]?.word}"</strong> sorununu çözen bir ürün geliştir. {reviews.hate?.[0]?.count}+ yorum bu konudan şikayet ediyor — bu bir boşluk!
                </div>
              </div>
            </div>
          ) : (
            <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '40px', textAlign: 'center', color: '#8e8e93' }}>Yorum analizi yüklenemedi.</div>
          )}
        </div>
      )}

      {/* Tedarik */}
      {activeTab === 'sourcing' && (
        <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f', marginBottom: '16px' }}>🏭 Alibaba Tedarikçiler</div>
          {suppliers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#8e8e93' }}>Tedarikçi bulunamadı</div>
          ) : suppliers.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 0', borderBottom: '0.5px solid #f5f5f7' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '8px', background: '#f5f5f7', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🏭</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: '500', color: '#1d1d1f', marginBottom: '3px' }}>{s.name}</div>
                <div style={{ fontSize: '11px', color: '#8e8e93' }}>{s.company} {s.verified ? '· ✅ Verified' : ''}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#34c759' }}>${s.price_min}–${s.price_max}</div>
                <div style={{ fontSize: '11px', color: '#8e8e93' }}>MOQ: {s.moq}</div>
              </div>
              <a href={s.url} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: '12px', padding: '6px 12px', borderRadius: '7px', border: '0.5px solid #d2d2d7', background: 'white', color: '#0071e3', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                Alibaba'da Gör →
              </a>
            </div>
          ))}
        </div>
      )}

      {/* Keepa */}
      {activeTab === 'keepa' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {!keepaData ? (
            <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>📈</div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#1d1d1f', marginBottom: '8px' }}>Keepa Geçmiş Verileri</div>
              <div style={{ fontSize: '12px', color: '#8e8e93', marginBottom: '16px' }}>BSR geçmişi, fiyat trendi ve Gini rekabet analizi</div>
              <button onClick={fetchKeepa} disabled={keepaLoading}
                style={{ padding: '10px 24px', background: '#0071e3', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
                {keepaLoading ? '⏳ Yükleniyor...' : '🔑 Keepa Verisi Çek (1 token)'}
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {[
                  { label: 'Gini', value: keepaData.gini?.toFixed(3), sub: keepaData.gini_label, color: keepaData.gini < 0.3 ? '#16a34a' : keepaData.gini < 0.5 ? '#b45309' : '#dc2626' },
                  { label: 'Aylık Satış', value: keepaData.monthly_sales_estimate?.toLocaleString(), sub: 'tahmini', color: '#0071e3' },
                  { label: 'BSR Trendi', value: keepaData.bsr_trend === 'improving' ? '📈 İyileşiyor' : keepaData.bsr_trend === 'declining' ? '📉 Kötüleşiyor' : '➡️ Stabil', sub: 'son 30 gün', color: '#1d1d1f' },
                ].map((item, i) => (
                  <div key={i} style={{ background: 'white', borderRadius: '10px', border: '0.5px solid #e5e5ea', padding: '14px', textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: item.color }}>{item.value}</div>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#1d1d1f' }}>{item.label}</div>
                    <div style={{ fontSize: '10px', color: '#8e8e93' }}>{item.sub}</div>
                  </div>
                ))}
              </div>

              {keepaData.bsr_history?.length > 0 && (() => {
                const data = keepaData.bsr_history.slice(-30)
                const maxBsr = Math.max(...data.map(x => x.bsr))
                const minBsr = Math.min(...data.map(x => x.bsr))
                const range = maxBsr - minBsr || 1
                const current = data[data.length - 1]?.bsr
                return (
                  <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '16px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f' }}>📊 BSR Geçmişi (30 gün)</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        En iyi: <strong style={{ color: '#34c759' }}>#{minBsr?.toLocaleString()}</strong>
                        {' · '}En kötü: <strong style={{ color: '#ff3b30' }}>#{maxBsr?.toLocaleString()}</strong>
                      </div>
                    </div>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', gap: '2px', height: '80px', paddingTop: '18px' }}>
                      {data.map((b, i) => {
                        const height = Math.max(4, ((maxBsr - b.bsr) / range) * 62 + 4)
                        const isLast = i === data.length - 1
                        const isBest = b.bsr === minBsr
                        return (
                          <div key={i} style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', height: '62px', justifyContent: 'flex-end' }}>
                            {(isLast || isBest) && (
                              <div style={{ position: 'absolute', top: -2, fontSize: '8px', fontWeight: '600', color: isLast ? '#0071e3' : '#34c759', whiteSpace: 'nowrap', transform: 'translateX(-50%)', left: '50%' }}>
                                #{b.bsr?.toLocaleString()}
                              </div>
                            )}
                            <div title={`BSR: #${b.bsr?.toLocaleString()}`}
                              style={{ width: '100%', background: isLast ? '#0071e3' : isBest ? '#34c759' : '#0071e3', borderRadius: '2px 2px 0 0', height: `${height}px`, opacity: isLast ? 1 : 0.5 + (i / 30) * 0.35 }} />
                          </div>
                        )
                      })}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>
                      <span>30 gün önce</span>
                      <span style={{ color: '#0071e3', fontWeight: '600' }}>Bugün #{current?.toLocaleString()}</span>
                    </div>
                  </div>
                )
              })()}

              {keepaData.price_history?.length > 0 && (() => {
                const data = keepaData.price_history.slice(-30)
                const W = 400, H = 80, PAD = 16
                const maxP = Math.max(...data.map(x => x.price))
                const minP = Math.min(...data.map(x => x.price))
                const range = maxP - minP || 0.01
                const pts = data.map((p, i) => ({
                  x: PAD + (i / Math.max(data.length - 1, 1)) * (W - PAD * 2),
                  y: PAD + ((maxP - p.price) / range) * (H - PAD * 2),
                  price: p.price
                }))
                const polyPts = pts.map(p => `${p.x},${p.y}`).join(' ')
                const minIdx = data.findIndex(x => x.price === minP)
                const maxIdx = data.findIndex(x => x.price === maxP)
                const lastIdx = pts.length - 1
                return (
                  <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '16px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f' }}>💰 Fiyat Geçmişi (30 gün)</div>
                      <div style={{ display: 'flex', gap: '10px', fontSize: '11px' }}>
                        <span>Min: <strong style={{ color: '#ff3b30' }}>${minP}</strong></span>
                        <span>Max: <strong style={{ color: '#ff9f0a' }}>${maxP}</strong></span>
                        <span>Şimdi: <strong style={{ color: '#0071e3' }}>${data[lastIdx]?.price}</strong></span>
                      </div>
                    </div>
                    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '80px', overflow: 'visible' }}>
                      <polygon points={`${pts[0].x},${H - PAD} ${polyPts} ${pts[lastIdx].x},${H - PAD}`} fill="rgba(52,199,89,0.08)" />
                      <polyline points={polyPts} fill="none" stroke="#34c759" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      {/* Min */}
                      <circle cx={pts[minIdx].x} cy={pts[minIdx].y} r="3" fill="#ff3b30" />
                      <text x={pts[minIdx].x} y={pts[minIdx].y - 5} fontSize="8" fill="#ff3b30" textAnchor="middle">${minP}</text>
                      {/* Max */}
                      {maxIdx !== minIdx && <circle cx={pts[maxIdx].x} cy={pts[maxIdx].y} r="3" fill="#ff9f0a" />}
                      {maxIdx !== minIdx && <text x={pts[maxIdx].x} y={pts[maxIdx].y - 5} fontSize="8" fill="#ff9f0a" textAnchor="middle">${maxP}</text>}
                      {/* Current */}
                      <circle cx={pts[lastIdx].x} cy={pts[lastIdx].y} r="3.5" fill="#0071e3" />
                      <text x={pts[lastIdx].x} y={pts[lastIdx].y - 6} fontSize="8.5" fill="#0071e3" fontWeight="600" textAnchor="end">${data[lastIdx]?.price}</text>
                      {/* Baseline */}
                      <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="#f0f0f5" strokeWidth="0.5" />
                    </svg>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94a3b8' }}>
                      <span>30 gün önce</span><span style={{ color: '#0071e3', fontWeight: '600' }}>Bugün</span>
                    </div>
                  </div>
                )
              })()}

              {/* Google Trends */}
              <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f' }}>📈 Google Trends (12 ay)</div>
                  {trendsData && (
                    <span style={{ fontSize: '11px', padding: '2px 10px', borderRadius: '10px', fontWeight: '600',
                      background: trendsData.direction === 'rising' ? '#e8f9ee' : trendsData.direction === 'falling' ? '#fff1f0' : '#f5f5f7',
                      color: trendsData.direction === 'rising' ? '#1a7f37' : trendsData.direction === 'falling' ? '#c00' : '#3c3c43'
                    }}>{trendsData.direction_tr}</span>
                  )}
                </div>
                {trendsLoading ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#8e8e93', fontSize: '12px' }}>⏳ Yükleniyor...</div>
                ) : trendsData?.monthly?.length > 0 ? (() => {
                  const vals = trendsData.monthly
                  const W = 400, H = 70, PAD = 12
                  const maxV = Math.max(...vals), minV = Math.min(...vals)
                  const range = maxV - minV || 0.01
                  const pts = vals.map((v, i) => ({
                    x: PAD + (i / Math.max(vals.length - 1, 1)) * (W - PAD * 2),
                    y: PAD + ((maxV - v) / range) * (H - PAD * 2),
                    v
                  }))
                  const polyPts = pts.map(p => `${p.x},${p.y}`).join(' ')
                  const months = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara']
                  const now = new Date()
                  return (
                    <div>
                      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '70px', overflow: 'visible' }}>
                        <polygon points={`${pts[0].x},${H - PAD} ${polyPts} ${pts[pts.length-1].x},${H - PAD}`} fill="rgba(0,113,227,0.07)" />
                        <polyline points={polyPts} fill="none" stroke="#0071e3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        {pts.map((p, i) => i % 3 === 0 && (
                          <g key={i}>
                            <circle cx={p.x} cy={p.y} r="2" fill="#0071e3" opacity="0.6" />
                            <text x={p.x} y={H - 2} fontSize="7" fill="#94a3b8" textAnchor="middle">
                              {months[(now.getMonth() - (vals.length - 1 - i) + 12) % 12]}
                            </text>
                          </g>
                        ))}
                        {/* Current (last) */}
                        <circle cx={pts[pts.length-1].x} cy={pts[pts.length-1].y} r="3" fill="#0071e3" />
                        <text x={pts[pts.length-1].x} y={pts[pts.length-1].y - 5} fontSize="8" fill="#0071e3" fontWeight="600" textAnchor="end">{vals[vals.length-1]}</text>
                        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="#f0f0f5" strokeWidth="0.5" />
                      </svg>
                      <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '11px', color: '#64748b' }}>
                        <span>Ort: <strong>{trendsData.avg_score}</strong></span>
                        <span>Güncel: <strong style={{ color: '#0071e3' }}>{trendsData.recent_score}</strong></span>
                        {trendsData.is_seasonal && <span style={{ color: '#b45309', background: '#fff4e0', padding: '1px 8px', borderRadius: '10px' }}>📅 Sezonsal</span>}
                      </div>
                    </div>
                  )
                })() : (
                  <div style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', padding: '12px' }}>
                    {trendsData?.direction === 'unknown' ? 'Trend verisi bulunamadı' : 'Keepa verisi yüklenince otomatik gösterilir'}
                  </div>
                )}
              </div>

              {keepaData.price_war?.detected && (
                <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #fde68a', padding: '16px 20px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f', marginBottom: '8px' }}>⚔️ {keepaData.price_war.level_tr}</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>{keepaData.price_war.recommendation}</div>
                  {keepaData.price_war.signals?.map((s, i) => (
                    <div key={i} style={{ fontSize: '12px', padding: '6px 10px', background: '#fff7ed', borderRadius: '6px', marginBottom: '4px', color: '#374151' }}>{s.message}</div>
                  ))}
                </div>
              )}

              {keepaData.cultural_calendar?.best_listing_time && (
                <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '16px 20px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f', marginBottom: '10px' }}>📅 En İyi Listeleme Zamanı</div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1, background: '#f0fdf4', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '20px', fontWeight: '700', color: '#16a34a' }}>{keepaData.cultural_calendar.best_listing_time.month_name}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{keepaData.cultural_calendar.best_listing_time.for_event}</div>
                    </div>
                    <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {keepaData.cultural_calendar.upcoming_events?.slice(0, 3).map((ev, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#f8fafc', borderRadius: '6px', fontSize: '11px' }}>
                          <span style={{ fontWeight: '500' }}>{ev.event}</span>
                          <span style={{ color: '#b45309', fontWeight: '600' }}>+{ev.boost_score}% {ev.months_until_event}ay</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {reviews && reviews.hate && (
                <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '16px 20px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f', marginBottom: '10px' }}>⭐ En Kritik Yorumlar</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>
                    Müşterilerin en çok şikayet ettiği konular (arXiv:2412.02884 metodolojisi)
                  </div>
                  {reviews.hate?.slice(0, 3).map((item, i) => (
                    <div key={i} style={{ padding: '10px 12px', background: '#fff1f0', borderRadius: '8px', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#c00' }}>🚨 {item.word}</span>
                        <span style={{ fontSize: '11px', color: '#dc2626', fontWeight: '600' }}>{item.count} şikayet</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#8e8e93', fontStyle: 'italic' }}>"{item.example}"</div>
                    </div>
                  ))}
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '8px', padding: '8px 10px', background: '#f0fdf4', borderRadius: '6px' }}>
                    💡 Bu sorunları çözen ürün → anında rekabet avantajı
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Arbitraj */}
      {activeTab === 'arbitrage' && arbitrage && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {arbitrage.best_opportunity?.arbitrage_profit > 0 && (
            <div style={{ background: '#e8f9ee', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#34c759', marginBottom: '4px' }}>🏆 En İyi Fırsat</div>
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#1d1d1f' }}>{arbitrage.best_opportunity.flag} {arbitrage.best_opportunity.platform}</div>
                <div style={{ fontSize: '12px', color: '#8e8e93', marginTop: '2px' }}>${arbitrage.best_opportunity.price_usd} kaynak · %{arbitrage.best_opportunity.margin} marj</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '28px', fontWeight: '600', color: '#1a7f37' }}>+${arbitrage.best_opportunity.arbitrage_profit}</div>
                <div style={{ fontSize: '11px', color: '#8e8e93' }}>net kar/ürün</div>
              </div>
            </div>
          )}
          {arbitrage.best_euro_flip?.arbitrage_profit > 0 && (
            <div style={{ background: '#e8f0fe', borderRadius: '12px', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#0071e3', marginBottom: '4px' }}>🇪🇺 En İyi Euro Flip</div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#1d1d1f' }}>{arbitrage.best_euro_flip.flag} {arbitrage.best_euro_flip.platform}</div>
                <div style={{ fontSize: '11px', color: '#8e8e93', marginTop: '2px' }}>VAT {arbitrage.best_euro_flip.vat_rate} dahil</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '22px', fontWeight: '600', color: '#0071e3' }}>+${arbitrage.best_euro_flip.arbitrage_profit}</div>
                <div style={{ fontSize: '11px', color: '#8e8e93' }}>%{arbitrage.best_euro_flip.margin} marj</div>
              </div>
            </div>
          )}
          <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', overflow: 'hidden' }}>
            {arbitrage.results?.filter(r => !['DE','FR','UK','IT','ES','CA','JP'].includes(r.marketplace)).map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '0.5px solid #f5f5f7' }}>
                <div style={{ fontSize: '18px', marginRight: '10px' }}>{r.flag}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: '#1d1d1f' }}>{r.platform}</div>
                  <div style={{ fontSize: '11px', color: '#8e8e93' }}>{r.currency === 'TRY' ? `₺${r.price_local}` : `$${r.price_local}`} = ${r.price_usd}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: r.arbitrage_profit > 0 ? '#34c759' : '#ff3b30' }}>{r.arbitrage_profit > 0 ? '+' : ''}${r.arbitrage_profit}</div>
                  <div style={{ fontSize: '10px', color: '#8e8e93' }}>%{r.margin} marj</div>
                </div>
              </div>
            ))}
          </div>
          {arbitrage.euro_flips?.length > 0 && (
            <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '0.5px solid #f5f5f7', background: '#f5f5f7' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#0071e3' }}>🇪🇺 Euro Flips — VAT dahil</div>
              </div>
              {arbitrage.euro_flips.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '0.5px solid #f5f5f7', background: r.arbitrage_profit > 5 ? '#f0fff4' : 'white' }}>
                  <div style={{ fontSize: '18px', marginRight: '10px' }}>{r.flag}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: '#1d1d1f' }}>{r.platform}</div>
                    <div style={{ fontSize: '11px', color: '#8e8e93' }}>{r.price_local} {r.currency} · VAT {r.vat_rate}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: r.arbitrage_profit > 0 ? '#0071e3' : '#ff3b30' }}>{r.arbitrage_profit > 0 ? '+' : ''}${r.arbitrage_profit}</div>
                    <div style={{ fontSize: '10px', color: '#8e8e93' }}>%{r.margin} · ROI %{r.roi}</div>
                  </div>
                  {r.arbitrage_profit > 5 && <div style={{ marginLeft: '8px', fontSize: '10px', padding: '2px 8px', borderRadius: '10px', background: '#e8f9ee', color: '#1a7f37', fontWeight: '600' }}>HOT</div>}
                </div>
              ))}
            </div>
          )}
          {arbitrage.exchange_rates && (
            <div style={{ background: 'white', borderRadius: '10px', border: '0.5px solid #e5e5ea', padding: '12px 16px' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#8e8e93', marginBottom: '8px' }}>GÜNCEL KUR</div>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                {Object.entries(arbitrage.exchange_rates).filter(([, v]) => v).map(([currency, rate]) => (
                  <div key={currency} style={{ fontSize: '12px', color: '#3c3c43' }}>
                    <span style={{ color: '#8e8e93' }}>1 USD = </span>
                    <span style={{ fontWeight: '600' }}>{rate} {currency}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rank Tracker */}
      {activeTab === 'rank' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '16px 20px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f', marginBottom: '6px' }}>🎯 Rank Tracker</div>
            <div style={{ fontSize: '12px', color: '#8e8e93', marginBottom: '14px' }}>Bu ASIN'in hangi keywordlerde kaçıncı sırada olduğunu öğren. Virgülle ayırarak max 10 keyword gir.</div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              <input
                value={rankKeyword}
                onChange={e => setRankKeyword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchRank()}
                placeholder="led desk lamp, desk light, usb lamp..."
                style={{ flex: 1, padding: '9px 12px', borderRadius: '8px', border: '0.5px solid #d2d2d7', fontSize: '13px', fontFamily: 'inherit', background: '#f5f5f7', outline: 'none' }}
              />
              <button onClick={fetchRank} disabled={rankLoading || !rankKeyword.trim()}
                style={{ padding: '9px 20px', background: rankKeyword.trim() ? '#0071e3' : '#d2d2d7', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                {rankLoading ? '⏳ Tarıyor...' : '🔍 Tara'}
              </button>
            </div>
            {/* Hızlı öneri — ürün başlığından */}
            {product?.title && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#8e8e93' }}>Önerilen:</span>
                {product.title.split(' ').filter(w => w.length > 3).slice(0, 5).map(w => w.toLowerCase()).map((kw, i) => (
                  <span key={i} onClick={() => setRankKeyword(prev => prev ? `${prev}, ${kw}` : kw)}
                    style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', border: '0.5px solid #d2d2d7', background: 'white', color: '#0071e3', cursor: 'pointer' }}>
                    {kw}
                  </span>
                ))}
              </div>
            )}
          </div>

          {rankResults && (
            <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f' }}>
                  Sonuçlar — {rankResults.found_count}/{rankResults.total_checked} keyword'de bulundu
                </div>
                {rankResults.best_rank && (
                  <span style={{ fontSize: '12px', padding: '3px 12px', borderRadius: '20px', background: rankResults.best_rank <= 10 ? '#e8f9ee' : '#fff4e0', color: rankResults.best_rank <= 10 ? '#1a7f37' : '#b45309', fontWeight: '600' }}>
                    En iyi: #{rankResults.best_rank}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {rankResults.results?.map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '10px',
                    background: r.found ? (r.rank <= 10 ? '#e8f9ee' : r.rank <= 30 ? '#fff4e0' : '#f5f5f7') : '#fff1f0' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      background: r.found ? (r.rank <= 10 ? '#34c759' : r.rank <= 30 ? '#ff9f0a' : '#8e8e93') : '#ff3b30',
                      color: 'white', fontSize: '13px', fontWeight: '700' }}>
                      {r.found ? `#${r.rank}` : '—'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: '#1d1d1f', marginBottom: '2px' }}>{r.keyword}</div>
                      <div style={{ fontSize: '11px', color: '#8e8e93' }}>{r.commentary || (r.found ? '' : `İlk ${r.total_scanned} sonuçta bulunamadı`)}</div>
                    </div>
                    {r.is_sponsored && (
                      <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', background: '#fff4e0', color: '#b45309', fontWeight: '500' }}>Sponsored</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Demand Forecast */}
      {activeTab === 'demand' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {demandLoading ? (
            <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '60px', textAlign: 'center' }}>
              <div style={{ width: '32px', height: '32px', border: '2px solid #f0f0f5', borderTop: '2px solid #0071e3', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }}></div>
              <div style={{ fontSize: '13px', color: '#8e8e93' }}>90 günlük talep tahmini hesaplanıyor...</div>
            </div>
          ) : !demandData ? (
            <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>📊</div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#1d1d1f', marginBottom: '6px' }}>Talep Tahmini</div>
              <div style={{ fontSize: '12px', color: '#8e8e93', marginBottom: '20px' }}>90 günlük satış hacmi ve trend tahmini</div>
              <button onClick={fetchDemand}
                style={{ padding: '10px 28px', background: 'linear-gradient(135deg,#0071e3,#34aadc)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
                📊 Tahmini Hesapla
              </button>
            </div>
          ) : (
            <>
              {/* Özet Kartlar */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px' }}>
                {[
                  { label: 'Aylık Tahmini Satış', value: demandData.monthly_units_estimate ? `~${demandData.monthly_units_estimate.toLocaleString()} adet` : '—', icon: '📦', color: '#0071e3', bg: '#e8f0fe' },
                  { label: 'Trend Yönü', value: demandData.trend_direction_tr || demandData.trend_direction || '—', icon: demandData.trend_direction === 'rising' ? '📈' : demandData.trend_direction === 'falling' ? '📉' : '➡️', color: demandData.trend_direction === 'rising' ? '#1a7f37' : demandData.trend_direction === 'falling' ? '#c00' : '#3c3c43', bg: demandData.trend_direction === 'rising' ? '#e8f9ee' : demandData.trend_direction === 'falling' ? '#fff1f0' : '#f5f5f7' },
                  { label: 'Talep Skoru', value: demandData.demand_score != null ? `${demandData.demand_score}/100` : '—', icon: '🎯', color: demandData.demand_score >= 70 ? '#1a7f37' : demandData.demand_score >= 50 ? '#b45309' : '#c00', bg: demandData.demand_score >= 70 ? '#e8f9ee' : demandData.demand_score >= 50 ? '#fff4e0' : '#fff1f0' },
                ].map((card, i) => (
                  <div key={i} style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '16px' }}>
                    <div style={{ fontSize: '20px', marginBottom: '6px' }}>{card.icon}</div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: card.color, marginBottom: '2px' }}>{card.value}</div>
                    <div style={{ fontSize: '11px', color: '#8e8e93' }}>{card.label}</div>
                  </div>
                ))}
              </div>

              {/* 90 Günlük Tahmin Grafiği */}
              {demandData.forecast?.length > 0 && (() => {
                const pts = demandData.forecast
                const vals = pts.map(p => p.units || p.value || 0)
                const W = 600, H = 120, PAD = 30
                const minV = Math.min(...vals), maxV = Math.max(...vals)
                const range = maxV - minV || 1
                const coords = vals.map((v, i) => ({
                  x: PAD + (i / (vals.length - 1)) * (W - PAD * 2),
                  y: H - PAD - ((v - minV) / range) * (H - PAD * 2),
                  v
                }))
                const poly = coords.map(c => `${c.x},${c.y}`).join(' ')
                const area = `${coords[0].x},${H - PAD} ${poly} ${coords[coords.length - 1].x},${H - PAD}`
                const maxIdx = vals.indexOf(Math.max(...vals))
                const minIdx = vals.indexOf(Math.min(...vals))
                const lastIdx = vals.length - 1
                return (
                  <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '16px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f' }}>90 Günlük Tahmin</div>
                      <div style={{ fontSize: '11px', color: '#8e8e93' }}>{pts.length} veri noktası</div>
                    </div>
                    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '120px', overflow: 'visible' }}>
                      <polygon points={area} fill="rgba(0,113,227,0.08)" />
                      <polyline points={poly} fill="none" stroke="#0071e3" strokeWidth="1.5" strokeLinejoin="round" />
                      {/* En yüksek nokta */}
                      <circle cx={coords[maxIdx].x} cy={coords[maxIdx].y} r="3.5" fill="#34c759" />
                      <text x={coords[maxIdx].x} y={coords[maxIdx].y - 7} textAnchor="middle" fontSize="9" fill="#34c759" fontWeight="600">{coords[maxIdx].v.toLocaleString()}</text>
                      {/* En düşük nokta */}
                      {minIdx !== maxIdx && (
                        <>
                          <circle cx={coords[minIdx].x} cy={coords[minIdx].y} r="3" fill="#ff3b30" />
                          <text x={coords[minIdx].x} y={coords[minIdx].y + 14} textAnchor="middle" fontSize="9" fill="#ff3b30">{coords[minIdx].v.toLocaleString()}</text>
                        </>
                      )}
                      {/* Son nokta (tahminin ucu) */}
                      <circle cx={coords[lastIdx].x} cy={coords[lastIdx].y} r="4" fill="#0071e3" />
                      <text x={coords[lastIdx].x} y={coords[lastIdx].y - 8} textAnchor="end" fontSize="9" fill="#0071e3" fontWeight="700">{coords[lastIdx].v.toLocaleString()}</text>
                      {/* Güven aralığı bandı */}
                      {pts[0]?.lower != null && pts[0]?.upper != null && (() => {
                        const upperCoords = pts.map((p, i) => ({ x: PAD + (i / (vals.length - 1)) * (W - PAD * 2), y: H - PAD - ((p.upper - minV) / range) * (H - PAD * 2) }))
                        const lowerCoords = pts.map((p, i) => ({ x: PAD + (i / (vals.length - 1)) * (W - PAD * 2), y: H - PAD - ((p.lower - minV) / range) * (H - PAD * 2) }))
                        const bandPoly = [...upperCoords.map(c => `${c.x},${c.y}`), ...[...lowerCoords].reverse().map(c => `${c.x},${c.y}`)].join(' ')
                        return <polygon points={bandPoly} fill="rgba(0,113,227,0.05)" />
                      })()}
                    </svg>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#8e8e93', marginTop: '4px', paddingLeft: `${PAD}px`, paddingRight: `${PAD}px` }}>
                      <span>{pts[0]?.date || 'Bugün'}</span>
                      <span>{pts[Math.floor(pts.length / 2)]?.date || '45. Gün'}</span>
                      <span>{pts[lastIdx]?.date || '90. Gün'}</span>
                    </div>
                  </div>
                )
              })()}

              {/* Sezonsal Takvim */}
              {demandData.seasonal_peaks?.length > 0 && (
                <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '16px 20px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f', marginBottom: '12px' }}>📅 Sezonsal Zirveler</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {demandData.seasonal_peaks.map((peak, i) => (
                      <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '10px 14px', borderRadius: '10px', background: '#f5f5f7' }}>
                        <span style={{ fontSize: '20px' }}>{peak.icon || '📅'}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: '500', color: '#1d1d1f' }}>{peak.name || peak.event}</div>
                          <div style={{ fontSize: '11px', color: '#8e8e93' }}>{peak.period || peak.date}</div>
                        </div>
                        {peak.boost && (
                          <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '20px', background: '#e8f9ee', color: '#1a7f37', fontWeight: '600' }}>
                            +{peak.boost}% boost
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Yorumu */}
              {demandData.summary && (
                <div style={{ background: 'linear-gradient(135deg,#0071e3,#34aadc)', borderRadius: '12px', padding: '16px 20px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.7)', marginBottom: '6px' }}>AI TAHMİN ÖZETİ</div>
                  <div style={{ fontSize: '13px', color: 'white', lineHeight: '1.6' }}>{demandData.summary}</div>
                </div>
              )}

              <button onClick={() => setDemandData(null)}
                style={{ alignSelf: 'flex-end', fontSize: '11px', padding: '6px 14px', borderRadius: '7px', border: '0.5px solid #d2d2d7', background: 'white', color: '#8e8e93', cursor: 'pointer', fontFamily: 'inherit' }}>
                Yenile
              </button>
            </>
          )}
        </div>
      )}

      {/* Listing Optimizer */}
      {activeTab === 'listing' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {!listingReport ? (
            <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>✨</div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#1d1d1f', marginBottom: '6px' }}>AI Listing Optimizer</div>
              <div style={{ fontSize: '12px', color: '#8e8e93', marginBottom: '4px' }}>Gemini AI ile Amazon'a hazır listing oluştur</div>
              <div style={{ fontSize: '11px', color: '#8e8e93', marginBottom: '20px' }}>Optimized title · 5 bullet point · Description · Backend keywords</div>
              <button onClick={fetchListing} disabled={listingLoading}
                style={{ padding: '10px 28px', background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
                {listingLoading ? '⏳ AI Oluşturuyor...' : '✨ Listing Oluştur'}
              </button>
            </div>
          ) : (
            <>
              {/* Skor */}
              <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '16px', flex: 1 }}>
                  {[
                    { label: 'Önceki Skor', v: listingReport.score_before, color: '#ff3b30' },
                    { label: '→', v: null },
                    { label: 'Yeni Skor', v: listingReport.score_after, color: '#34c759' },
                  ].map((item, i) => item.v !== null ? (
                    <div key={i} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '24px', fontWeight: '700', color: item.color }}>{item.v}</div>
                      <div style={{ fontSize: '10px', color: '#8e8e93' }}>{item.label}</div>
                    </div>
                  ) : (
                    <div key={i} style={{ fontSize: '20px', color: '#8e8e93', alignSelf: 'center' }}>→</div>
                  ))}
                </div>
                <button onClick={() => setListingReport(null)}
                  style={{ fontSize: '11px', padding: '6px 12px', borderRadius: '7px', border: '0.5px solid #d2d2d7', background: 'white', color: '#8e8e93', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Yenile
                </button>
              </div>

              {/* Optimized Title */}
              <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '16px 20px' }}>
                <div style={{ fontSize: '11px', fontWeight: '600', color: '#8e8e93', marginBottom: '6px' }}>OPTİMİZE TITLE</div>
                <div style={{ fontSize: '13px', color: '#1d1d1f', lineHeight: '1.6', background: '#f0fdf4', padding: '12px', borderRadius: '8px', border: '0.5px solid #b7f0c8' }}>
                  {listingReport.optimized_title}
                </div>
              </div>

              {/* Bullet Points */}
              {listingReport.bullet_points?.length > 0 && (
                <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '16px 20px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#8e8e93', marginBottom: '10px' }}>BULLET POINTS</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {listingReport.bullet_points.map((bp, i) => (
                      <div key={i} style={{ display: 'flex', gap: '10px', padding: '10px 12px', background: '#f8fafc', borderRadius: '8px', fontSize: '12px', color: '#1d1d1f', lineHeight: '1.5' }}>
                        <span style={{ color: '#7c3aed', fontWeight: '700', flexShrink: 0 }}>{i + 1}.</span>
                        {bp}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Backend Keywords */}
              {listingReport.backend_keywords?.length > 0 && (
                <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '16px 20px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#8e8e93', marginBottom: '10px' }}>BACKEND KEYWORDS</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {listingReport.backend_keywords.map((kw, i) => (
                      <span key={i} style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '20px', background: '#f3e8ff', color: '#7c3aed', fontWeight: '500' }}>{kw}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              {listingReport.description && (
                <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '16px 20px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#8e8e93', marginBottom: '8px' }}>DESCRIPTION</div>
                  <div style={{ fontSize: '12px', color: '#3c3c43', lineHeight: '1.7' }}>{listingReport.description}</div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
