import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { track, Events } from '../lib/analytics'

const API = ''

const SCORE_COLOR = (s) => s >= 80 ? '#34c759' : s >= 60 ? '#ff9f0a' : s >= 40 ? '#ff6b35' : '#ff3b30'
const SCORE_BG = (s) => s >= 80 ? '#e8f9ee' : s >= 60 ? '#fff4e0' : s >= 40 ? '#fff1e8' : '#fff1f0'
const SCORE_TEXT = (s) => s >= 80 ? '#1a7f37' : s >= 60 ? '#b45309' : s >= 40 ? '#c2410c' : '#c00'
const VERDICT = (s) => s >= 90 ? '🟢 Mükemmel — Hemen gir' : s >= 70 ? '🟡 İyi — Araştır' : s >= 50 ? '🟠 Orta — Dikkatli ol' : '🔴 Zayıf — Kaçın'

const EXAMPLE_ASINS = [
  { asin: 'B07QK955LS', label: 'Silikon Spatula' },
  { asin: 'B08N5WRWNW', label: 'LED Lamba' },
  { asin: 'B07WDMFGDB', label: 'Bambu Tahta' },
]

const EXAMPLE_KEYWORDS = ['yoga mat', 'resistance bands', 'led desk lamp', 'bamboo cutting board']

const METHODOLOGY = [
  {
    icon: '📦', title: 'Hacim & Depolama (25 puan)', color: '#0071e3', bg: '#e8f0fe',
    desc: 'Ürünün fiziksel boyutu ve Amazon deposundaki depolama maliyeti. Küçük ve hafif ürünler (≤1 lb) daha düşük FBA ücreti öder ve daha az depolama riski taşır. BSR bazlı satış hızı da bu skora katkı sağlar.',
    criteria: ['≤0.5 lb → 25 puan (maksimum)', '≤1 lb → 20 puan', '≤2 lb → 15 puan', 'BSR <1000 → +5 bonus puan']
  },
  {
    icon: '🚚', title: 'Lojistik (25 puan)', color: '#34c759', bg: '#e8f9ee',
    desc: 'FBA uygunluğu, kırılganlık riski ve tedarik edilebilirlik. FBA kullanan ürünler Prime rozetine sahip olur ve dönüşüm oranı artar.',
    criteria: ['FBA uygun → +5 puan', 'Kırılgan değil → +5 puan', "Alibaba'da tedarik edilebilir → +5 puan", 'Ağırlık <1 lb → +8 puan']
  },
  {
    icon: '⚔️', title: 'Rekabet (25 puan)', color: '#ff9f0a', bg: '#fff4e0',
    desc: 'Pazarın ne kadar kalabalık olduğunu ölçer. Büyük marka varlığı, patent riski ve Review Velocity Index (RVI) bu skoru belirler.',
    criteria: ['RVI <10 → Pazar boş, giriş fırsatı', 'Büyük marka yok → +5 puan', 'Patent riski yok → +5 puan', 'BSR <5000 → +8 puan']
  },
  {
    icon: '💰', title: 'Karlılık (25 puan)', color: '#af52de', bg: '#f3e8ff',
    desc: 'Fiyat aralığı, tahmini kar marjı ve talep trendi. $15-50 arasındaki ürünler FBA maliyetlerini karşılayacak marj bırakır.',
    criteria: ['$15-50 fiyat aralığı → 8 puan', '%50+ marj → 10 puan', 'Yükselen talep trendi → +7 bonus', "Alibaba maliyeti = fiyatın %15'i varsayılan"]
  },
]

