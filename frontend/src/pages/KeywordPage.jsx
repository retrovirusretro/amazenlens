import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

const INTENT_COLORS = {
  transactional: { color: '#1a7f37', bg: '#e8f9ee', label: '💰 Transactional' },
  informational:  { color: '#b45309', bg: '#fff4e0', label: '📚 Informational' },
  navigational:   { color: '#0071e3', bg: '#e8f0fe', label: '🧭 Navigational' },
  mixed:          { color: '#8e8e93', bg: '#f5f5f7', label: '🔀 Mixed' },
}

const IQ_COLOR = (s) => s >= 70 ? '#34c759' : s >= 40 ? '#ff9f0a' : '#ff3b30'
const IQ_BG = (s) => s >= 70 ? '#e8f9ee' : s >= 40 ? '#fff4e0' : '#fff1f0'

export default function KeywordPage() {
  const navigate = useNavigate()
  const [seed, setSeed] = useState('')
  const [market, setMarket] = useState('US')
  const [includeDE, setIncludeDE] = useState(true)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [sortKey, setSortKey] = useState('buyer_score')
  const [sortDir, setSortDir] = useState('desc')
  const [autocomplete, setAutocomplete] = useState([])

  const handleAutocomplete = async (val) => {
    setSeed(val)
    if (val.length < 2) { setAutocomplete([]); return }
    try {
      const res = await axios.get(`${API}/api/keywords/autocomplete?keyword=${encodeURIComponent(val)}&market=${market}`)
      setAutocomplete(res.data.suggestions || [])
    } catch { setAutocomplete([]) }
  }

  const handleAnalyze = async () => {
    if (!seed.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    setAutocomplete([])
    try {
      const res = await axios.post(`${API}/api/keywords/analyze`, {
        keyword: seed.trim(),
        market,
        include_de: includeDE,
      })
      setResult(res.data)
    } catch (err) {
      setError('Analiz sırasında hata oluştu. Tekrar dene.')
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const filteredKeywords = result?.keywords?.filter(k => {
    if (activeTab === 'us') return k.market === 'US'
    if (activeTab === 'de') return k.market === 'DE'
    if (activeTab === 'ai') return k.source === 'ai'
    if (activeTab === 'transactional') return k.intent === 'transactional'
    return true
  }) || []

  const sortedKeywords = [...filteredKeywords].sort((a, b) => {
    const aVal = a[sortKey] || 0
    const bVal = b[sortKey] || 0
    return sortDir === 'desc' ? bVal - aVal : aVal - bVal
  })

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", maxWidth: '1100px' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '19px', fontWeight: '600', color: '#1d1d1f', letterSpacing: '-0.3px' }}>
          🔑 Keyword Scanner
        </div>
        <div style={{ fontSize: '13px', color: '#8e8e93', marginTop: '3px' }}>
          Amazon autocomplete + Claude AI ile keyword araştırması — US & DE pazarları
        </div>
      </div>

      {/* Arama Kartı */}
      <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '20px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: '14px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <div style={{ fontSize: '11px', color: '#8e8e93', marginBottom: '5px', fontWeight: '500' }}>Seed Keyword</div>
            <input
              type="text"
              value={seed}
              onChange={e => handleAutocomplete(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { handleAnalyze(); setAutocomplete([]) } if (e.key === 'Escape') setAutocomplete([]) }}
              placeholder="örn: yoga mat, silikon spatula, led lamp..."
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '0.5px solid #d2d2d7', fontSize: '13px', fontFamily: 'inherit', color: '#1d1d1f', outline: 'none', background: '#f5f5f7', boxSizing: 'border-box' }}
            />
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

          {/* Market seç */}
          <div>
            <div style={{ fontSize: '11px', color: '#8e8e93', marginBottom: '5px', fontWeight: '500' }}>Pazar</div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[{ v: 'US', f: '🇺🇸' }, { v: 'DE', f: '🇩🇪' }].map(m => (
                <button key={m.v} onClick={() => setMarket(m.v)}
                  style={{ padding: '8px 12px', border: 'none', borderRadius: '7px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', background: market === m.v ? '#1d1d1f' : '#f5f5f7', color: market === m.v ? 'white' : '#3c3c43' }}>
                  {m.f} {m.v}
                </button>
              ))}
            </div>
          </div>

          {/* DE dahil toggle */}
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

        {/* Örnek keywordler */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: '#aeaeb2' }}>Örnek:</span>
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
          <div style={{ fontSize: '14px', color: '#1d1d1f', fontWeight: '500', marginBottom: '4px' }}>Keyword analizi yapılıyor...</div>
          <div style={{ fontSize: '12px', color: '#8e8e93' }}>Amazon autocomplete + Claude AI çalışıyor</div>
        </div>
      )}

      {result && (
        <div style={{ animation: 'fadeIn 0.3s ease', display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* Özet Metrikler */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            {[
              { label: 'US Arama Hacmi', value: result.markets?.US?.volume || 0, sub: '/100 tahmini', color: '#0071e3', bg: '#e8f0fe' },
              { label: 'US IQ Score', value: result.markets?.US?.iq_score || 0, sub: 'Hacim/Rekabet', color: IQ_COLOR(result.markets?.US?.iq_score || 0), bg: IQ_BG(result.markets?.US?.iq_score || 0) },
              { label: 'DE IQ Score', value: result.markets?.DE?.iq_score || 0, sub: 'Cross-market', color: IQ_COLOR(result.markets?.DE?.iq_score || 0), bg: IQ_BG(result.markets?.DE?.iq_score || 0) },
              { label: 'Toplam Keyword', value: result.total_keywords || 0, sub: 'US + DE + AI', color: '#af52de', bg: '#f3e8ff' },
            ].map(m => (
              <div key={m.label} style={{ background: m.bg, borderRadius: '11px', padding: '14px 16px' }}>
                <div style={{ fontSize: '11px', color: '#8e8e93', marginBottom: '4px' }}>{m.label}</div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: m.color, letterSpacing: '-0.5px' }}>{m.value}</div>
                <div style={{ fontSize: '11px', color: '#8e8e93', marginTop: '2px' }}>{m.sub}</div>
              </div>
            ))}
          </div>

          {/* Buyer Intent + Title Density */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '16px 20px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f', marginBottom: '12px' }}>🎯 Buyer Intent Analizi</div>
              {(() => {
                const intent = result.buyer_intent || 'mixed'
                const style = INTENT_COLORS[intent] || INTENT_COLORS.mixed
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: style.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
                      {intent === 'transactional' ? '💰' : intent === 'informational' ? '📚' : '🔀'}
                    </div>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: '600', color: style.color }}>{style.label}</div>
                      <div style={{ fontSize: '12px', color: '#8e8e93', marginTop: '2px' }}>
                        Buyer Score: <span style={{ fontWeight: '600', color: style.color }}>{result.buyer_score}/100</span>
                      </div>
                    </div>
                  </div>
                )
              })()}
              <div style={{ height: '6px', background: '#f0f0f5', borderRadius: '3px' }}>
                <div style={{ height: '100%', borderRadius: '3px', background: '#0071e3', width: `${result.buyer_score || 0}%` }} />
              </div>
            </div>

            <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '16px 20px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f', marginBottom: '12px' }}>📊 Title Density</div>
              {result.title_density && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {[
                    { label: 'Exact Match', value: result.title_density.exact, color: '#34c759' },
                    { label: 'Partial Match', value: result.title_density.partial, color: '#ff9f0a' },
                    { label: 'Density', value: `${result.title_density.density_pct}%`, color: '#0071e3' },
                  ].map(item => (
                    <div key={item.label} style={{ background: '#f5f5f7', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                      <div style={{ fontSize: '20px', fontWeight: '700', color: item.color }}>{item.value}</div>
                      <div style={{ fontSize: '10px', color: '#8e8e93', marginTop: '2px' }}>{item.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Listing İpuçları */}
          {result.listing_tips && (result.listing_tips.title_example || result.listing_tips.bullets) && (
            <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '16px 20px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f', marginBottom: '14px' }}>💡 Kullanıma Hazır Listing Önerileri</div>

              {result.listing_tips.title_example && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#0071e3', marginBottom: '6px' }}>📌 Hazır Amazon Başlığı — Kopyala/Yapıştır</div>
                  <div style={{ background: '#e8f0fe', borderRadius: '8px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: '#1d1d1f', lineHeight: '1.6', flex: 1 }}>
                      {result.listing_tips.title_example}
                    </div>
                    <button onClick={() => navigator.clipboard.writeText(result.listing_tips.title_example)}
                      style={{ fontSize: '11px', padding: '4px 10px', border: '0.5px solid #0071e3', borderRadius: '6px', background: 'white', color: '#0071e3', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                      📋 Kopyala
                    </button>
                  </div>
                </div>
              )}

              {result.listing_tips.bullets && Array.isArray(result.listing_tips.bullets) && result.listing_tips.bullets.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#34c759', marginBottom: '6px' }}>• Hazır Bullet Points</div>
                  <div style={{ background: '#e8f9ee', borderRadius: '8px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {result.listing_tips.bullets.map((bullet, i) => (
                      <div key={i} style={{ fontSize: '12px', color: '#1d1d1f', lineHeight: '1.5', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <span style={{ flex: 1 }}>{bullet}</span>
                        <button onClick={() => navigator.clipboard.writeText(bullet)}
                          style={{ fontSize: '10px', padding: '2px 8px', border: '0.5px solid #34c759', borderRadius: '5px', background: 'white', color: '#34c759', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                          📋
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.listing_tips.backend && (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#ff9f0a', marginBottom: '6px' }}>🔍 Backend Search Terms</div>
                  <div style={{ background: '#fff4e0', borderRadius: '8px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ fontSize: '12px', color: '#3c3c43', lineHeight: '1.6', flex: 1 }}>{result.listing_tips.backend}</div>
                    <button onClick={() => navigator.clipboard.writeText(result.listing_tips.backend)}
                      style={{ fontSize: '11px', padding: '4px 10px', border: '0.5px solid #ff9f0a', borderRadius: '6px', background: 'white', color: '#ff9f0a', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                      📋 Kopyala
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Cross-Market */}
          {result.cross_market?.de_equivalent && (
            <div style={{ background: 'linear-gradient(135deg, #1a1040, #0f1e35)', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ fontSize: '32px' }}>🇩🇪</div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>Cross-Market — Amazon.de Eşdeğeri</div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: 'white' }}>{result.cross_market.de_equivalent}</div>
                {result.cross_market.de_notes && (
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>{result.cross_market.de_notes}</div>
                )}
              </div>
            </div>
          )}

          {/* Keyword Tablosu */}
          <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '0.5px solid #f5f5f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f' }}>
                🔑 Keyword Listesi <span style={{ fontSize: '12px', color: '#8e8e93', fontWeight: '400' }}>({sortedKeywords.length} keyword)</span>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[
                  { key: 'all', label: 'Tümü' },
                  { key: 'us', label: '🇺🇸 US' },
                  { key: 'de', label: '🇩🇪 DE' },
                  { key: 'ai', label: '🤖 AI' },
                  { key: 'transactional', label: '💰 Buyer' },
                ].map(tab => (
                  <div key={tab.key} onClick={() => setActiveTab(tab.key)}
                    style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '20px', cursor: 'pointer', border: `0.5px solid ${activeTab === tab.key ? '#1d1d1f' : '#d2d2d7'}`, background: activeTab === tab.key ? '#1d1d1f' : 'white', color: activeTab === tab.key ? 'white' : '#3c3c43' }}>
                    {tab.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Tablo Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 70px 80px 100px 80px', gap: '8px', padding: '8px 16px', background: '#f9f9f9', borderBottom: '0.5px solid #f0f0f5' }}>
              {[
                { label: 'Keyword', key: null },
                { label: 'Hacim', key: 'volume' },
                { label: 'IQ Score', key: 'iq_score' },
                { label: 'Buyer Score', key: 'buyer_score' },
                { label: 'Intent', key: null },
                { label: 'Kaynak', key: null },
              ].map(col => (
                <div key={col.label} onClick={() => col.key && handleSort(col.key)}
                  style={{ fontSize: '10px', color: col.key && sortKey === col.key ? '#0071e3' : '#aeaeb2', textTransform: 'uppercase', letterSpacing: '0.4px', cursor: col.key ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: '3px', userSelect: 'none' }}>
                  {col.label}
                  {col.key && <span style={{ fontSize: '9px' }}>{sortKey === col.key ? (sortDir === 'desc' ? '↓' : '↑') : '↕'}</span>}
                </div>
              ))}
            </div>

            {/* Keyword Satırları */}
            <div>
              {sortedKeywords.slice(0, 50).map((kw, i) => {
                const intentStyle = INTENT_COLORS[kw.intent] || INTENT_COLORS.mixed
                return (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 70px 80px 100px 80px', gap: '8px', padding: '10px 16px', borderBottom: '0.5px solid #f5f5f7', alignItems: 'center' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: '#1d1d1f' }}>{kw.keyword}</div>
                      {kw.note && <div style={{ fontSize: '10px', color: '#8e8e93', marginTop: '2px' }}>{kw.note}</div>}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f', textAlign: 'right' }}>{kw.volume}</div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: IQ_COLOR(kw.iq_score), background: IQ_BG(kw.iq_score), padding: '2px 8px', borderRadius: '6px' }}>
                        {kw.iq_score}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ height: '4px', background: '#f0f0f5', borderRadius: '2px' }}>
                        <div style={{ height: '100%', borderRadius: '2px', background: '#0071e3', width: `${kw.buyer_score || 0}%` }} />
                      </div>
                      <div style={{ fontSize: '10px', color: '#8e8e93', marginTop: '2px', textAlign: 'right' }}>{kw.buyer_score}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', background: intentStyle.bg, color: intentStyle.color, fontWeight: '500', whiteSpace: 'nowrap' }}>
                        {intentStyle.label}
                      </span>
                    </div>
                    <div>
                      <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', background: kw.source === 'ai' ? '#f3e8ff' : kw.market === 'DE' ? '#e8f0fe' : '#f5f5f7', color: kw.source === 'ai' ? '#af52de' : kw.market === 'DE' ? '#0071e3' : '#8e8e93', fontWeight: '500' }}>
                        {kw.source === 'ai' ? '🤖 AI' : kw.market === 'DE' ? '🇩🇪 DE' : '🇺🇸 US'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Negatif Keywordler */}
          {result.negative_keywords?.length > 0 && (
            <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '16px 20px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f', marginBottom: '10px' }}>🚫 Negatif Keywordler</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {result.negative_keywords.map((nk, i) => (
                  <span key={i} style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '20px', background: '#fff1f0', color: '#c00', border: '0.5px solid #ffd0ce' }}>
                    -{nk}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Ürün sayfasına git */}
          <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f' }}>🚀 Sonraki Adım</div>
              <div style={{ fontSize: '12px', color: '#8e8e93', marginTop: '2px' }}>Bu keyword için ürün araştırması yap</div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => navigate(`/app/search?q=${encodeURIComponent(seed)}`)}
                style={{ fontSize: '12px', padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#0071e3', color: 'white', cursor: 'pointer', fontFamily: 'inherit' }}>
                Ürün Ara →
              </button>
              <button onClick={() => navigate(`/app/niche?keyword=${encodeURIComponent(seed)}`)}
                style={{ fontSize: '12px', padding: '8px 16px', borderRadius: '8px', border: '0.5px solid #d2d2d7', background: 'white', color: '#1d1d1f', cursor: 'pointer', fontFamily: 'inherit' }}>
                Niş Skoru →
              </button>
            </div>
          </div>

        </div>
      )}

      {!result && !loading && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#8e8e93' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔑</div>
          <div style={{ fontSize: '15px', fontWeight: '500', color: '#1d1d1f', marginBottom: '6px' }}>Keyword Scanner</div>
          <div style={{ fontSize: '13px', maxWidth: '400px', margin: '0 auto', lineHeight: '1.7' }}>
            Seed keyword gir → Amazon autocomplete + Claude AI ile 50+ keyword üret → IQ Score, buyer intent ve listing önerileri al
          </div>
          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            {[
              { icon: '🇺🇸', title: 'Amazon.com', desc: 'US autocomplete' },
              { icon: '🇩🇪', title: 'Amazon.de', desc: 'Cross-market' },
              { icon: '🤖', title: 'Claude AI', desc: '50+ long-tail' },
              { icon: '💰', title: 'Buyer Intent', desc: 'NLP analizi' },
            ].map(item => (
              <div key={item.title} style={{ background: 'white', borderRadius: '10px', border: '0.5px solid #e5e5ea', padding: '14px 18px', textAlign: 'center', minWidth: '120px' }}>
                <div style={{ fontSize: '22px', marginBottom: '6px' }}>{item.icon}</div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#1d1d1f' }}>{item.title}</div>
                <div style={{ fontSize: '10px', color: '#8e8e93', marginTop: '2px' }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
