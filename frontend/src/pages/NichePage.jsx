import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import gsap from 'gsap'
import { scaleLinear } from 'd3-scale'
import { track, Events } from '../lib/analytics'

// ── Radar / Spider Chart (4 eksen) ───────────────────────────────────────────
function RadarChart({ dims, score }) {
  const size = 200
  const cx = size / 2
  const cy = size / 2
  const r = 78
  const axes = [
    { key: 'volume',        label: 'Hacim',    color: '#0071e3', max: 25 },
    { key: 'logistics',     label: 'Lojistik', color: '#34c759', max: 25 },
    { key: 'competition',   label: 'Rekabet',  color: '#ff9f0a', max: 25 },
    { key: 'profitability', label: 'Kar',      color: '#af52de', max: 25 },
  ]
  const n = axes.length
  const angleStep = (2 * Math.PI) / n
  // rotate so first axis points up
  const angle = (i) => i * angleStep - Math.PI / 2

  const scale = scaleLinear().domain([0, 25]).range([0, r])

  const pt = (i, val) => {
    const a = angle(i)
    const dist = scale(Math.min(val, 25))
    return { x: cx + dist * Math.cos(a), y: cy + dist * Math.sin(a) }
  }

  const gridLevels = [5, 10, 15, 20, 25]
  const axisEnd = (i) => ({ x: cx + r * Math.cos(angle(i)), y: cy + r * Math.sin(angle(i)) })
  const labelPt = (i) => {
    const a = angle(i)
    const d = r + 18
    return { x: cx + d * Math.cos(a), y: cy + d * Math.sin(a) }
  }

  const polygon = (vals) => vals.map((v, i) => { const p = pt(i, v); return `${p.x.toFixed(1)},${p.y.toFixed(1)}` }).join(' ')
  const dataVals = axes.map(ax => dims[ax.key] ?? 0)

  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: '100%', maxWidth: '220px' }}>
      {/* Grid polygons */}
      {gridLevels.map(lv => (
        <polygon key={lv}
          points={axes.map((_, i) => { const p = pt(i, lv); return `${p.x.toFixed(1)},${p.y.toFixed(1)}` }).join(' ')}
          fill="none" stroke="#e5e5ea" strokeWidth="0.5" />
      ))}
      {/* Axis lines */}
      {axes.map((_, i) => {
        const e = axisEnd(i)
        return <line key={i} x1={cx} y1={cy} x2={e.x.toFixed(1)} y2={e.y.toFixed(1)} stroke="#d2d2d7" strokeWidth="0.5" />
      })}
      {/* Data polygon */}
      <polygon points={polygon(dataVals)}
        fill={`rgba(0,113,227,0.15)`} stroke="#0071e3" strokeWidth="1.5" strokeLinejoin="round" />
      {/* Data points */}
      {dataVals.map((v, i) => {
        const p = pt(i, v)
        return <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="3.5" fill={axes[i].color} stroke="white" strokeWidth="1.5" />
      })}
      {/* Labels */}
      {axes.map((ax, i) => {
        const lp = labelPt(i)
        return (
          <text key={ax.key} x={lp.x.toFixed(1)} y={lp.y.toFixed(1)}
            textAnchor="middle" dominantBaseline="middle"
            fontSize="8.5" fontWeight="600" fill={ax.color}>
            {ax.label}
          </text>
        )
      })}
    </svg>
  )
}

const API = import.meta.env.VITE_API_URL || 'https://amazenlens-production.up.railway.app'

const SCORE_COLOR = (s) => s >= 80 ? '#34c759' : s >= 60 ? '#ff9f0a' : s >= 40 ? '#ff6b35' : '#ff3b30'
const SCORE_BG = (s) => s >= 80 ? '#e8f9ee' : s >= 60 ? '#fff4e0' : s >= 40 ? '#fff1e8' : '#fff1f0'
const SCORE_TEXT = (s) => s >= 80 ? '#1a7f37' : s >= 60 ? '#b45309' : s >= 40 ? '#c2410c' : '#c00'

const EXAMPLE_ASINS = [
  { asin: 'B07QK955LS', label: 'Silikon Spatula' },
  { asin: 'B08N5WRWNW', label: 'LED Lamba' },
  { asin: 'B07WDMFGDB', label: 'Bambu Tahta' },
]
const EXAMPLE_KEYWORDS = ['yoga mat', 'resistance bands', 'led desk lamp', 'bamboo cutting board']

