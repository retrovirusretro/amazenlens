import { useState, useEffect } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
const MONTH_NAMES_FULL = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']

const CHART_COLORS = ['#0071e3', '#34c759', '#ff9f0a', '#af52de']

const MOCK_TREND = {
  keyword: 'yoga mat',
  avg_score: 62,
  recent_score: 74,
  trend_score: 74,
  direction: 'rising',
  direction_tr: '🔥 Yükselen',
  monthly: [45, 48, 52, 58, 60, 55, 62, 68, 72, 70, 74, 74],
  peak_month: 11,
  is_seasonal: false,
  seasonality_ratio: 0.39,
  timeframe: 'today 12-m',
  geo: 'US',
}

const MOCK_RELATED = {
  rising: [
    { query: 'yoga mat thick', value: 'Breakout' },
    { query: 'yoga mat non slip', value: 450 },
    { query: 'eco yoga mat', value: 320 },
    { query: 'yoga mat bag', value: 210 },
    { query: 'yoga mat cleaning spray', value: 180 },
  ],
  top: [
    { query: 'best yoga mat', value: 100 },
    { query: 'yoga mat amazon', value: 85 },
    { query: 'yoga mat for beginners', value: 72 },
    { query: 'yoga mat 6mm', value: 60 },
    { query: 'purple yoga mat', value: 48 },
  ],
}

const MOCK_CALENDAR = {
  market: 'US',
  keyword_category: 'all',
  current_month: 3,
  best_listing_time: {
    month: 6,
    month_name: 'Temmuz',
    for_event: 'Prime Day',
    urgency: '🟡 Hazırlığa başla',
    boost_score: 90,
  },
  upcoming_events: [
    { event: 'Prime Day', event_month: 7, ideal_listing_month: 5, months_until_event: 4, boost_score: 90, urgency: '🟡 Hazırlığa başla' },
    { event: 'Back to School', event_month: 9, ideal_listing_month: 7, months_until_event: 6, boost_score: 75, urgency: '🟢 Planla' },
    { event: 'Black Friday', event_month: 11, ideal_listing_month: 9, months_until_event: 8, boost_score: 100, urgency: '🟢 Planla' },
  ],
  all_events: [
    { month: 1, event: 'New Year Sales', boost: 30, category: 'all' },
    { month: 2, event: "Valentine's Day", boost: 80, category: 'gifts' },
    { month: 5, event: "Mother's Day", boost: 70, category: 'gifts' },
    { month: 7, event: 'Prime Day', boost: 90, category: 'all' },
    { month: 9, event: 'Back to School', boost: 75, category: 'school' },
    { month: 11, event: 'Black Friday', boost: 100, category: 'all' },
    { month: 12, event: 'Christmas', boost: 95, category: 'all' },
  ],
}

