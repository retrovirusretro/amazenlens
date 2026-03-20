import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { track, Events } from '../lib/analytics'

const API = ''
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
  const prevAsin = useRef(null)

  const [product, setProduct] = useState(null)
  const [niche, setNiche] = useState(null)
  const [suppliers, setSuppliers] = useState([])
  const [arbitrage, setArbitrage] = useState(null)
  const [reviews, setReviews] = useState(null)

  const [loading, setLoading] = useState(true)
  const [productLoading, setProductLoading] = useState(false)
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

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
      // Cache'den gelse de tracking yap
      track(Events.PRODUCT_VIEW, { asin, title: cachedProduct?.title, price: cachedProduct?.price, from_cache: true })
      return
    }

    try {
      const [prodRes, nicheRes] = await Promise.all([
        cachedProduct ? Promise.resolve({ data: cachedProduct }) : axios.get(`${API}/api/amazon/product/${asin}`),
        cachedNiche ? Promise.resolve({ data: cachedNiche }) : axios.get(`${API}/api/amazon/niche-score/${asin}`),
      ])

      const productData = prodRes.data
      const nicheData = nicheRes.data
      setProduct(productData)
      setNiche(nicheData)
      cacheSet(`product_${asin}`, productData)
      cacheSet(`niche_${asin}`, nicheData)

      // Event tracking — ürün görüntüleme
      track(Events.PRODUCT_VIEW, {
        asin,
        title: productData?.title,
        price: productData?.price,
        niche_score: nicheData?.niche_score?.total_score || nicheData?.total_score,
        category: productData?.category,
      })

      const keyword = productData?.title?.split(' ').slice(0, 3).join(' ') || asin
      const price = productData?.price || 30

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

    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'lovehate' && !reviews && product) {
      const cachedReviews = cacheGet(`reviews_${asin}`)
      if (cachedReviews) { setReviews(cachedReviews); return }
      setReviewsLoading(true)
      axios.get(`${API}/api/reviews/analyze/${asin}?title=${encodeURIComponent(product?.title || '')}`)
        .then(r => { setReviews(r.data); cacheSet(`reviews_${asin}`, r.data) })
        .catch(console.error)
        .finally(() => setReviewsLoading(false))
    }
  }, [activeTab, product])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px', flexDirection: 'column', gap: '12px' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: '32px', height: '32px', border: '2px solid #f0f0f5', borderTop: '2px solid #0071e3', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
      <div style={{ fontSize: '13px', color: '#8e8e93' }}>Ürün analiz ediliyor...</div>
    </div>
  )

  if (!product) return (
    <div style={{ textAlign: 'center', padding: '60px' }}>
      <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔍</div>
      <button onClick={() => navigate('/app/search')} style={{ background: '#0071e3', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
        Aramaya Dön
      </button>
    </div>
  )

  const score = niche?.niche_score?.total_score || niche?.total_score || 0
  const nicheData = niche?.niche_score || niche || {}
  const dims = nicheData?.dimensions || {}
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
    { key: 'sourcing', label: 'Tedarik' },
    { key: 'arbitrage', label: 'Arbitraj' },
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
              return (
                <div key={dim.key} style={{ marginBottom: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: '#1d1d1f' }}>{dim.label}</div>
                      <div style={{ fontSize: '11px', color: '#8e8e93', marginTop: '2px' }}>{dim.desc}</div>
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: '600', color: dim.color }}>{val}/{dim.max}</div>
                  </div>
                  <div style={{ height: '6px', background: '#f0f0f5', borderRadius: '3px' }}>
                    <div style={{ height: '100%', borderRadius: '3px', background: dim.color, width: `${(val / dim.max) * 100}%` }}></div>
                  </div>
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
              <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '16px 20px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f' }}>Genel Memnuniyet</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ fontSize: '22px', fontWeight: '600', color: reviews.sentiment_score >= 70 ? '#34c759' : '#ff9f0a' }}>%{reviews.sentiment_score}</div>
                    {reviews.mock && <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', background: '#f5f5f7', color: '#8e8e93' }}>Demo</span>}
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
    </div>
  )
}
