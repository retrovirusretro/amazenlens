import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'https://amazenlens-production.up.railway.app'

const TOOLTIPS = {
  volume: {
    title: 'Arama Hacmi',
    desc: 'TunaYagci binary search algoritmasiyla hesaplanir. Amazon autocomplete\'e keyword\'u harf harf kisaltarak sorar. Ne kadar az harfle oneriliyor = o kadar yuksek hacim.',
    action: '80+ = yuksek talep, gir. 40-80 = orta, arastir. 40 alti = dusuk talep, dikkat.'
  },
  iq: {
    title: 'IQ Score',
    desc: 'Hacim / Rekabet orani. Yuksek hacim + az rakip = yuksek IQ. Helium 10 Opportunity Score mantiginin acik kaynak karsiligi.',
    action: '70+ = verimli keyword. 40-70 = kabul edilebilir. 40 alti = rakip cok, verimli degil.'
  },
  difficulty: {
    title: 'Keyword Difficulty',
    desc: 'Title density (%35) + autocomplete pozisyonu (%30) + kelime uzunlugu (%20) + oneri sayisi (%15) agirlikli formul.',
    action: '70+ = zor, long-tail hedefle. 40-70 = orta, iyi listing sart. 40 alti = kolay, hizli gir.'
  },
  buyer_intent: {
    title: 'Buyer Intent',
    desc: 'Kullanicinin satin alma niyetini oIcer. "buy, best, set, kit" = transactional. "how, what, vs, review" = informational. Digerleri mixed.',
    action: 'Transactional = yuksek donusum, PPC degeri yuksek. Informational = icerik ile besle. Mixed = listing optimize et.'
  },
  title_density: {
    title: 'Title Density',
    desc: 'Arama sonuclarindaki urun basliklarinda bu keyword\'un ne siklikta gectigini oIcer. Exact = tam esleme, Partial = kelimeler dagitik.',
    action: 'Density %50+ = cok rakip kullaniyor, zorlu. %20 alti = keyword bosluk var, firsat.'
  },
}

function Tooltip({ id, children }) {
  const [show, setShow] = useState(false)
  const tip = TOOLTIPS[id]
  if (!tip) return children
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      {children}
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        style={{ width: '15px', height: '15px', borderRadius: '50%', background: '#e2e8f0', color: '#64748b', fontSize: '10px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'help', flexShrink: 0 }}>
        ?
      </div>
      {show && (
        <div style={{ position: 'absolute', top: '100%', left: '0', zIndex: 200, marginTop: '6px', background: '#1e293b', color: 'white', borderRadius: '10px', padding: '12px 14px', width: '260px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', pointerEvents: 'none' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: '#f1f5f9' }}>{tip.title}</div>
          <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: '1.6', marginBottom: '8px' }}>{tip.desc}</div>
          <div style={{ fontSize: '11px', color: '#34d399', lineHeight: '1.5', borderTop: '0.5px solid #334155', paddingTop: '6px' }}>
            {tip.action}
          </div>
          <div style={{ position: 'absolute', top: '-5px', left: '10px', width: '10px', height: '10px', background: '#1e293b', transform: 'rotate(45deg)' }} />
        </div>
      )}
    </div>
  )
}

const INTENT_COLORS = {
  transactional: { color: '#1a7f37', bg: '#e8f9ee', label: '💰 Transactional' },
  informational: { color: '#b45309', bg: '#fff4e0', label: '📚 Informational' },
  navigational:  { color: '#0071e3', bg: '#e8f0fe', label: '🧭 Navigational' },
  mixed:         { color: '#8e8e93', bg: '#f5f5f7', label: '🔀 Mixed' },
}

const IQ_COLOR = (s) => s >= 70 ? '#34c759' : s >= 40 ? '#ff9f0a' : '#ff3b30'
const IQ_BG   = (s) => s >= 70 ? '#e8f9ee' : s >= 40 ? '#fff4e0' : '#fff1f0'