// ─── SVG Line Chart ───────────────────────────────────────────────────────────
function TrendChart({ datasets }) {
  const W = 600, H = 200
  const PAD = { top: 16, right: 16, bottom: 32, left: 36 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  const allVals = datasets.flatMap(d => d.monthly || [])
  const maxVal = Math.max(...allVals, 10)

  const xStep = chartW / 11
  const yScale = v => PAD.top + chartH - (v / maxVal) * chartH

  const makePath = (monthly) =>
    monthly.map((v, i) => `${i === 0 ? 'M' : 'L'}${(PAD.left + i * xStep).toFixed(1)},${yScale(v).toFixed(1)}`).join(' ')

  const makeArea = (monthly) => {
    const line = monthly.map((v, i) => `${(PAD.left + i * xStep).toFixed(1)},${yScale(v).toFixed(1)}`).join(' L')
    const lastX = (PAD.left + (monthly.length - 1) * xStep).toFixed(1)
    const baseY = (PAD.top + chartH).toFixed(1)
    return `M${PAD.left},${yScale(monthly[0]).toFixed(1)} L${line} L${lastX},${baseY} L${PAD.left},${baseY} Z`
  }

  const yTicks = [0, 25, 50, 75, 100].filter(t => t <= maxVal + 10)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      {/* Y gridlines + labels */}
      {yTicks.map(t => (
        <g key={t}>
          <line
            x1={PAD.left} y1={yScale(t)}
            x2={W - PAD.right} y2={yScale(t)}
            stroke="#e5e5ea" strokeWidth="0.5"
          />
          <text x={PAD.left - 6} y={yScale(t) + 4} textAnchor="end" fontSize="9" fill="#8e8e93">{t}</text>
        </g>
      ))}

      {/* Area fills */}
      {datasets.map((d, idx) => (
        d.monthly?.length > 0 && (
          <path
            key={`area-${idx}`}
            d={makeArea(d.monthly)}
            fill={d.color}
            fillOpacity={datasets.length === 1 ? 0.1 : 0.06}
          />
        )
      ))}

      {/* Lines */}
      {datasets.map((d, idx) => (
        d.monthly?.length > 0 && (
          <path
            key={`line-${idx}`}
            d={makePath(d.monthly)}
            fill="none"
            stroke={d.color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )
      ))}

      {/* Dots for single dataset only */}
      {datasets.length === 1 && datasets[0].monthly?.map((v, i) => (
        <circle
          key={i}
          cx={(PAD.left + i * xStep).toFixed(1)}
          cy={yScale(v).toFixed(1)}
          r="3"
          fill={datasets[0].color}
          stroke="white"
          strokeWidth="1.5"
        />
      ))}

      {/* X axis labels */}
      {MONTHS.map((m, i) => (
        <text
          key={m}
          x={(PAD.left + i * xStep).toFixed(1)}
          y={H - 4}
          textAnchor="middle"
          fontSize="9"
          fill="#8e8e93"
        >{m}</text>
      ))}
    </svg>
  )
}

// ─── Calendar Heat Row ────────────────────────────────────────────────────────
function HeatRow({ event, maxBoost }) {
  const pct = event.boost / maxBoost
  const barColor = pct >= 0.9 ? '#ff3b30' : pct >= 0.7 ? '#ff9f0a' : pct >= 0.5 ? '#34c759' : '#8e8e93'
  const badgeBg = pct >= 0.9 ? '#fff1f0' : pct >= 0.7 ? '#fff4e0' : '#e8f9ee'
  const badgeColor = pct >= 0.9 ? '#c00' : pct >= 0.7 ? '#b45309' : '#1a7f37'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 0', borderBottom: '0.5px solid #f5f5f7' }}>
      <div style={{ width: '56px', fontSize: '11px', color: '#8e8e93', flexShrink: 0 }}>
        {MONTH_NAMES_FULL[(event.month || 1) - 1]}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ height: '8px', borderRadius: '4px', background: '#f0f0f0', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct * 100}%`, background: barColor, borderRadius: '4px', transition: 'width 0.4s ease' }} />
        </div>
      </div>
      <div style={{ width: '140px', fontSize: '11px', color: '#1d1d1f', flexShrink: 0 }}>{event.event}</div>
      <div style={{ fontSize: '10px', fontWeight: '600', padding: '2px 7px', borderRadius: '10px', background: badgeBg, color: badgeColor, flexShrink: 0 }}>
        +{event.boost}%
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TrendRadarPage() {
  const [keyword, setKeyword] = useState('yoga mat')
  const [inputVal, setInputVal] = useState('yoga mat')
  const [market, setMarket] = useState('US')
  const [trendData, setTrendData] = useState(null)
  const [relatedData, setRelatedData] = useState(null)
  const [calendarData, setCalendarData] = useState(null)
  const [loading, setLoading] = useState(false)

  // Compare state
  const [compareKeywords, setCompareKeywords] = useState([])
  const [compareInput, setCompareInput] = useState('')
  const [compareData, setCompareData] = useState(null)
  const [compareLoading, setCompareLoading] = useState(false)

  const fetchAll = async (kw, geo) => {
    setLoading(true)
    try {
      const [trendRes, relatedRes, calRes] = await Promise.allSettled([
        axios.get(`${API}/api/trends/keyword`, {
          params: { keyword: kw, timeframe: 'today 12-m', geo: geo === 'Global' ? '' : geo },
        }),
        axios.get(`${API}/api/trends/related`, { params: { keyword: kw } }),
        axios.get(`${API}/api/trends/calendar`, {
          params: { keyword: kw, market: geo === 'Global' ? 'US' : geo },
        }),
      ])
      setTrendData(trendRes.status === 'fulfilled' ? trendRes.value.data : { ...MOCK_TREND, keyword: kw })
      setRelatedData(relatedRes.status === 'fulfilled' ? relatedRes.value.data : MOCK_RELATED)
      setCalendarData(calRes.status === 'fulfilled' ? calRes.value.data : MOCK_CALENDAR)
    } catch {
      setTrendData({ ...MOCK_TREND, keyword: kw })
      setRelatedData(MOCK_RELATED)
      setCalendarData(MOCK_CALENDAR)
    } finally {
      setLoading(false)
    }
  }

  // Auto-search on mount
  useEffect(() => {
    fetchAll('yoga mat', 'US')
  }, [])

  const handleAnalyze = () => {
    if (!inputVal.trim()) return
    const kw = inputVal.trim()
    setKeyword(kw)
    setCompareData(null)
    fetchAll(kw, market)
  }

  const handleMarketChange = (m) => {
    setMarket(m)
    if (keyword) {
      setCompareData(null)
      fetchAll(keyword, m)
    }
  }

  const handleAddCompare = () => {
    const kw = compareInput.trim()
    if (!kw || compareKeywords.length >= 3 || compareKeywords.includes(kw) || kw === keyword) return
    setCompareKeywords(prev => [...prev, kw])
    setCompareInput('')
  }

  const handleRemoveCompare = (kw) => {
    setCompareKeywords(prev => prev.filter(k => k !== kw))
    setCompareData(null)
  }

  const handleCompare = async () => {
    const all = [keyword, ...compareKeywords]
    if (all.length < 2) return
    setCompareLoading(true)
    try {
      const res = await axios.post(`${API}/api/trends/compare`, { keywords: all, timeframe: 'today 12-m' })
      setCompareData(res.data)
    } catch {
      // Mock compare with slight offsets
      const base = trendData?.monthly || MOCK_TREND.monthly
      const mockCompareData = {}
      const offsets = [0, 14, -12, 8]
      all.forEach((kw, i) => {
        const shifted = base.map(v => Math.max(0, Math.min(100, v + offsets[i])))
        mockCompareData[kw] = { avg: Math.round(shifted.reduce((a, b) => a + b, 0) / shifted.length), monthly: shifted }
      })
      setCompareData({ keywords: all, data: mockCompareData })
    } finally {
      setCompareLoading(false)
    }
  }

  // Resolved data (with mock fallback)
  const td = trendData || MOCK_TREND
  const rd = relatedData || MOCK_RELATED
  const cd = calendarData || MOCK_CALENDAR

  const directionColor = td.direction === 'rising' ? '#34c759' : td.direction === 'falling' ? '#ff3b30' : '#ff9f0a'
  const directionBg = td.direction === 'rising' ? '#e8f9ee' : td.direction === 'falling' ? '#fff1f0' : '#fff4e0'

  // Shared styles
  const card = {
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    padding: '20px',
    marginBottom: '16px',
  }

  const sectionLabel = {
    fontSize: '11px',
    fontWeight: '600',
    color: '#8e8e93',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '4px',
  }

  return (
    <div style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif', color: '#1d1d1f', maxWidth: '900px' }}>
      {/* Page header */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#1d1d1f', margin: 0, letterSpacing: '-0.3px' }}>
          Trend Radar
        </h1>
        <p style={{ fontSize: '13px', color: '#8e8e93', marginTop: '4px', marginBottom: 0 }}>
          Google Trends verisiyle 12 aylık trend analizi
        </p>
      </div>

      {/* Search + Market */}
      <div style={{ ...card, display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '220px' }}>
          <div style={sectionLabel}>Keyword</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
              placeholder="ör. yoga mat, resistance bands..."
              style={{
                flex: 1, padding: '10px 14px', borderRadius: '9px',
                border: '0.5px solid #d2d2d7', fontSize: '14px',
                fontFamily: 'inherit', color: '#1d1d1f', outline: 'none', background: '#f5f5f7',
              }}
            />
            <button
              onClick={handleAnalyze}
              disabled={loading}
              style={{
                padding: '10px 20px',
                background: loading ? '#8e8e93' : '#0071e3',
                color: 'white', border: 'none', borderRadius: '9px',
                fontSize: '14px', fontWeight: '500', cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', whiteSpace: 'nowrap',
              }}
            >
              {loading ? 'Analiz...' : 'Analiz Et'}
            </button>
          </div>
        </div>

        <div>
          <div style={sectionLabel}>Market</div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {['Global', 'US', 'DE', 'TR'].map(m => (
              <button
                key={m}
                onClick={() => handleMarketChange(m)}
                style={{
                  padding: '9px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer',
                  fontSize: '12px', fontWeight: '500', fontFamily: 'inherit',
                  background: market === m ? '#0071e3' : '#f5f5f7',
                  color: market === m ? 'white' : '#1d1d1f',
                  transition: 'background 0.15s',
                }}
              >{m}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        {[
          { label: 'Keyword', value: td.keyword },
          { label: 'Ort. Skor', value: td.avg_score ?? '—' },
          { label: 'Son Skor', value: td.trend_score ?? '—' },
          { label: 'Trend Yönü', value: td.direction_tr || '—', extraBg: directionBg, extraColor: directionColor },
          { label: 'Peak Ay', value: td.peak_month ? MONTH_NAMES_FULL[td.peak_month - 1] : '—' },
          { label: 'Sezonluk', value: td.is_seasonal ? 'Evet' : 'Hayır' },
        ].map(item => (
          <div key={item.label} style={{ background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', padding: '14px 16px' }}>
            <div style={{ fontSize: '10px', color: '#8e8e93', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '5px' }}>
              {item.label}
            </div>
            <div style={{
              fontSize: '13px', fontWeight: '600',
              color: item.extraColor || '#1d1d1f',
              background: item.extraBg || 'transparent',
              padding: item.extraBg ? '3px 8px' : 0,
              borderRadius: item.extraBg ? '8px' : 0,
              display: 'inline-block',
            }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* Trend Chart */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '600', color: '#1d1d1f' }}>12 Aylık Trend Grafiği</div>
            <div style={{ fontSize: '12px', color: '#8e8e93', marginTop: '2px' }}>
              {td.keyword} — {market}
            </div>
          </div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            padding: '5px 12px', borderRadius: '10px',
            background: directionBg, color: directionColor,
            fontSize: '12px', fontWeight: '600',
          }}>
            {td.direction_tr}
          </div>
        </div>

        {td.monthly?.length > 0 ? (
          <TrendChart datasets={[{ label: td.keyword, monthly: td.monthly, color: '#0071e3' }]} />
        ) : (
          <div style={{ height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8e8e93', fontSize: '13px', background: '#f5f5f7', borderRadius: '9px' }}>
            Veri bulunamadı
          </div>
        )}
      </div>

      {/* Related Queries + Cultural Calendar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        {/* Related Queries */}
        <div style={card}>
          <div style={{ fontSize: '15px', fontWeight: '600', color: '#1d1d1f', marginBottom: '14px' }}>
            Yükselen Sorgular
          </div>

          {rd.rising?.length > 0 ? (
            rd.rising.map((q, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '7px 0',
                borderBottom: i < rd.rising.length - 1 ? '0.5px solid #f5f5f7' : 'none',
              }}>
                <div style={{ fontSize: '13px', color: '#1d1d1f' }}>{q.query}</div>
                <div style={{
                  fontSize: '10px', fontWeight: '600', padding: '2px 7px', borderRadius: '8px',
                  background: q.value === 'Breakout' ? '#fff4e0' : '#e8f9ee',
                  color: q.value === 'Breakout' ? '#b45309' : '#1a7f37',
                }}>
                  {q.value === 'Breakout' ? '🚀 Breakout' : `+${q.value}%`}
                </div>
              </div>
            ))
          ) : (
            <div style={{ fontSize: '13px', color: '#8e8e93' }}>Yükselen sorgu bulunamadı</div>
          )}

          {rd.top?.length > 0 && (
            <>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f', margin: '14px 0 8px' }}>
                En Popüler
              </div>
              {rd.top.map((q, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '6px 0',
                  borderBottom: i < rd.top.length - 1 ? '0.5px solid #f5f5f7' : 'none',
                }}>
                  <div style={{ fontSize: '12px', color: '#3c3c43' }}>{q.query}</div>
                  <div style={{ fontSize: '11px', color: '#8e8e93' }}>{q.value}</div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Cultural Calendar */}
        <div style={card}>
          <div style={{ fontSize: '15px', fontWeight: '600', color: '#1d1d1f', marginBottom: '4px' }}>
            Kültürel Takvim
          </div>
          <div style={{ fontSize: '12px', color: '#8e8e93', marginBottom: '14px' }}>
            {market === 'Global' ? 'US' : market} pazarı için fırsat takvimi
          </div>

          {cd.best_listing_time && (
            <div style={{ background: '#e8f0fe', borderRadius: '10px', padding: '12px', marginBottom: '14px' }}>
              <div style={{ fontSize: '11px', color: '#0071e3', fontWeight: '600', marginBottom: '4px' }}>
                En İyi Listeleme Zamanı
              </div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#1d1d1f' }}>
                {cd.best_listing_time.month_name}
              </div>
              <div style={{ fontSize: '12px', color: '#3c3c43', marginTop: '2px' }}>
                {cd.best_listing_time.for_event} için
              </div>
              <div style={{ fontSize: '11px', color: '#8e8e93', marginTop: '4px' }}>
                {cd.best_listing_time.urgency}
              </div>
            </div>
          )}

          {/* Month heat map */}
          <div>
            {(cd.all_events || []).map((ev, i) => (
              <HeatRow key={i} event={ev} maxBoost={100} />
            ))}
          </div>
        </div>
      </div>

      {/* Keyword Comparison */}
      <div style={card}>
        <div style={{ fontSize: '15px', fontWeight: '600', color: '#1d1d1f', marginBottom: '4px' }}>
          Keyword Karşılaştırma
        </div>
        <div style={{ fontSize: '12px', color: '#8e8e93', marginBottom: '14px' }}>
          Maksimum 3 keyword ekle ve karşılaştır
        </div>

        {/* Chips */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '6px 12px', borderRadius: '20px',
            background: '#e8f0fe', color: '#0071e3', fontSize: '12px', fontWeight: '500',
          }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: CHART_COLORS[0] }} />
            {keyword}
          </div>

          {compareKeywords.map((kw, i) => (
            <div key={kw} style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '6px 12px', borderRadius: '20px',
              background: '#f5f5f7', color: '#1d1d1f', fontSize: '12px', fontWeight: '500',
            }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: CHART_COLORS[i + 1] }} />
              {kw}
              <span
                onClick={() => handleRemoveCompare(kw)}
                style={{ cursor: 'pointer', color: '#8e8e93', marginLeft: '2px', fontSize: '14px', lineHeight: 1 }}
              >×</span>
            </div>
          ))}
        </div>

        {/* Add keyword input */}
        {compareKeywords.length < 3 && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <input
              value={compareInput}
              onChange={e => setCompareInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddCompare()}
              placeholder="Keyword ekle (Enter ile)"
              style={{
                flex: 1, padding: '9px 14px', borderRadius: '9px',
                border: '0.5px solid #d2d2d7', fontSize: '13px',
                fontFamily: 'inherit', color: '#1d1d1f', outline: 'none', background: '#f5f5f7',
              }}
            />
            <button
              onClick={handleAddCompare}
              style={{
                padding: '9px 16px', background: '#f5f5f7', color: '#1d1d1f',
                border: '0.5px solid #d2d2d7', borderRadius: '9px', fontSize: '13px',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >Ekle</button>
          </div>
        )}

        {/* Compare button */}
        {compareKeywords.length > 0 && (
          <button
            onClick={handleCompare}
            disabled={compareLoading}
            style={{
              padding: '9px 18px',
              background: compareLoading ? '#8e8e93' : '#0071e3',
              color: 'white', border: 'none', borderRadius: '9px',
              fontSize: '13px', fontWeight: '500', cursor: compareLoading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', marginBottom: '16px',
            }}
          >
            {compareLoading ? 'Karşılaştırılıyor...' : 'Karşılaştır'}
          </button>
        )}

        {/* Compare chart */}
        {compareData ? (
          <div>
            <TrendChart
              datasets={Object.entries(compareData.data).map(([kw, d], i) => ({
                label: kw,
                monthly: d.monthly || [],
                color: CHART_COLORS[i % CHART_COLORS.length],
              }))}
            />
            {/* Legend */}
            <div style={{ display: 'flex', gap: '16px', marginTop: '10px', flexWrap: 'wrap' }}>
              {Object.entries(compareData.data).map(([kw, d], i) => (
                <div key={kw} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '24px', height: '3px', borderRadius: '2px', background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span style={{ fontSize: '11px', color: '#3c3c43' }}>{kw}</span>
                  <span style={{ fontSize: '11px', color: '#8e8e93' }}>({d.avg})</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          compareKeywords.length === 0 && (
            <div style={{
              padding: '20px', textAlign: 'center', color: '#8e8e93',
              fontSize: '13px', background: '#f5f5f7', borderRadius: '9px',
            }}>
              Karşılaştırmak istediğin keyword'leri ekle
            </div>
          )
        )}
      </div>
    </div>
  )
}