export default function NichePage() {
  const navigate = useNavigate()
  const [inputMode, setInputMode] = useState('asin')
  const [asin, setAsin] = useState('')
  const [keyword, setKeyword] = useState('')
  const [result, setResult] = useState(null)
  const [keywordResults, setKeywordResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showMethodology, setShowMethodology] = useState(false)

  const handleAnalyze = async () => {
    if (inputMode === 'asin') {
      if (!asin.trim()) return
      setLoading(true)
      setError('')
      setKeywordResults([])
      try {
        const res = await axios.get(`${API}/api/amazon/niche-score/${asin.trim()}`)
        setResult(res.data)

        // Event tracking — niş skoru analizi
        const s = res.data?.niche_score?.total_score || res.data?.total_score || 0
        track(Events.NICHE_SCORE_VIEW, {
          asin: asin.trim(),
          score: s,
          mode: 'asin',
        })
      } catch {
        setError('Ürün bulunamadi. ASIN kontrol et.')
      } finally {
        setLoading(false)
      }
    } else {
      if (!keyword.trim()) return
      setLoading(true)
      setError('')
      setResult(null)
      try {
        const res = await axios.get(`${API}/api/amazon/search?keyword=${encodeURIComponent(keyword)}`)
        const products = res.data?.results || res.data?.search_results || []
        const scored = await Promise.all(
          products.slice(0, 6).map(async (p) => {
            try {
              const ns = await axios.get(`${API}/api/amazon/niche-score/${p.asin}`)
              return { ...p, niche: ns.data }
            } catch {
              return { ...p, niche: null }
            }
          })
        )
        setKeywordResults(scored)

        // Event tracking — keyword niş taraması
        track(Events.NICHE_SCORE_VIEW, {
          keyword: keyword.trim(),
          results_count: scored.length,
          mode: 'keyword',
        })
      } catch {
        setError('Arama sirasinda hata olustu.')
      } finally {
        setLoading(false)
      }
    }
  }

  const score = result?.niche_score?.total_score || result?.total_score || 0
  const nicheData = result?.niche_score || result || {}
  const dims = nicheData?.dimensions || {}
  const flags = nicheData?.flags || {}
  const unmet = nicheData?.unmet_demand || {}
  const prong = nicheData?.prong_test || {}
  const rvi = nicheData?.review_velocity || {}
  const trend = nicheData?.demand_trend || {}

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", maxWidth: '900px' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>

      <div style={{ marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '19px', fontWeight: '600', color: '#1d1d1f', letterSpacing: '-0.3px' }}>Niş Skoru Analizi</div>
          <div style={{ fontSize: '13px', color: '#8e8e93', marginTop: '3px' }}>ASIN veya keyword gir — 100 puanlık niş analizi yap</div>
        </div>
        <button onClick={() => setShowMethodology(!showMethodology)}
          style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '8px', border: '0.5px solid #d2d2d7', background: showMethodology ? '#1d1d1f' : 'white', color: showMethodology ? 'white' : '#3c3c43', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '5px' }}>
          📖 {showMethodology ? 'Metodoloji Kapat' : 'Nasıl Hesaplıyoruz?'}
        </button>
      </div>

      {showMethodology && (
        <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '20px', marginBottom: '14px', animation: 'fadeIn 0.2s ease' }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#1d1d1f', marginBottom: '6px' }}>📊 AmazenLens Niş Skoru — Nasıl Çalışır?</div>
          <div style={{ fontSize: '12px', color: '#8e8e93', lineHeight: '1.7', marginBottom: '16px' }}>
            Bir ürünü "niş" olarak nitelendirmek için dört temel boyutu değerlendiriyoruz. Her boyut maksimum 25 puan alır ve toplam 100 üzerinden hesaplanır.
          </div>
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
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f', marginBottom: '10px' }}>🔬 Ek Metrikler</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {[
                { icon: '📈', title: 'Review Velocity Index (RVI)', desc: 'Aylık ortalama yeni review kazanım hızı. RVI <10 → pazar henüz kalabalıklaşmadı.' },
                { icon: '🔥', title: 'Unmet Demand', desc: "Az review'a rağmen iyi BSR, düşük rating+yüksek satış ile tespit edilir." },
                { icon: '🔱', title: '3 Prong Testi', desc: 'Dan Rodgers metodolojisi: Yüksek fiyat ($25+), geliştirme potansiyeli ve az review eşiği.' },
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
              { range: '90-100', label: 'Mükemmel', color: '#34c759', bg: '#e8f9ee', desc: 'Hemen gir' },
              { range: '70-89', label: 'İyi', color: '#ff9f0a', bg: '#fff4e0', desc: 'Araştır' },
              { range: '50-69', label: 'Orta', color: '#ff6b35', bg: '#fff1e8', desc: 'Dikkatli ol' },
              { range: '0-49', label: 'Zayıf', color: '#ff3b30', bg: '#fff1f0', desc: 'Kaçın' },
            ].map(s => (
              <div key={s.range} style={{ background: s.bg, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: s.color }}>{s.range}</div>
                <div style={{ fontSize: '11px', fontWeight: '600', color: s.color }}>{s.label}</div>
                <div style={{ fontSize: '10px', color: '#8e8e93', marginTop: '2px' }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '16px 20px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', gap: '4px', background: '#f5f5f7', borderRadius: '8px', padding: '3px', marginBottom: '14px', width: 'fit-content' }}>
          {[{ key: 'asin', label: 'ASIN ile Analiz' }, { key: 'keyword', label: 'Keyword ile Tara' }].map(m => (
            <button key={m.key} onClick={() => { setInputMode(m.key); setResult(null); setKeywordResults([]); setError('') }}
              style={{ padding: '6px 16px', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit', background: inputMode === m.key ? 'white' : 'transparent', color: inputMode === m.key ? '#1d1d1f' : '#8e8e93', boxShadow: inputMode === m.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
              {m.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', color: '#8e8e93', marginBottom: '5px', fontWeight: '500' }}>
              {inputMode === 'asin' ? 'Amazon ASIN' : 'Keyword / Ürün Adı'}
            </div>
            <input type="text"
              value={inputMode === 'asin' ? asin : keyword}
              onChange={e => inputMode === 'asin' ? setAsin(e.target.value) : setKeyword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
              placeholder={inputMode === 'asin' ? 'örn: B07QK955LS' : 'örn: yoga mat, led lamp...'}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '0.5px solid #d2d2d7', fontSize: '13px', fontFamily: 'inherit', color: '#1d1d1f', outline: 'none', background: '#f5f5f7', boxSizing: 'border-box' }} />
          </div>
          <button onClick={handleAnalyze} disabled={loading || !(inputMode === 'asin' ? asin.trim() : keyword.trim())}
            style={{ background: (inputMode === 'asin' ? asin.trim() : keyword.trim()) ? '#0071e3' : '#d2d2d7', color: 'white', border: 'none', padding: '9px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit', height: '38px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {loading ? <div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div> : '🎯'}
            {loading ? 'Analiz ediliyor...' : inputMode === 'asin' ? 'Analiz Et' : 'Tara'}
          </button>
        </div>

        {error && <div style={{ marginTop: '10px', fontSize: '12px', color: '#ff3b30', padding: '8px 12px', background: '#fff1f0', borderRadius: '6px' }}>{error}</div>}

        <div style={{ marginTop: '12px', display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '11px', color: '#8e8e93' }}>Örnek:</div>
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
            "{keyword}" — {keywordResults.length} ürün analizi
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
                      {s >= 70 ? '✅ İyi' : s >= 50 ? '⚠️ Orta' : '❌ Zayıf'}
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
                  <div style={{ marginTop: '8px', fontSize: '11px', color: '#0071e3', textAlign: 'right' }}>Detay →</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {result && (
        <div style={{ animation: 'fadeIn 0.3s ease', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '10px', background: SCORE_BG(score), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '700', color: SCORE_TEXT(score), flexShrink: 0 }}>{score}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#1d1d1f', lineHeight: '1.4', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {result.title || result.asin}
              </div>
              <div style={{ fontSize: '11px', color: '#8e8e93', fontFamily: 'monospace' }}>
                ASIN: {result.asin} {result.price ? `· $${result.price}` : ''}
                {nicheData.monthly_sales_estimate ? ` · ~${nicheData.monthly_sales_estimate.toLocaleString()} satış/ay` : ''}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              <button onClick={() => navigate(`/app/product/${result.asin}`)}
                style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '8px', border: '0.5px solid #d2d2d7', background: 'white', color: '#0071e3', cursor: 'pointer', fontFamily: 'inherit' }}>
                Ürün Detayı →
              </button>
              <button onClick={() => navigate('/app/sourcing')}
                style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '8px', border: 'none', background: '#0071e3', color: 'white', cursor: 'pointer', fontFamily: 'inherit' }}>
                Tedarikçi Bul →
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '12px' }}>
            <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ position: 'relative', width: '120px', height: '120px', marginBottom: '14px' }}>
                <svg viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)', width: '120px', height: '120px' }}>
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#f0f0f5" strokeWidth="10" />
                  <circle cx="60" cy="60" r="50" fill="none" stroke={SCORE_COLOR(score)} strokeWidth="10"
                    strokeDasharray={`${(score / 100) * 314.2} 314.2`} strokeLinecap="round" />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: '#1d1d1f' }}>{score}</div>
                  <div style={{ fontSize: '11px', color: '#8e8e93' }}>/100</div>
                </div>
              </div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f', textAlign: 'center', marginBottom: '6px' }}>{VERDICT(score)}</div>
              <div style={{ fontSize: '11px', color: '#8e8e93', textAlign: 'center', lineHeight: '1.6', marginBottom: '12px' }}>
                {nicheData?.recommendation || 'Analiz tamamlandi.'}
              </div>
              {rvi?.rvi !== undefined && (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ background: '#f5f5f7', borderRadius: '8px', padding: '8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#8e8e93' }}>📈 Review Hızı (RVI)</div>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: rvi.score >= 7 ? '#34c759' : rvi.score >= 4 ? '#ff9f0a' : '#ff3b30' }}>{rvi.rvi}/ay</div>
                  </div>
                  <div style={{ background: '#f5f5f7', borderRadius: '8px', padding: '8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#8e8e93' }}>📊 Talep Trendi</div>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: trend.score >= 7 ? '#34c759' : '#ff9f0a' }}>{trend.trend || '—'}</div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '20px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f', marginBottom: '16px' }}>4 Boyutlu Analiz</div>
              {[
                { key: 'volume', label: 'Hacim & Depolama', max: 25, color: '#0071e3', icon: '📦', desc: 'Boyut, ağırlık, BSR hızı' },
                { key: 'logistics', label: 'Lojistik', max: 25, color: '#34c759', icon: '🚚', desc: 'FBA, kırılganlık, tedarik' },
                { key: 'competition', label: 'Rekabet', max: 25, color: '#ff9f0a', icon: '⚔️', desc: 'RVI, büyük marka, patent' },
                { key: 'profitability', label: 'Karlılık', max: 25, color: '#af52de', icon: '💰', desc: 'Fiyat, marj, trend' },
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
                  <div style={{ fontSize: '12px', color: '#1a7f37', fontWeight: '500' }}>💰 Tahmini Kar Marji</div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#1a7f37' }}>%{nicheData.estimated_margin}</div>
                </div>
              )}
            </div>
          </div>

          {prong && Object.keys(prong).length > 0 && (
            <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '16px 20px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f', marginBottom: '12px' }}>
                🔱 3 Prong Testi <span style={{ fontSize: '11px', color: '#8e8e93', fontWeight: '400' }}>— Dan Rodgers metodolojisi</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '10px' }}>
                {[
                  { key: 'high_price', label: 'Yüksek Fiyat', desc: '$25+ satis fiyati', icon: '💲' },
                  { key: 'dev_potential', label: 'Gelistirilebilir', desc: 'Urun gelistirme potansiyeli', icon: '🔧' },
                  { key: 'low_review_ok', label: 'Az Review OK', desc: '500 alti review ile girilir', icon: '⭐' },
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

          {unmet?.detected && (
            <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f' }}>🔥 Karsilanmamis Talep</div>
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
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f', marginBottom: '12px' }}>🚩 Red Flags</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                {[
                  { key: 'big_brand', label: 'Büyük Marka', desc: 'Nike, Apple gibi dominant marka' },
                  { key: 'seasonal', label: 'Sezonluk', desc: 'Yil boyunca satmaz' },
                  { key: 'low_development', label: 'Düşük Gelişim', desc: 'Geliştirme potansiyeli az' },
                  { key: 'patent_risk', label: 'Patent Riski', desc: 'Marka/patent ihlali riski' },
                  { key: 'fragile', label: 'Kırılgan', desc: 'Kargo hasarı riski' },
                  { key: 'heavy', label: 'Çok Agır', desc: '10 lb+ FBA maliyeti yüksek' },
                ].filter(f => flags[f.key]).map(f => (
                  <div key={f.key} style={{ padding: '8px 14px', borderRadius: '8px', background: '#fff1f0', border: '0.5px solid #ffd0ce' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#c00' }}>🚩 {f.label}</div>
                    <div style={{ fontSize: '10px', color: '#8e8e93', marginTop: '2px' }}>{f.desc}</div>
                  </div>
                ))}
              </div>
              <div style={{ padding: '10px 14px', background: '#fff1f0', borderRadius: '8px', fontSize: '12px', color: '#c00' }}>
                ⚠️ {Object.values(flags).filter(Boolean).length} red flag tespit edildi. Piyasaya girmeden once dikkatli arastir.
              </div>
            </div>
          )}

          <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '16px 20px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f', marginBottom: '12px' }}>🚀 Sonraki Adımlar</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {[
                { label: '🔍 Ürün Detayı', desc: 'Love/Hate analizi, varyantlar', to: `/app/product/${result.asin}`, color: '#0071e3', bg: '#e8f0fe' },
                { label: '🏭 Tedarikçi Bul', desc: 'Alibaba + DHgate + Türkiye', to: '/app/sourcing', color: '#34c759', bg: '#e8f9ee' },
                { label: '🧮 Pan-EU Kar Hesabı', desc: '9 pazarda VAT dahil kar', to: '/app/calculator', color: '#ff9f0a', bg: '#fff4e0' },
              ].map(btn => (
                <div key={btn.label} onClick={() => navigate(btn.to)}
                  style={{ background: btn.bg, borderRadius: '10px', padding: '12px 14px', cursor: 'pointer' }}>
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
          <div style={{ fontSize: '15px', fontWeight: '500', color: '#1d1d1f', marginBottom: '6px' }}>Niş Skoru Analizi</div>
          <div style={{ fontSize: '13px', maxWidth: '360px', margin: '0 auto 16px', lineHeight: '1.6' }}>
            ASIN girerek tek ürün analizi yap, ya da keyword girerek kategorideki ürünleri tara ve karşılaştır.
          </div>
          <button onClick={() => setShowMethodology(true)}
            style={{ fontSize: '12px', padding: '8px 18px', borderRadius: '8px', border: '0.5px solid #d2d2d7', background: 'white', color: '#0071e3', cursor: 'pointer', fontFamily: 'inherit' }}>
            📖 Nasıl Hesaplıyoruz?
          </button>
        </div>
      )}
    </div>
  )
}