function generateInsight(result) {
  if (!result) return null
  const kw      = result.seed_keyword
  const vol     = result.markets?.US?.volume || 0
  const iq      = result.markets?.US?.iq_score || 0
  const intent  = result.buyer_intent || 'mixed'
  const diff    = result.difficulty?.score || 0
  const trend   = result.trend?.direction || 'stable'
  const seasonal = result.trend?.is_seasonal
  const totalKw = result.total_keywords || 0
  const deVol   = result.markets?.DE?.volume || 0

  let verdict = '', color = '#0071e3', bg = '#e8f0fe'
  if (vol >= 70 && iq >= 60 && diff < 50) { verdict = '🟢 Altin Firsat';    color = '#16a34a'; bg = '#f0fdf4' }
  else if (vol >= 50 && iq >= 40)          { verdict = '🟡 Iyi Potansiyel';  color = '#b45309'; bg = '#fffbeb' }
  else if (vol < 30)                        { verdict = '🔴 Dusuk Talep';     color = '#dc2626'; bg = '#fef2f2' }
  else                                      { verdict = '🟡 Orta Potansiyel'; color = '#b45309'; bg = '#fffbeb' }

  const lines = []
  if (vol >= 80)      lines.push(`"${kw}" Amazon'da cok yuksek arama hacmine sahip (${vol}/100) — bu nis aktif ve talep guclu.`)
  else if (vol >= 50) lines.push(`"${kw}" orta-yuksek arama hacmiyle (${vol}/100) aktif bir nis, talep var.`)
  else                lines.push(`"${kw}" dusuk arama hacmiyle (${vol}/100) nisin talebi sinirli olabilir.`)

  if (intent === 'transactional')      lines.push('Alici niyeti yuksek — kullanicilar bu keyword\'u satin alma amaciyla ariyor. Donusum orani yuksek olabilir.')
  else if (intent === 'informational') lines.push('Kullanicilar cogunlukla bilgi ariyor. PPC maliyetleri dusuk olabilir ama donusum sureci daha uzun.')
  else                                 lines.push('Karma niyet — hem arastirma hem satin alma amacli aramalar var.')

  if (diff >= 70)      lines.push(`Rekabet zorlu (${diff}/100) — ilk sayfaya girmek uzun sure ve butce gerektirebilir. Long-tail varyantlari hedefle.`)
  else if (diff >= 40) lines.push(`Orta rekabet (${diff}/100) — iyi bir listing ve erken giris avantajiyla rekabet edilebilir.`)
  else                 lines.push(`Dusuk rekabet (${diff}/100) — nise giris kolay gorunuyor, hizli hareket firsat olabilir.`)

  if (iq >= 70)      lines.push(`IQ Skoru ${iq} — hacim ve rekabet dengesi cok iyi, verimli bir keyword.`)
  else if (iq >= 40) lines.push(`IQ Skoru ${iq} — makul verimlilik, optimize edilmis listing ile etkili kullanilabilir.`)
  else               lines.push(`IQ Skoru ${iq} dusuk — hacim/rekabet dengesi zayif, alternatif keywordleri degerlendir.`)

  if (trend === 'rising')  lines.push(seasonal ? 'Trend yukseliyor ama mevsimlik ozellik tasiyor — dogru zamanlama kritik.' : 'Trend yukseliyor — erken giris avantaji yakalayabilirsin.')
  else if (trend === 'falling') lines.push('Trend dusuyor — pazarin doygunlasip doygunlasmadigini kontrol et.')

  if (deVol >= 50) lines.push(`Almanya pazarinda da guclu arama hacmi (${deVol}/100) — Pan-EU stratejisi icin degerli.`)
  if (totalKw >= 30) lines.push(`${totalKw} keyword bulundu — listing ve PPC kampanyasi icin zengin bir havuz olusту.`)

  return { verdict, color, bg, lines }
}