export default function NichePage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [inputMode, setInputMode] = useState('asin')
  const [asin, setAsin] = useState('')
  const [keyword, setKeyword] = useState('')
  const [result, setResult] = useState(null)
  const [keywordResults, setKeywordResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showMethodology, setShowMethodology] = useState(false)
  const [keepaLoading, setKeepaLoading] = useState(false)
  const [displayScore, setDisplayScore] = useState(0)
  const scoreRef = useRef(null)
  const circleRef = useRef(null)

  const handleKeepaEnhance = async () => {
    if (!result?.asin) return
    setKeepaLoading(true)
    try {
      const res = await axios.get(`${API}/api/amazon/niche-score/${result.asin}?use_keepa=true`)
      setResult(res.data)
    } catch {
      // sessizce geç
    } finally {
      setKeepaLoading(false)
    }
  }

  const VERDICT = (s) => s >= 90 ? t('niche.verdict_excellent') : s >= 70 ? t('niche.verdict_good') : s >= 50 ? t('niche.verdict_medium') : t('niche.verdict_weak')

  const METHODOLOGY = [
    {
      icon: '📦', title: t('niche.dim_volume_title'), color: '#0071e3', bg: '#e8f0fe',
      desc: t('niche.dim_volume_desc'),
      criteria: [t('niche.dim_volume_c1'), t('niche.dim_volume_c2'), t('niche.dim_volume_c3'), t('niche.dim_volume_c4')]
    },
    {
      icon: '🚚', title: t('niche.dim_logistics_title'), color: '#34c759', bg: '#e8f9ee',
      desc: t('niche.dim_logistics_desc'),
      criteria: [t('niche.dim_logistics_c1'), t('niche.dim_logistics_c2'), t('niche.dim_logistics_c3'), t('niche.dim_logistics_c4')]
    },
    {
      icon: '⚔️', title: t('niche.dim_competition_title'), color: '#ff9f0a', bg: '#fff4e0',
      desc: t('niche.dim_competition_desc'),
      criteria: [t('niche.dim_competition_c1'), t('niche.dim_competition_c2'), t('niche.dim_competition_c3'), t('niche.dim_competition_c4')]
    },
    {
      icon: '💰', title: t('niche.dim_profit_title'), color: '#af52de', bg: '#f3e8ff',
      desc: t('niche.dim_profit_desc'),
      criteria: [t('niche.dim_profit_c1'), t('niche.dim_profit_c2'), t('niche.dim_profit_c3'), t('niche.dim_profit_c4')]
    },
  ]

  const handleAnalyze = async () => {
    if (inputMode === 'asin') {
      if (!asin.trim()) return
      setLoading(true); setError(''); setKeywordResults([])
      try {
        const res = await axios.get(`${API}/api/amazon/niche-score/${asin.trim()}`)
        setResult(res.data)
        const s = res.data?.niche_score?.total_score || res.data?.total_score || 0
        track(Events.NICHE_SCORE_VIEW, { asin: asin.trim(), score: s, mode: 'asin' })
      } catch {
        setError(t('niche.error_asin'))
      } finally {
        setLoading(false)
      }
    } else {
      if (!keyword.trim()) return
      setLoading(true); setError(''); setResult(null)
      try {
        const res = await axios.get(`${API}/api/amazon/search?keyword=${encodeURIComponent(keyword)}`)
        const products = res.data?.results || res.data?.search_results || []
        const scored = await Promise.all(
          products.slice(0, 6).map(async (p) => {
            try { const ns = await axios.get(`${API}/api/amazon/niche-score/${p.asin}`); return { ...p, niche: ns.data } }
            catch { return { ...p, niche: null } }
          })
        )
        setKeywordResults(scored)
        track(Events.NICHE_SCORE_VIEW, { keyword: keyword.trim(), results_count: scored.length, mode: 'keyword' })
      } catch {
        setError(t('niche.error_keyword'))
      } finally {
        setLoading(false)
      }
    }
  }

  const score = result?.niche_score?.total_score || result?.total_score || 0
  const nicheData = result?.niche_score || result || {}

  useEffect(() => {
    if (!score) { setDisplayScore(0); return }
    const obj = { val: 0 }
    const tween = gsap.to(obj, {
      val: score,
      duration: 1.4,
      ease: 'power2.out',
      onUpdate: () => setDisplayScore(Math.round(obj.val)),
    })
    // SVG daire dash animasyonu
    if (circleRef.current) {
      gsap.fromTo(circleRef.current,
        { strokeDasharray: '0 314.2' },
        { strokeDasharray: `${(score / 100) * 314.2} 314.2`, duration: 1.4, ease: 'power2.out' }
      )
    }
    // Kart fade-in
    if (scoreRef.current) {
      gsap.from(scoreRef.current, { opacity: 0, scale: 0.92, duration: 0.5, ease: 'back.out(1.4)' })
    }
    return () => tween.kill()
  }, [score])
  const dims = nicheData?.dimensions || {}
  const flags = nicheData?.flags || {}
  const unmet = nicheData?.unmet_demand || {}
  const priceWar = nicheData?.price_war || {}
  const calendar = nicheData?.cultural_calendar || {}
  const prong = nicheData?.prong_test || {}
  const rvi = nicheData?.review_velocity || {}
  const trend = nicheData?.demand_trend || {}

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", maxWidth: '900px' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>

      <div style={{ marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '19px', fontWeight: '600', color: '#1d1d1f', letterSpacing: '-0.3px' }}>{t('niche.title')}</div>
          <div style={{ fontSize: '13px', color: '#8e8e93', marginTop: '3px' }}>{t('niche.subtitle')}</div>
        </div>
        <button onClick={() => setShowMethodology(!showMethodology)}
          style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '8px', border: '0.5px solid #d2d2d7', background: showMethodology ? '#1d1d1f' : 'white', color: showMethodology ? 'white' : '#3c3c43', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '5px' }}>
          📖 {showMethodology ? t('niche.methodology_close') : t('niche.methodology_open')}
        </button>
      </div>

      {showMethodology && (
        <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '20px', marginBottom: '14px', animation: 'fadeIn 0.2s ease' }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#1d1d1f', marginBottom: '6px' }}>📊 {t('niche.methodology_title')}</div>
          <div style={{ fontSize: '12px', color: '#8e8e93', lineHeight: '1.7', marginBottom: '16px' }}>{t('niche.methodology_desc')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            {METHODOLOGY.map(m => (
              <div key={m.title} style={{ background: m.bg, borderRadius: '10px', padding: '14px' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: m.color, marginBottom: '6px' }}>{m.icon} {m.title}</div>
                <div style={{ fontSize: '11px', color: '#3c3c43', lineHeight: '1.6', marginBottom: '8px' }}>{m.desc}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {m.criteria.map(c => (
                    <div key={c} style={{ fontSize: '10px', color: m.color, display: 'flex', gap: '5px' }}>
                      <span>→</span><span>{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ background: '#f5f5f7', borderRadius: '10px', padding: '14px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f', marginBottom: '10px' }}>🔬 {t('niche.extra_metrics')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {[
                { icon: '📈', title: 'Review Velocity Index (RVI)', desc: t('niche.rvi_desc') },
                { icon: '🔥', title: 'Unmet Demand', desc: t('niche.unmet_desc') },
                { icon: '🔱', title: '3 Prong Test', desc: t('niche.prong_desc') },
              ].map(item => (
                <div key={item.title} style={{ background: 'white', borderRadius: '8px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#1d1d1f', marginBottom: '4px' }}>{item.icon} {item.title}</div>
                  <div style={{ fontSize: '10px', color: '#8e8e93', lineHeight: '1.6' }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            {[
              { range: '90-100', labelKey: 'niche.score_excellent', color: '#34c759', bg: '#e8f9ee', descKey: 'niche.score_excellent_desc' },
              { range: '70-89', labelKey: 'niche.score_good', color: '#ff9f0a', bg: '#fff4e0', descKey: 'niche.score_good_desc' },
              { range: '50-69', labelKey: 'niche.score_medium', color: '#ff6b35', bg: '#fff1e8', descKey: 'niche.score_medium_desc' },
              { range: '0-49', labelKey: 'niche.score_weak', color: '#ff3b30', bg: '#fff1f0', descKey: 'niche.score_weak_desc' },
            ].map(s => (
              <div key={s.range} style={{ background: s.bg, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: s.color }}>{s.range}</div>
                <div style={{ fontSize: '11px', fontWeight: '600', color: s.color }}>{t(s.labelKey)}</div>
                <div style={{ fontSize: '10px', color: '#8e8e93', marginTop: '2px' }}>{t(s.descKey)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '16px 20px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', gap: '4px', background: '#f5f5f7', borderRadius: '8px', padding: '3px', marginBottom: '14px', width: 'fit-content' }}>
          {[{ key: 'asin', label: t('niche.mode_asin') }, { key: 'keyword', label: t('niche.mode_keyword') }].map(m => (
            <button key={m.key} onClick={() => { setInputMode(m.key); setResult(null); setKeywordResults([]); setError('') }}
              style={{ padding: '6px 16px', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit', background: inputMode === m.key ? 'white' : 'transparent', color: inputMode === m.key ? '#1d1d1f' : '#8e8e93', boxShadow: inputMode === m.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
              {m.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', color: '#8e8e93', marginBottom: '5px', fontWeight: '500' }}>
              {inputMode === 'asin' ? 'Amazon ASIN' : t('niche.keyword_label')}
            </div>
            <input type="text"
              value={inputMode === 'asin' ? asin : keyword}
              onChange={e => inputMode === 'asin' ? setAsin(e.target.value) : setKeyword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
              placeholder={inputMode === 'asin' ? t('niche.asin_placeholder') : t('niche.keyword_placeholder')}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '0.5px solid #d2d2d7', fontSize: '13px', fontFamily: 'inherit', color: '#1d1d1f', outline: 'none', background: '#f5f5f7', boxSizing: 'border-box' }} />
          </div>
          <button onClick={handleAnalyze} disabled={loading || !(inputMode === 'asin' ? asin.trim() : keyword.trim())}
            style={{ background: (inputMode === 'asin' ? asin.trim() : keyword.trim()) ? '#0071e3' : '#d2d2d7', color: 'white', border: 'none', padding: '9px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit', height: '38px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {loading ? <div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div> : '🎯'}
            {loading ? t('niche.analyzing') : inputMode === 'asin' ? t('niche.btn_analyze') : t('niche.btn_scan')}
          </button>
        </div>

        {error && <div style={{ marginTop: '10px', fontSize: '12px', color: '#ff3b30', padding: '8px 12px', background: '#fff1f0', borderRadius: '6px' }}>{error}</div>}

        <div style={{ marginTop: '12px', display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '11px', color: '#8e8e93' }}>{t('niche.example')}:</div>
          {inputMode === 'asin'
            ? EXAMPLE_ASINS.map(ex => (
              <div key={ex.asin} onClick={() => setAsin(ex.asin)}
                style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', border: '0.5px solid #d2d2d7', background: 'white', color: '#0071e3', cursor: 'pointer' }}>
                {ex.label}
              </div>
            ))
            : EXAMPLE_KEYWORDS.map(kw => (
              <div key={kw} onClick={() => setKeyword(kw)}
                style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', border: '0.5px solid #d2d2d7', background: 'white', color: '#0071e3', cursor: 'pointer' }}>
                {kw}
              </div>
            ))
          }
        </div>
      </div>

      {keywordResults.length > 0 && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f', marginBottom: '10px' }}>
            "{keyword}" — {keywordResults.length} {t('niche.product_analysis')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {keywordResults.map((p) => {
              const s = p.niche?.niche_score?.total_score || p.niche?.total_score || 0
              return (
                <div key={p.asin} onClick={() => navigate(`/app/product/${p.asin}`)}
                  style={{ background: 'white', borderRadius: '11px', border: '0.5px solid #e5e5ea', padding: '14px', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: SCORE_BG(s), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', color: SCORE_TEXT(s) }}>{s}</div>
                    <div style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', background: SCORE_BG(s), color: SCORE_TEXT(s), fontWeight: '500' }}>
                      {s >= 70 ? `✅ ${t('niche.score_good')}` : s >= 50 ? `⚠️ ${t('niche.score_medium')}` : `❌ ${t('niche.score_weak')}`}
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: '500', color: '#1d1d1f', lineHeight: '1.4', marginBottom: '6px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {p.title || p.asin}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#8e8e93', marginBottom: '6px' }}>
                    <span>${p.price || '—'}</span>
                    <span>BSR #{p.bestseller_rank?.toLocaleString() || '—'}</span>
                  </div>
                  <div style={{ height: '3px', background: '#f0f0f5', borderRadius: '2px' }}>
                    <div style={{ height: '100%', borderRadius: '2px', background: SCORE_COLOR(s), width: `${s}%` }}></div>
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '11px', color: '#0071e3', textAlign: 'right' }}>{t('niche.detail')} →</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {result && (
        <div style={{ animation: 'fadeIn 0.3s ease', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '10px', background: SCORE_BG(score), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '700', color: SCORE_TEXT(score), flexShrink: 0 }}>{displayScore}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#1d1d1f', lineHeight: '1.4', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {result.title || result.asin}
              </div>
              <div style={{ fontSize: '11px', color: '#8e8e93', fontFamily: 'monospace' }}>
                ASIN: {result.asin} {result.price ? `· $${result.price}` : ''}
                {nicheData.monthly_sales_estimate ? ` · ~${nicheData.monthly_sales_estimate.toLocaleString()} ${t('niche.sales_per_month')}` : ''}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              <button onClick={() => navigate(`/app/product/${result.asin}`)}
                style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '8px', border: '0.5px solid #d2d2d7', background: 'white', color: '#0071e3', cursor: 'pointer', fontFamily: 'inherit' }}>
                {t('niche.product_detail')} →
              </button>
              <button onClick={() => navigate('/app/sourcing')}
                style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '8px', border: 'none', background: '#0071e3', color: 'white', cursor: 'pointer', fontFamily: 'inherit' }}>
                {t('niche.find_supplier')} →
              </button>
              {!nicheData?.keepa?.enhanced && (
                <button onClick={handleKeepaEnhance} disabled={keepaLoading}
                  style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '8px', border: '0.5px solid #ff9f0a', background: keepaLoading ? '#fff4e0' : 'white', color: '#b45309', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {keepaLoading ? '⏳' : '🔑'} {keepaLoading ? t('niche.keepa_loading') : t('niche.keepa_enhance')}
                </button>
              )}
              {nicheData?.keepa?.enhanced && (
                <span style={{ fontSize: '11px', padding: '6px 10px', borderRadius: '8px', background: '#e8f9ee', color: '#1a7f37', fontWeight: '500' }}>
                  {t('niche.keepa_active')}
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '12px' }}>
            <div ref={scoreRef} style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ position: 'relative', width: '120px', height: '120px', marginBottom: '14px' }}>
                <svg viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)', width: '120px', height: '120px' }}>
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#f0f0f5" strokeWidth="10" />
                  <circle ref={circleRef} cx="60" cy="60" r="50" fill="none" stroke={SCORE_COLOR(score)} strokeWidth="10" strokeDasharray={`${(score / 100) * 314.2} 314.2`} strokeLinecap="round" />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: '#1d1d1f' }}>{displayScore}</div>
                  <div style={{ fontSize: '11px', color: '#8e8e93' }}>/100</div>
                </div>
              </div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f', textAlign: 'center', marginBottom: '6px' }}>{VERDICT(score)}</div>
              <div style={{ fontSize: '11px', color: '#8e8e93', textAlign: 'center', lineHeight: '1.6', marginBottom: '12px' }}>
                {nicheData?.recommendation || t('niche.analysis_done')}
              </div>
              {rvi?.rvi !== undefined && (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ background: '#f5f5f7', borderRadius: '8px', padding: '8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#8e8e93' }}>📈 {t('niche.review_velocity')}</div>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: rvi.score >= 7 ? '#34c759' : rvi.score >= 4 ? '#ff9f0a' : '#ff3b30' }}>{rvi.rvi}/{t('niche.per_month')}</div>
                  </div>
                  <div style={{ background: '#f5f5f7', borderRadius: '8px', padding: '8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#8e8e93' }}>📊 {t('niche.demand_trend')}</div>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: trend.score >= 7 ? '#34c759' : '#ff9f0a' }}>{trend.trend || '—'}</div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '20px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f', marginBottom: '16px' }}>{t('niche.four_dim_title')}</div>
              {[
                { key: 'volume', label: t('niche.dim_volume'), max: 25, color: '#0071e3', icon: '📦', desc: t('niche.dim_volume_short') },
                { key: 'logistics', label: t('niche.dim_logistics'), max: 25, color: '#34c759', icon: '🚚', desc: t('niche.dim_logistics_short') },
                { key: 'competition', label: t('niche.dim_competition'), max: 25, color: '#ff9f0a', icon: '⚔️', desc: t('niche.dim_competition_short') },
                { key: 'profitability', label: t('niche.dim_profit'), max: 25, color: '#af52de', icon: '💰', desc: t('niche.dim_profit_short') },
              ].map(dim => {
                const val = dims[dim.key] ?? 0
                return (
                  <div key={dim.key} style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <div>
                        <span style={{ fontSize: '13px', fontWeight: '500', color: '#1d1d1f' }}>{dim.icon} {dim.label}</span>
                        <span style={{ fontSize: '11px', color: '#8e8e93', marginLeft: '6px' }}>{dim.desc}</span>
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: dim.color }}>{val}<span style={{ fontSize: '10px', color: '#8e8e93' }}>/{dim.max}</span></div>
                    </div>
                    <div style={{ height: '6px', background: '#f0f0f5', borderRadius: '3px' }}>
                      <div style={{ height: '100%', borderRadius: '3px', background: dim.color, width: `${(val / dim.max) * 100}%`, transition: 'width 0.5s ease' }}></div>
                    </div>
                  </div>
                )
              })}
              {nicheData?.estimated_margin && (
                <div style={{ padding: '10px 14px', background: '#e8f9ee', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '12px', color: '#1a7f37', fontWeight: '500' }}>💰 {t('niche.est_margin')}</div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#1a7f37' }}>%{nicheData.estimated_margin}</div>
                </div>
              )}
            </div>
          </div>

          {/* Radar Chart */}
          {Object.keys(dims).length > 0 && (
            <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                <RadarChart dims={dims} score={score} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f', marginBottom: '10px' }}>📡 Boyut Radar</div>
                {[
                  { key: 'volume',        label: 'Hacim',    color: '#0071e3', max: 25 },
                  { key: 'logistics',     label: 'Lojistik', color: '#34c759', max: 25 },
                  { key: 'competition',   label: 'Rekabet',  color: '#ff9f0a', max: 25 },
                  { key: 'profitability', label: 'Kar',      color: '#af52de', max: 25 },
                ].map(ax => {
                  const val = dims[ax.key] ?? 0
                  const pct = (val / ax.max) * 100
                  return (
                    <div key={ax.key} style={{ marginBottom: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                        <span style={{ fontSize: '11px', color: '#3c3c43' }}>{ax.label}</span>
                        <span style={{ fontSize: '11px', fontWeight: '600', color: ax.color }}>{val}/{ax.max}</span>
                      </div>
                      <div style={{ height: '4px', background: '#f0f0f5', borderRadius: '2px' }}>
                        <div style={{ height: '100%', borderRadius: '2px', background: ax.color, width: `${pct}%`, transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {prong && Object.keys(prong).length > 0 && (
            <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '16px 20px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f', marginBottom: '12px' }}>
                🔱 {t('niche.prong_title')} <span style={{ fontSize: '11px', color: '#8e8e93', fontWeight: '400' }}>— Dan Rodgers</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '10px' }}>
                {[
                  { key: 'high_price', label: t('niche.prong_price'), desc: '$25+', icon: '💲' },
                  { key: 'dev_potential', label: t('niche.prong_dev'), desc: t('niche.prong_dev_desc'), icon: '🔧' },
                  { key: 'low_review_ok', label: t('niche.prong_review'), desc: t('niche.prong_review_desc'), icon: '⭐' },
                ].map(p => (
                  <div key={p.key} style={{ padding: '12px', borderRadius: '10px', background: prong[p.key] ? '#e8f9ee' : '#fff1f0', border: `0.5px solid ${prong[p.key] ? '#b7f0c8' : '#ffd0ce'}`, textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', marginBottom: '4px' }}>{p.icon}</div>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: prong[p.key] ? '#1a7f37' : '#c00', marginBottom: '3px' }}>
                      {prong[p.key] ? '✅' : '❌'} {p.label}
                    </div>
                    <div style={{ fontSize: '10px', color: '#8e8e93' }}>{p.desc}</div>
                  </div>
                ))}
              </div>
              {prong.verdict && <div style={{ padding: '10px 14px', background: '#f5f5f7', borderRadius: '8px', fontSize: '12px', color: '#3c3c43' }}>📝 {prong.verdict}</div>}
            </div>
          )}

          {/* Fiyat Savaşı Uyarısı */}
          {priceWar?.detected && (
            <div style={{ background: 'white', borderRadius: '12px', border: `0.5px solid ${priceWar.level === 'critical' ? '#ffd0ce' : '#fde68a'}`, padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f' }}>⚔️ Fiyat Savaşı Analizi</div>
                <span style={{ fontSize: '11px', padding: '2px 10px', borderRadius: '10px', fontWeight: '600',
                  background: priceWar.level === 'critical' ? '#fee2e2' : '#fff4e0',
                  color: priceWar.level === 'critical' ? '#dc2626' : '#b45309'
                }}>{priceWar.level_tr}</span>
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px', padding: '8px 12px', background: '#f8fafc', borderRadius: '8px' }}>
                💡 {priceWar.recommendation}
              </div>
              {priceWar.signals?.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', padding: '8px 12px', borderRadius: '8px', marginBottom: '6px',
                  background: s.type === 'critical_price_drop' ? '#fee2e2' : '#fff7ed'
                }}>
                  <span style={{ fontSize: '12px', color: '#374151' }}>{s.message}</span>
                </div>
              ))}
              {priceWar.price_current > 0 && (
                <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '12px', color: '#64748b' }}>
                  <span>Mevcut: <strong>${priceWar.price_current}</strong></span>
                  <span>90g Zirve: <strong>${priceWar.price_max_90d}</strong></span>
                  <span>Risk Skoru: <strong style={{ color: priceWar.risk_score >= 60 ? '#dc2626' : '#b45309' }}>{priceWar.risk_score}/100</strong></span>
                </div>
              )}
            </div>
          )}

          {/* Kültürel Takvim */}
          {calendar?.best_listing_time && (
            <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '16px 20px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f', marginBottom: '12px' }}>{t('niche.calendar_title')}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div style={{ background: '#f0fdf4', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>{t('niche.calendar_recommended')}</div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#16a34a' }}>{calendar.best_listing_time.month_name}</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>{calendar.best_listing_time.for_event} {t('niche.calendar_for_event')}</div>
                </div>
                <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>{t('niche.calendar_urgency')}</div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#1d1d1f' }}>{calendar.best_listing_time.urgency}</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>{t('niche.calendar_boost')}: {calendar.best_listing_time.boost_score}/100</div>
                </div>
              </div>
              {calendar.upcoming_events?.length > 0 && (
                <div>
                  <div style={{ fontSize: '11px', color: '#8e8e93', marginBottom: '6px' }}>{t('niche.calendar_upcoming')}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {calendar.upcoming_events.map((ev, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: '8px', fontSize: '12px' }}>
                        <span style={{ fontWeight: '500', color: '#1d1d1f' }}>{ev.event}</span>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ color: '#64748b' }}>{ev.months_until_event} ay sonra</span>
                          <span style={{ padding: '2px 8px', borderRadius: '10px', background: '#fff4e0', color: '#b45309', fontWeight: '500' }}>
                            +{ev.boost_score}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {unmet?.detected && (
            <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f' }}>🔥 {t('niche.unmet_demand')}</div>
                <span style={{ fontSize: '11px', padding: '2px 10px', borderRadius: '10px', background: '#fff4e0', color: '#b45309', fontWeight: '600' }}>{unmet.level}</span>
              </div>
              {(unmet.signals || []).map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', padding: '10px 14px', background: '#fff4e0', borderRadius: '8px', marginBottom: '6px' }}>
                  <span style={{ color: '#ff9f0a' }}>⚡</span>
                  <span style={{ fontSize: '12px', color: '#92400e' }}>{s}</span>
                </div>
              ))}
            </div>
          )}

          {flags && Object.values(flags).some(v => v) && (
            <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '16px 20px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f', marginBottom: '12px' }}>🚩 {t('niche.red_flags')}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                {[
                  { key: 'big_brand', label: t('niche.flag_brand'), desc: t('niche.flag_brand_desc') },
                  { key: 'seasonal', label: t('niche.flag_seasonal'), desc: t('niche.flag_seasonal_desc') },
                  { key: 'low_development', label: t('niche.flag_lowdev'), desc: t('niche.flag_lowdev_desc') },
                  { key: 'patent_risk', label: t('niche.flag_patent'), desc: t('niche.flag_patent_desc') },
                  { key: 'fragile', label: t('niche.flag_fragile'), desc: t('niche.flag_fragile_desc') },
                  { key: 'heavy', label: t('niche.flag_heavy'), desc: t('niche.flag_heavy_desc') },
                ].filter(f => flags[f.key]).map(f => (
                  <div key={f.key} style={{ padding: '8px 14px', borderRadius: '8px', background: '#fff1f0', border: '0.5px solid #ffd0ce' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#c00' }}>🚩 {f.label}</div>
                    <div style={{ fontSize: '10px', color: '#8e8e93', marginTop: '2px' }}>{f.desc}</div>
                  </div>
                ))}
              </div>
              <div style={{ padding: '10px 14px', background: '#fff1f0', borderRadius: '8px', fontSize: '12px', color: '#c00' }}>
                ⚠️ {Object.values(flags).filter(Boolean).length} {t('niche.red_flags_warning')}
              </div>
            </div>
          )}

          {/* Bu Nişi Kazanmak İçin Ne Lazım */}
          {nicheData?.dimension_insights && (() => {
            const allActions = [
              { key: 'volume',       icon: '📦', label: t('niche.dim_volume'),      color: '#0071e3', bg: '#e8f0fe' },
              { key: 'logistics',    icon: '🚚', label: t('niche.dim_logistics'),   color: '#34c759', bg: '#e8f9ee' },
              { key: 'competition',  icon: '⚔️', label: t('niche.dim_competition'), color: '#ff9f0a', bg: '#fff4e0' },
              { key: 'profitability',icon: '💰', label: t('niche.dim_profit'),      color: '#af52de', bg: '#f3e8ff' },
            ].flatMap(dim => {
              const insight = nicheData.dimension_insights[dim.key] || {}
              return (insight.actions || []).map(action => ({ ...dim, action }))
            })
            if (allActions.length === 0) return null
            return (
              <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '16px 20px' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f', marginBottom: '14px' }}>🏆 Bu Nişi Kazanmak İçin Ne Lazım?</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {allActions.map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '10px 14px', background: item.bg, borderRadius: '10px' }}>
                      <span style={{ fontSize: '16px', flexShrink: 0 }}>{item.icon}</span>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: '600', color: item.color, marginBottom: '2px' }}>{item.label}</div>
                        <div style={{ fontSize: '12px', color: '#3c3c43', lineHeight: '1.5' }}>{item.action}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '16px 20px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f', marginBottom: '12px' }}>🚀 {t('niche.next_steps')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {[
                { label: `🔍 ${t('niche.product_detail')}`, desc: t('niche.next_product_desc'), to: `/app/product/${result.asin}`, color: '#0071e3', bg: '#e8f0fe' },
                { label: `🏭 ${t('niche.find_supplier')}`, desc: t('niche.next_supplier_desc'), to: '/app/sourcing', color: '#34c759', bg: '#e8f9ee' },
                { label: `🧮 ${t('niche.calculator')}`, desc: t('niche.next_calc_desc'), to: '/app/calculator', color: '#ff9f0a', bg: '#fff4e0' },
              ].map(btn => (
                <div key={btn.label} onClick={() => navigate(btn.to)} style={{ background: btn.bg, borderRadius: '10px', padding: '12px 14px', cursor: 'pointer' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: btn.color, marginBottom: '3px' }}>{btn.label}</div>
                  <div style={{ fontSize: '11px', color: '#8e8e93' }}>{btn.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!result && keywordResults.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#8e8e93' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</div>
          <div style={{ fontSize: '15px', fontWeight: '500', color: '#1d1d1f', marginBottom: '6px' }}>{t('niche.title')}</div>
          <div style={{ fontSize: '13px', maxWidth: '360px', margin: '0 auto 16px', lineHeight: '1.6' }}>{t('niche.empty_desc')}</div>
          <button onClick={() => setShowMethodology(true)}
            style={{ fontSize: '12px', padding: '8px 18px', borderRadius: '8px', border: '0.5px solid #d2d2d7', background: 'white', color: '#0071e3', cursor: 'pointer', fontFamily: 'inherit' }}>
            📖 {t('niche.methodology_open')}
          </button>
        </div>
      )}
    </div>
  )
}