export default function KeywordPage() {
  const navigate = useNavigate()
  const [seed, setSeed]                   = useState('')
  const [market, setMarket]               = useState('US')
  const [includeDE, setIncludeDE]         = useState(true)
  const [loading, setLoading]             = useState(false)
  const [result, setResult]               = useState(null)
  const [error, setError]                 = useState('')
  const [activeTab, setActiveTab]         = useState('all')
  const [mainTab, setMainTab]             = useState('analysis')
  const [sortKey, setSortKey]             = useState('buyer_score')
  const [sortDir, setSortDir]             = useState('desc')
  const [autocomplete, setAutocomplete]   = useState([])
  const [showAllKeywords, setShowAllKeywords] = useState(false)
  const [showMethodology, setShowMethodology] = useState(false)
  const [reserveAsins, setReserveAsins]   = useState(null)
  const [reverseResult, setReverseResult] = useState(null)
  const [reverseAsin, setReverseAsin]     = useState('')
  const [reverseLoading, setReverseLoading] = useState(false)
  const [reserveLoading, setReserveLoading] = useState(false)

  const handleAutocomplete = async (val) => {
    setSeed(val)
    if (val.length < 2) { setAutocomplete([]); return }
    try {
      const res = await axios.get(`${API}/api/keywords/autocomplete?keyword=${encodeURIComponent(val)}&market=${market}`)
      setAutocomplete(res.data.suggestions || [])
    } catch { setAutocomplete([]) }
  }

  const handleReserveCheck = async () => {
    if (!seed.trim()) return
    setReserveLoading(true)
    try {
      const res = await axios.get(`${API}/api/keywords/asin-reserve?keyword=${encodeURIComponent(seed.trim())}&market=${market}`)
      setReserveAsins(res.data)
    } catch { setReserveAsins(null) }
    finally { setReserveLoading(false) }
  }

  const handleReverseAsin = async () => {
    if (!reverseAsin.trim()) return
    setReverseLoading(true)
    try {
      const res = await axios.get(`${API}/api/keywords/reverse-asin?asin=${reverseAsin.trim()}&market=${market}`)
      setReverseResult(res.data)
    } catch { setReverseResult(null) }
    finally { setReverseLoading(false) }
  }

  const handleAnalyze = async () => {
    if (!seed.trim()) return
    setLoading(true); setError(''); setResult(null); setAutocomplete([])
    setShowAllKeywords(false); setReserveAsins(null)
    try {
      const res = await axios.post(`${API}/api/keywords/analyze`, { keyword: seed.trim(), market, include_de: includeDE })
      setResult(res.data)
      setMainTab('analysis')
    } catch { setError('Analiz sirasinda hata olustu. Tekrar dene.') }
    finally { setLoading(false) }
  }

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const filteredKeywords = result?.keywords?.filter(k => {
    if (activeTab === 'us')            return k.market === 'US'
    if (activeTab === 'de')            return k.market === 'DE'
    if (activeTab === 'ai')            return k.source === 'ai'
    if (activeTab === 'transactional') return k.intent === 'transactional'
    return true
  }) || []

  const sortedKeywords   = [...filteredKeywords].sort((a, b) => {
    const aVal = a[sortKey] || 0, bVal = b[sortKey] || 0
    return sortDir === 'desc' ? bVal - aVal : aVal - bVal
  })
  const displayedKeywords = showAllKeywords ? sortedKeywords : sortedKeywords.slice(0, 5)
  const insight           = generateInsight(result)

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", maxWidth: '1100px' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* ── Header ── */}
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '19px', fontWeight: '600', color: '#1d1d1f', letterSpacing: '-0.3px' }}>🔑 Keyword Scanner</div>
          <div style={{ fontSize: '13px', color: '#8e8e93', marginTop: '3px' }}>Amazon autocomplete + Binary Search hacim + Claude AI</div>
        </div>
        <button onClick={() => setShowMethodology(!showMethodology)}
          style={{ fontSize: '11px', padding: '6px 12px', borderRadius: '8px', border: '0.5px solid #d2d2d7', background: showMethodology ? '#1d1d1f' : 'white', color: showMethodology ? 'white' : '#64748b', cursor: 'pointer', fontFamily: 'inherit' }}>
          📖 Nasil Hesapliyoruz?
        </button>
      </div>

      {/* ── Metodoloji ── */}
      {showMethodology && (
        <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '16px 20px', marginBottom: '14px', animation: 'fadeIn 0.2s ease' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f', marginBottom: '12px' }}>📐 Metodoloji</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {[
              { icon: '📊', title: 'Arama Hacmi (Binary Search)', desc: 'TunaYagci algoritmasi: keyword\'u harf harf kisaltarak Amazon autocomplete\'e sorar. Ne kadar az harfle oneriliyor — o kadar yuksek hacim. 0-100 arasi skor.', color: '#0071e3' },
              { icon: '⚡', title: 'IQ Score',           desc: 'Hacim / Rekabet orani. Yuksek hacim + dusuk rakip = yuksek IQ. Helium 10 Opportunity Score acik kaynak karsiligi.',                                 color: '#34c759' },
              { icon: '💰', title: 'Buyer Intent',       desc: '"buy, best, set, kit, for" gibi kelimeler transactional. "how, what, vs" informational. NLP + kural bazli hibrit.',                                  color: '#ff9f0a' },
              { icon: '🎯', title: 'Keyword Difficulty', desc: 'Title density %35 + autocomplete pozisyonu %30 + kelime uzunlugu %20 + oneri sayisi %15 agirlikli formul.',                                           color: '#af52de' },
            ].map((item, i) => (
              <div key={i} style={{ background: '#f8fafc', borderRadius: '10px', padding: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: item.color, marginBottom: '4px' }}>{item.icon} {item.title}</div>
                <div style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.6' }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Ana Sekmeler ── */}
      <div style={{ display: 'flex', gap: '4px', background: 'white', borderRadius: '10px', padding: '4px', border: '0.5px solid #e5e5ea', marginBottom: '14px' }}>
        {[{ key: 'analysis', label: '🔑 Keyword Analizi' }, { key: 'reverse', label: '🔄 Reverse ASIN' }].map(t => (
          <button key={t.key} onClick={() => setMainTab(t.key)}
            style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit', background: mainTab === t.key ? '#1d1d1f' : 'transparent', color: mainTab === t.key ? 'white' : '#8e8e93' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════
          REVERSE ASIN SEKMESI
      ══════════════════════════════════════════════ */}
      {mainTab === 'reverse' && (
        <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '20px', animation: 'fadeIn 0.2s ease' }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#1d1d1f', marginBottom: '4px' }}>🔄 Reverse ASIN — ASIN → Keyword Listesi</div>
          <div style={{ fontSize: '12px', color: '#8e8e93', marginBottom: '16px' }}>Rakibinin ASIN'ini gir, hangi keyword'lerde rank aldigini bul</div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input value={reverseAsin} onChange={e => setReverseAsin(e.target.value)}
              placeholder="ASIN gir — orn: B07QK955LS"
              onKeyDown={e => e.key === 'Enter' && handleReverseAsin()}
              style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '0.5px solid #d2d2d7', fontSize: '13px', fontFamily: 'inherit', outline: 'none', background: '#f5f5f7' }} />
            <div style={{ display: 'flex', gap: '4px' }}>
              {[{ v: 'US', f: '🇺🇸' }, { v: 'DE', f: '🇩🇪' }, { v: 'TR', f: '🇹🇷' }].map(m => (
                <button key={m.v} onClick={() => setMarket(m.v)}
                  style={{ padding: '10px 12px', border: 'none', borderRadius: '7px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', background: market === m.v ? '#1d1d1f' : '#f5f5f7', color: market === m.v ? 'white' : '#3c3c43' }}>
                  {m.f}
                </button>
              ))}
            </div>
            <button onClick={handleReverseAsin} disabled={reverseLoading || !reverseAsin.trim()}
              style={{ padding: '10px 20px', background: '#1d1d1f', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {reverseLoading ? <div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> : '🔍'}
              {reverseLoading ? 'Analiz ediliyor...' : 'Analiz Et'}
            </button>
          </div>
          {reverseResult && (
            <div style={{ animation: 'fadeIn 0.2s ease' }}>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px', padding: '8px 12px', background: '#f8fafc', borderRadius: '8px' }}>
                <strong>{reverseResult.product_title}</strong> — {reverseResult.total_keywords} keyword bulundu
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '6px' }}>
                {reverseResult.keywords?.map((kw, i) => (
                  <div key={i} onClick={() => { setSeed(kw.keyword); setMainTab('analysis'); setReverseResult(null) }}
                    style={{ padding: '10px 12px', borderRadius: '8px', background: '#f8fafc', border: '0.5px solid #e2e8f0', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#e8f0fe'}
                    onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}>
                    <span style={{ fontSize: '12px', color: '#1d1d1f', fontWeight: '500' }}>{kw.keyword}</span>
                    <span style={{ fontSize: '11px', color: IQ_COLOR(kw.volume), fontWeight: '700', background: IQ_BG(kw.volume), padding: '2px 6px', borderRadius: '4px' }}>{kw.volume}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '10px', fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>Keyword tiklayinca analiz sekmesine gecer</div>
            </div>
          )}
          {!reverseResult && !reverseLoading && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
              <div style={{ fontSize: '36px', marginBottom: '10px' }}>🔄</div>
              <div style={{ fontSize: '13px' }}>ASIN gir → rakibinin rank aldigi keywordleri kesifet</div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════
          ANALiZ SEKMESi
      ══════════════════════════════════════════════ */}
      {mainTab === 'analysis' && (
        <>
          {/* Arama Karti */}
          <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '20px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: '14px' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <div style={{ fontSize: '11px', color: '#8e8e93', marginBottom: '5px', fontWeight: '500' }}>Seed Keyword</div>
                <input type="text" value={seed}
                  onChange={e => handleAutocomplete(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { handleAnalyze(); setAutocomplete([]) } if (e.key === 'Escape') setAutocomplete([]) }}
                  placeholder="orn: yoga mat, silikon spatula, led lamp..."
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '0.5px solid #d2d2d7', fontSize: '13px', fontFamily: 'inherit', color: '#1d1d1f', outline: 'none', background: '#f5f5f7', boxSizing: 'border-box' }} />
                {autocomplete.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '0.5px solid #d2d2d7', borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', zIndex: 100, marginTop: '4px' }}>
                    {autocomplete.map((s, i) => (
                      <div key={i} onClick={() => { setSeed(s); setAutocomplete([]) }}
                        style={{ padding: '8px 12px', fontSize: '13px', color: '#1d1d1f', cursor: 'pointer', borderBottom: i < autocomplete.length - 1 ? '0.5px solid #f5f5f7' : 'none' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f5f5f7'}
                        onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                        🔍 {s}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#8e8e93', marginBottom: '5px', fontWeight: '500' }}>Pazar</div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {[{ v: 'US', f: '🇺🇸' }, { v: 'DE', f: '🇩🇪' }, { v: 'TR', f: '🇹🇷' }].map(m => (
                    <button key={m.v} onClick={() => setMarket(m.v)}
                      style={{ padding: '8px 12px', border: 'none', borderRadius: '7px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', background: market === m.v ? '#1d1d1f' : '#f5f5f7', color: market === m.v ? 'white' : '#3c3c43' }}>
                      {m.f} {m.v}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#8e8e93', marginBottom: '5px', fontWeight: '500' }}>Cross-Market</div>
                <button onClick={() => setIncludeDE(!includeDE)}
                  style={{ padding: '8px 14px', border: 'none', borderRadius: '7px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', background: includeDE ? '#e8f0fe' : '#f5f5f7', color: includeDE ? '#0071e3' : '#8e8e93', fontWeight: includeDE ? '600' : '400' }}>
                  🇩🇪 DE {includeDE ? '✓' : '○'}
                </button>
              </div>
              <button onClick={handleAnalyze} disabled={loading || !seed.trim()}
                style={{ background: seed.trim() ? '#0071e3' : '#d2d2d7', color: 'white', border: 'none', padding: '9px 24px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: seed.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit', height: '38px', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                {loading ? <div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> : '🔑'}
                {loading ? 'Analiz ediliyor...' : 'Analiz Et'}
              </button>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: '#aeaeb2' }}>Ornek:</span>
              {['yoga mat', 'silikon spatula', 'led desk lamp', 'resistance bands', 'bamboo cutting board'].map(ex => (
                <div key={ex} onClick={() => setSeed(ex)}
                  style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', border: '0.5px solid #d2d2d7', background: 'white', color: '#0071e3', cursor: 'pointer' }}>
                  {ex}
                </div>
              ))}
            </div>
          </div>

          {error && <div style={{ padding: '12px 16px', background: '#fff1f0', border: '0.5px solid #ffd0ce', borderRadius: '8px', fontSize: '13px', color: '#c00', marginBottom: '14px' }}>{error}</div>}

          {loading && (
            <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '60px', textAlign: 'center' }}>
              <div style={{ width: '32px', height: '32px', border: '2px solid #f0f0f5', borderTop: '2px solid #0071e3', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
              <div style={{ fontSize: '14px', color: '#1d1d1f', fontWeight: '500', marginBottom: '4px' }}>Keyword analizi yapiliyor...</div>
              <div style={{ fontSize: '12px', color: '#8e8e93' }}>Binary Search + Amazon autocomplete + Claude AI</div>
            </div>
          )}

          {result && (
            <div style={{ animation: 'fadeIn 0.3s ease', display: 'flex', flexDirection: 'column', gap: '12px' }}>

              {/* AI Ozet Analiz */}
              {insight && (
                <div style={{ background: insight.bg, borderRadius: '12px', border: `0.5px solid ${insight.color}30`, padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '16px', fontWeight: '700', color: insight.color }}>{insight.verdict}</span>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>— "{result.seed_keyword}" icin tepeden bakis</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {insight.lines.map((line, i) => (
                      <div key={i} style={{ display: 'flex', gap: '8px', fontSize: '13px', color: '#374151', lineHeight: '1.6' }}>
                        <span style={{ color: insight.color, flexShrink: 0, marginTop: '2px' }}>→</span>
                        <span>{line}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ozet Metrikler */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                {[
                  { label: 'US Arama Hacmi',    tooltip: 'volume',     value: result.markets?.US?.volume || 0,      sub: '/100 — Binary Search', color: '#0071e3', bg: '#e8f0fe' },
                  { label: 'US IQ Score',        tooltip: 'iq',         value: result.markets?.US?.iq_score || 0,    sub: 'Hacim/Rekabet',        color: IQ_COLOR(result.markets?.US?.iq_score || 0), bg: IQ_BG(result.markets?.US?.iq_score || 0) },
                  { label: 'Keyword Difficulty', tooltip: 'difficulty', value: result.difficulty?.score || 0,        sub: result.difficulty?.level_tr || '', color: result.difficulty?.score >= 70 ? '#dc2626' : result.difficulty?.score >= 40 ? '#b45309' : '#16a34a', bg: result.difficulty?.score >= 70 ? '#fee2e2' : result.difficulty?.score >= 40 ? '#fff4e0' : '#f0fdf4' },
                  { label: 'Toplam Keyword',     tooltip: null,         value: result.total_keywords || 0,           sub: 'US + DE + AI',         color: '#af52de', bg: '#f3e8ff' },
                ].map(m => (
                  <div key={m.label} style={{ background: m.bg, borderRadius: '11px', padding: '14px 16px' }}>
                    <div style={{ fontSize: '11px', color: '#8e8e93', marginBottom: '4px' }}>
                      {m.tooltip ? <Tooltip id={m.tooltip}>{m.label}</Tooltip> : m.label}
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: m.color, letterSpacing: '-0.5px' }}>{m.value}</div>
                    <div style={{ fontSize: '11px', color: '#8e8e93', marginTop: '2px' }}>{m.sub}</div>
                  </div>
                ))}
              </div>

              {/* Buyer Intent + Trend */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '16px 20px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f', marginBottom: '12px' }}>
                    <Tooltip id="buyer_intent">🎯 Buyer Intent</Tooltip>
                  </div>
                  {(() => {
                    const intent = result.buyer_intent || 'mixed'
                    const s = INTENT_COLORS[intent] || INTENT_COLORS.mixed
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                          {intent === 'transactional' ? '💰' : intent === 'informational' ? '📚' : '🔀'}
                        </div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '600', color: s.color }}>{s.label}</div>
                          <div style={{ fontSize: '11px', color: '#8e8e93' }}>Buyer Score: <strong style={{ color: s.color }}>{result.buyer_score}/100</strong></div>
                        </div>
                      </div>
                    )
                  })()}
                  <div style={{ height: '5px', background: '#f0f0f5', borderRadius: '3px' }}>
                    <div style={{ height: '100%', borderRadius: '3px', background: '#0071e3', width: `${result.buyer_score || 0}%` }} />
                  </div>
                </div>

                {result.trend?.monthly?.length > 0 ? (
                  <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '16px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f' }}>📈 Google Trends</div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px' }}>{result.trend.direction_tr}</span>
                        {result.trend.is_seasonal && <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '8px', background: '#fff4e0', color: '#b45309' }}>🌊 Mevsimlik</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '50px' }}>
                      {result.trend.monthly.map((val, i) => {
                        const max = Math.max(...result.trend.monthly)
                        const height = max > 0 ? (val / max) * 50 : 0
                        return <div key={i} style={{ flex: 1, background: i >= result.trend.monthly.length - 3 ? '#0071e3' : '#d2d2d7', borderRadius: '2px 2px 0 0', height: `${height}px`, minHeight: val > 0 ? '2px' : '0' }} />
                      })}
                    </div>
                    {result.trend.rising_queries?.length > 0 && (
                      <div style={{ marginTop: '8px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {result.trend.rising_queries.slice(0, 3).map((q, i) => (
                          <span key={i} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', background: '#fff4e0', color: '#b45309' }}>↑ {q.query}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '16px 20px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f', marginBottom: '10px' }}>
                      <Tooltip id="title_density">📊 Title Density</Tooltip>
                    </div>
                    {result.title_density && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                        {[
                          { label: 'Exact',   value: result.title_density.exact,                color: '#34c759' },
                          { label: 'Partial', value: result.title_density.partial,              color: '#ff9f0a' },
                          { label: 'Density', value: `${result.title_density.density_pct}%`,    color: '#0071e3' },
                        ].map(item => (
                          <div key={item.label} style={{ background: '#f5f5f7', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                            <div style={{ fontSize: '18px', fontWeight: '700', color: item.color }}>{item.value}</div>
                            <div style={{ fontSize: '10px', color: '#8e8e93' }}>{item.label}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Keyword Listesi */}
              <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px', borderBottom: '0.5px solid #f5f5f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f' }}>
                    🔑 Keyword Listesi <span style={{ fontSize: '12px', color: '#8e8e93', fontWeight: '400' }}>({sortedKeywords.length} keyword)</span>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {[{ key: 'all', label: 'Tumu' }, { key: 'us', label: '🇺🇸 US' }, { key: 'de', label: '🇩🇪 DE' }, { key: 'ai', label: '🤖 AI' }, { key: 'transactional', label: '💰 Buyer' }].map(tab => (
                      <div key={tab.key} onClick={() => { setActiveTab(tab.key); setShowAllKeywords(false) }}
                        style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '20px', cursor: 'pointer', border: `0.5px solid ${activeTab === tab.key ? '#1d1d1f' : '#d2d2d7'}`, background: activeTab === tab.key ? '#1d1d1f' : 'white', color: activeTab === tab.key ? 'white' : '#3c3c43' }}>
                        {tab.label}
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 70px 80px 100px 80px', gap: '8px', padding: '8px 16px', background: '#f9f9f9', borderBottom: '0.5px solid #f0f0f5' }}>
                  {[{ label: 'Keyword', key: null }, { label: 'Hacim', key: 'volume' }, { label: 'IQ', key: 'iq_score' }, { label: 'Buyer', key: 'buyer_score' }, { label: 'Intent', key: null }, { label: 'Kaynak', key: null }].map(col => (
                    <div key={col.label} onClick={() => col.key && handleSort(col.key)}
                      style={{ fontSize: '10px', color: col.key && sortKey === col.key ? '#0071e3' : '#aeaeb2', textTransform: 'uppercase', letterSpacing: '0.4px', cursor: col.key ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: '3px', userSelect: 'none' }}>
                      {col.label} {col.key && <span style={{ fontSize: '9px' }}>{sortKey === col.key ? (sortDir === 'desc' ? '↓' : '↑') : '↕'}</span>}
                    </div>
                  ))}
                </div>
                <div>
                  {displayedKeywords.map((kw, i) => {
                    const is = INTENT_COLORS[kw.intent] || INTENT_COLORS.mixed
                    return (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 70px 80px 100px 80px', gap: '8px', padding: '10px 16px', borderBottom: '0.5px solid #f5f5f7', alignItems: 'center' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                        onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '500', color: '#1d1d1f' }}>{kw.keyword}</div>
                          {kw.note && <div style={{ fontSize: '10px', color: '#8e8e93' }}>{kw.note}</div>}
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f', textAlign: 'right' }}>{kw.volume}</div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '12px', fontWeight: '700', color: IQ_COLOR(kw.iq_score), background: IQ_BG(kw.iq_score), padding: '2px 8px', borderRadius: '6px' }}>{kw.iq_score}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ height: '4px', background: '#f0f0f5', borderRadius: '2px' }}>
                            <div style={{ height: '100%', borderRadius: '2px', background: '#0071e3', width: `${kw.buyer_score || 0}%` }} />
                          </div>
                          <div style={{ fontSize: '10px', color: '#8e8e93', marginTop: '2px' }}>{kw.buyer_score}</div>
                        </div>
                        <div><span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', background: is.bg, color: is.color, fontWeight: '500', whiteSpace: 'nowrap' }}>{is.label}</span></div>
                        <div><span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', background: kw.source === 'ai' ? '#f3e8ff' : kw.market === 'DE' ? '#e8f0fe' : '#f5f5f7', color: kw.source === 'ai' ? '#af52de' : kw.market === 'DE' ? '#0071e3' : '#8e8e93', fontWeight: '500' }}>{kw.source === 'ai' ? '🤖 AI' : kw.market === 'DE' ? '🇩🇪 DE' : '🇺🇸 US'}</span></div>
                      </div>
                    )
                  })}
                </div>
                {sortedKeywords.length > 5 && (
                  <div style={{ padding: '12px 16px', borderTop: '0.5px solid #f5f5f7', textAlign: 'center' }}>
                    <button onClick={() => setShowAllKeywords(!showAllKeywords)}
                      style={{ fontSize: '12px', padding: '8px 20px', borderRadius: '8px', border: '0.5px solid #d2d2d7', background: 'white', color: '#0071e3', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '500' }}>
                      {showAllKeywords ? `▲ Daha az goster` : `▼ Tumunu Gor (${sortedKeywords.length} keyword)`}
                    </button>
                  </div>
                )}
              </div>

              {/* Listing Ipuclari */}
              {result.listing_tips && (result.listing_tips.title_example || result.listing_tips.bullets) && (
                <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '16px 20px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f', marginBottom: '14px' }}>💡 Kullanima Hazir Listing Onerileri</div>
                  {result.listing_tips.title_example && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: '#0071e3', marginBottom: '6px' }}>📌 Hazir Amazon Basligi</div>
                      <div style={{ background: '#e8f0fe', borderRadius: '8px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                        <div style={{ fontSize: '13px', fontWeight: '500', color: '#1d1d1f', lineHeight: '1.6', flex: 1 }}>{result.listing_tips.title_example}</div>
                        <button onClick={() => navigator.clipboard.writeText(result.listing_tips.title_example)}
                          style={{ fontSize: '11px', padding: '4px 10px', border: '0.5px solid #0071e3', borderRadius: '6px', background: 'white', color: '#0071e3', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>📋 Kopyala</button>
                      </div>
                    </div>
                  )}
                  {result.listing_tips.bullets?.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: '#34c759', marginBottom: '6px' }}>• Bullet Points</div>
                      <div style={{ background: '#e8f9ee', borderRadius: '8px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {result.listing_tips.bullets.map((bullet, i) => (
                          <div key={i} style={{ fontSize: '12px', color: '#1d1d1f', lineHeight: '1.5', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                            <span style={{ flex: 1 }}>{bullet}</span>
                            <button onClick={() => navigator.clipboard.writeText(bullet)}
                              style={{ fontSize: '10px', padding: '2px 8px', border: '0.5px solid #34c759', borderRadius: '5px', background: 'white', color: '#34c759', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>📋</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {result.listing_tips.backend && (
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: '#ff9f0a', marginBottom: '6px' }}>🔍 Backend Search Terms</div>
                      <div style={{ background: '#fff4e0', borderRadius: '8px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                        <div style={{ fontSize: '12px', color: '#3c3c43', lineHeight: '1.6', flex: 1 }}>{result.listing_tips.backend}</div>
                        <button onClick={() => navigator.clipboard.writeText(result.listing_tips.backend)}
                          style={{ fontSize: '11px', padding: '4px 10px', border: '0.5px solid #ff9f0a', borderRadius: '6px', background: 'white', color: '#ff9f0a', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>📋 Kopyala</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Cross-Market + ASIN Reserve */}
              <div style={{ display: 'grid', gridTemplateColumns: result.cross_market?.de_equivalent ? '1fr 1fr' : '1fr', gap: '12px' }}>
                {result.cross_market?.de_equivalent && (
                  <div style={{ background: 'linear-gradient(135deg,#1a1040,#0f1e35)', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ fontSize: '28px' }}>🇩🇪</div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Cross-Market — Amazon.de</div>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: 'white' }}>{result.cross_market.de_equivalent}</div>
                      {result.cross_market.de_notes && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '3px' }}>{result.cross_market.de_notes}</div>}
                    </div>
                  </div>
                )}
                <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f' }}>🎯 ASIN Rezerv Checker</div>
                    <button onClick={handleReserveCheck} disabled={reserveLoading}
                      style={{ padding: '5px 12px', background: '#0071e3', color: 'white', border: 'none', borderRadius: '7px', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>
                      {reserveLoading ? '⏳' : '🔍 Rakip ASINleri Bul'}
                    </button>
                  </div>
                  <div style={{ fontSize: '11px', color: '#8e8e93', marginBottom: '8px' }}>"{result.seed_keyword}" rankindaki rakip urunler</div>
                  {reserveAsins?.ranking_asins?.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {reserveAsins.ranking_asins.slice(0, 5).map((item, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', background: '#f8fafc', borderRadius: '6px' }}>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: '#8e8e93', width: '18px' }}>#{item.rank}</span>
                          <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#1d1d1f', flex: 1 }}>{item.asin}</span>
                          <button onClick={() => navigate(`/app/niche?asin=${item.asin}`)}
                            style={{ padding: '3px 8px', background: '#e8f0fe', color: '#0071e3', border: 'none', borderRadius: '5px', fontSize: '10px', cursor: 'pointer' }}>Nis →</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Negatif Keywordler */}
              {result.negative_keywords?.length > 0 && (
                <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '16px 20px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f', marginBottom: '10px' }}>🚫 Negatif Keywordler</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {result.negative_keywords.map((nk, i) => (
                      <span key={i} style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '20px', background: '#fff1f0', color: '#c00', border: '0.5px solid #ffd0ce' }}>-{nk}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Sonraki Adim */}
              <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f' }}>🚀 Sonraki Adim</div>
                  <div style={{ fontSize: '12px', color: '#8e8e93', marginTop: '2px' }}>Bu keyword icin urun arastirmasi yap</div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => navigate(`/app/search?q=${encodeURIComponent(seed)}`)}
                    style={{ fontSize: '12px', padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#0071e3', color: 'white', cursor: 'pointer', fontFamily: 'inherit' }}>Urun Ara →</button>
                  <button onClick={() => navigate(`/app/niche?keyword=${encodeURIComponent(seed)}`)}
                    style={{ fontSize: '12px', padding: '8px 16px', borderRadius: '8px', border: '0.5px solid #d2d2d7', background: 'white', color: '#1d1d1f', cursor: 'pointer', fontFamily: 'inherit' }}>Nis Skoru →</button>
                </div>
              </div>

            </div>
          )}

          {!result && !loading && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#8e8e93' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔑</div>
              <div style={{ fontSize: '15px', fontWeight: '500', color: '#1d1d1f', marginBottom: '6px' }}>Keyword Scanner</div>
              <div style={{ fontSize: '13px', maxWidth: '400px', margin: '0 auto', lineHeight: '1.7' }}>
                Seed keyword gir — Binary Search hacim + Claude AI — 50+ keyword, AI ozet analiz, listing onerileri
              </div>
              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
                {[{ icon: '📊', title: 'Binary Search', desc: 'Gercek hacim skoru' }, { icon: '🤖', title: 'AI Ozet', desc: 'Tepeden bakis analizi' }, { icon: '💰', title: 'Buyer Intent', desc: 'Satin alma niyeti' }, { icon: '🎯', title: 'Difficulty', desc: 'Rekabet zorlugu' }].map(item => (
                  <div key={item.title} style={{ background: 'white', borderRadius: '10px', border: '0.5px solid #e5e5ea', padding: '14px 18px', textAlign: 'center', minWidth: '120px' }}>
                    <div style={{ fontSize: '22px', marginBottom: '6px' }}>{item.icon}</div>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#1d1d1f' }}>{item.title}</div>
                    <div style={{ fontSize: '10px', color: '#8e8e93', marginTop: '2px' }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
