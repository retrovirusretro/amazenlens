import { useState } from 'react'
import axios from 'axios'

const API = 'http://127.0.0.1:8000'

const VERDICT_STYLE = {
  '✅': { bg: '#e8f9ee', color: '#1a7f37', border: '#b7f0c8' },
  '⚠️': { bg: '#fff4e0', color: '#b45309', border: '#fcd34d' },
  '❌': { bg: '#fff1f0', color: '#c00', border: '#ffd0ce' },
}

export default function CalculatorPage() {
  const [amazonPrice, setAmazonPrice] = useState('')
  const [alibabaPrice, setAlibabaPrice] = useState('')
  const [shippingCost, setShippingCost] = useState('0')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeView, setActiveView] = useState('table') // table | cards

  const handleCalc = async () => {
    if (!amazonPrice || !alibabaPrice) return
    setLoading(true)
    try {
      const res = await axios.get(`${API}/api/sourcing/pan-eu`, {
        params: {
          amazon_price: parseFloat(amazonPrice),
          alibaba_price: parseFloat(alibabaPrice),
          shipping_cost: parseFloat(shippingCost) || 0
        }
      })
      setResult(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const bestMarket = result?.best_market

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", maxWidth: '900px' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Başlık */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '19px', fontWeight: '600', color: '#1d1d1f', letterSpacing: '-0.3px' }}>
          Pan-EU FBA Kar Hesabı
        </div>
        <div style={{ fontSize: '13px', color: '#8e8e93', marginTop: '3px' }}>
          9 Amazon pazarı için VAT dahil gerçek kar hesabı — hangi ülkede satmalısın?
        </div>
      </div>

      {/* Giriş Kartı */}
      <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '20px', marginBottom: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '12px', alignItems: 'flex-end' }}>
          {[
            { label: 'Amazon Satış Fiyatı ($)', value: amazonPrice, setter: setAmazonPrice, placeholder: '34.99', icon: '🛒' },
            { label: 'Alibaba Alış Fiyatı ($)', value: alibabaPrice, setter: setAlibabaPrice, placeholder: '3.50', icon: '🏭' },
            { label: 'Kargo Maliyeti ($)', value: shippingCost, setter: setShippingCost, placeholder: '0', icon: '📦' },
          ].map(field => (
            <div key={field.label}>
              <div style={{ fontSize: '11px', color: '#8e8e93', marginBottom: '6px', fontWeight: '500' }}>
                {field.icon} {field.label}
              </div>
              <input
                type="number"
                value={field.value}
                onChange={e => field.setter(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCalc()}
                placeholder={field.placeholder}
                style={{
                  width: '100%', padding: '9px 12px', borderRadius: '8px',
                  border: '0.5px solid #d2d2d7', fontSize: '14px', fontWeight: '500',
                  fontFamily: 'inherit', color: '#1d1d1f', outline: 'none',
                  boxSizing: 'border-box', background: '#f5f5f7'
                }}
              />
            </div>
          ))}
          <button onClick={handleCalc} disabled={loading || !amazonPrice || !alibabaPrice}
            style={{
              background: amazonPrice && alibabaPrice ? '#0071e3' : '#d2d2d7',
              color: 'white', border: 'none', padding: '9px 20px',
              borderRadius: '8px', fontSize: '13px', fontWeight: '500',
              cursor: amazonPrice && alibabaPrice ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit', whiteSpace: 'nowrap', height: '38px',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}>
            {loading ? (
              <div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
            ) : '🧮'}
            Hesapla
          </button>
        </div>

        {/* Hızlı örnek */}
        <div style={{ marginTop: '12px', display: 'flex', gap: '6px', alignItems: 'center' }}>
          <div style={{ fontSize: '11px', color: '#8e8e93' }}>Hızlı örnek:</div>
          {[
            { label: 'Yoga Mat ($28.99)', amazon: '28.99', alibaba: '3.50' },
            { label: 'Silikon Set ($34.99)', amazon: '34.99', alibaba: '4.50' },
            { label: 'LED Lamba ($22.99)', amazon: '22.99', alibaba: '2.80' },
          ].map(ex => (
            <div key={ex.label} onClick={() => { setAmazonPrice(ex.amazon); setAlibabaPrice(ex.alibaba); }}
              style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', border: '0.5px solid #d2d2d7', background: 'white', color: '#0071e3', cursor: 'pointer' }}>
              {ex.label}
            </div>
          ))}
        </div>
      </div>

      {/* Sonuçlar */}
      {result && (
        <div>
          {/* En İyi Pazar */}
          {bestMarket && (
            <div style={{ background: VERDICT_STYLE[bestMarket.verdict]?.bg || '#e8f9ee', borderRadius: '12px', padding: '16px 20px', marginBottom: '12px', border: `0.5px solid ${VERDICT_STYLE[bestMarket.verdict]?.border || '#b7f0c8'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: VERDICT_STYLE[bestMarket.verdict]?.color, marginBottom: '4px' }}>
                  🏆 En Karlı Pazar
                </div>
                <div style={{ fontSize: '18px', fontWeight: '600', color: '#1d1d1f' }}>
                  {bestMarket.marketplace_name}
                </div>
                <div style={{ fontSize: '12px', color: '#8e8e93', marginTop: '4px' }}>
                  {bestMarket.symbol}{bestMarket.price_local} satış · VAT {bestMarket.vat_rate} · FBA {bestMarket.symbol}{bestMarket.fba_fee}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '28px', fontWeight: '600', color: VERDICT_STYLE[bestMarket.verdict]?.color }}>
                  %{bestMarket.margin_pct}
                </div>
                <div style={{ fontSize: '12px', color: '#8e8e93' }}>kar marjı</div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: VERDICT_STYLE[bestMarket.verdict]?.color, marginTop: '4px' }}>
                  {bestMarket.symbol}{bestMarket.net_profit} net kar
                </div>
              </div>
            </div>
          )}

          {/* Özet İstatistikler */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '12px' }}>
            {[
              { label: 'Karlı Pazar', value: `${result.profitable_count}/${result.total_markets}`, color: '#34c759', bg: '#e8f9ee' },
              { label: 'En Yüksek Marj', value: `%${bestMarket?.margin_pct}`, color: '#0071e3', bg: '#e8f0fe' },
              { label: 'En Yüksek Net Kar', value: `${bestMarket?.symbol}${bestMarket?.net_profit}`, color: '#af52de', bg: '#f3e8ff' },
            ].map(stat => (
              <div key={stat.label} style={{ background: stat.bg, borderRadius: '10px', padding: '14px 16px' }}>
                <div style={{ fontSize: '11px', color: '#8e8e93', marginBottom: '4px' }}>{stat.label}</div>
                <div style={{ fontSize: '20px', fontWeight: '600', color: stat.color }}>{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Görünüm Seçici */}
          <div style={{ display: 'flex', gap: '4px', background: 'white', borderRadius: '10px', padding: '4px', border: '0.5px solid #e5e5ea', marginBottom: '12px', width: 'fit-content' }}>
            {[{ key: 'table', label: '📊 Tablo' }, { key: 'cards', label: '🃏 Kartlar' }].map(v => (
              <button key={v.key} onClick={() => setActiveView(v.key)}
                style={{ padding: '6px 16px', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit', background: activeView === v.key ? '#1d1d1f' : 'transparent', color: activeView === v.key ? 'white' : '#8e8e93' }}>
                {v.label}
              </button>
            ))}
          </div>

          {/* TABLO GÖRÜNÜMÜ */}
          {activeView === 'table' && (
            <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.8fr 0.8fr 0.8fr 0.8fr 0.8fr 0.7fr', gap: '8px', padding: '10px 16px', background: '#1d1d1f', fontSize: '10px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                <div>Pazar</div>
                <div style={{ textAlign: 'right' }}>Satış Fiyatı</div>
                <div style={{ textAlign: 'right' }}>VAT</div>
                <div style={{ textAlign: 'right' }}>FBA Ücreti</div>
                <div style={{ textAlign: 'right' }}>Net Kar</div>
                <div style={{ textAlign: 'right' }}>Marj</div>
                <div style={{ textAlign: 'center' }}>Durum</div>
              </div>
              {result.results.map((r, i) => {
                const vs = VERDICT_STYLE[r.verdict] || VERDICT_STYLE['❌']
                return (
                  <div key={r.marketplace} style={{
                    display: 'grid', gridTemplateColumns: '1.4fr 0.8fr 0.8fr 0.8fr 0.8fr 0.8fr 0.7fr',
                    gap: '8px', padding: '12px 16px',
                    borderBottom: i < result.results.length - 1 ? '0.5px solid #f5f5f7' : 'none',
                    background: i === 0 ? '#f9fffe' : 'white'
                  }}>
                    <div style={{ fontSize: '13px', fontWeight: i === 0 ? '600' : '500', color: '#1d1d1f' }}>
                      {i === 0 && <span style={{ fontSize: '10px', background: '#34c759', color: 'white', padding: '1px 5px', borderRadius: '4px', marginRight: '6px' }}>EN İYİ</span>}
                      {r.marketplace_name}
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '13px', color: '#1d1d1f' }}>
                      {r.symbol}{r.price_local}
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '13px', color: '#ff3b30' }}>
                      -{r.symbol}{r.vat_amount} <span style={{ fontSize: '10px', color: '#8e8e93' }}>({r.vat_rate})</span>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '13px', color: '#ff9f0a' }}>
                      -{r.symbol}{r.fba_fee}
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '13px', fontWeight: '600', color: r.net_profit > 0 ? '#34c759' : '#ff3b30' }}>
                      {r.net_profit > 0 ? '+' : ''}{r.symbol}{r.net_profit}
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '13px', fontWeight: '600', color: vs.color }}>
                      %{r.margin_pct}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', background: vs.bg, color: vs.color, fontWeight: '500' }}>
                        {r.verdict} {r.verdict_text}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* KART GÖRÜNÜMÜ */}
          {activeView === 'cards' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {result.results.map((r, i) => {
                const vs = VERDICT_STYLE[r.verdict] || VERDICT_STYLE['❌']
                return (
                  <div key={r.marketplace} style={{ background: 'white', borderRadius: '11px', border: `0.5px solid ${i === 0 ? vs.border : '#e5e5ea'}`, padding: '14px', position: 'relative', overflow: 'hidden' }}>
                    {i === 0 && (
                      <div style={{ position: 'absolute', top: 0, right: 0, background: '#34c759', color: 'white', fontSize: '9px', fontWeight: '600', padding: '3px 8px', borderBottomLeftRadius: '8px' }}>EN İYİ</div>
                    )}
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f', marginBottom: '10px' }}>
                      {r.marketplace_name}
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: '600', color: vs.color, marginBottom: '2px' }}>
                      %{r.margin_pct}
                    </div>
                    <div style={{ fontSize: '12px', color: '#8e8e93', marginBottom: '10px' }}>
                      {r.symbol}{r.net_profit} net kar
                    </div>
                    <div style={{ height: '4px', background: '#f0f0f5', borderRadius: '2px', marginBottom: '10px' }}>
                      <div style={{ height: '100%', borderRadius: '2px', background: vs.color, width: `${Math.min(Math.max(r.margin_pct, 0), 100)}%` }}></div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {[
                        { label: 'Satış', value: `${r.symbol}${r.price_local}`, color: '#1d1d1f' },
                        { label: `VAT ${r.vat_rate}`, value: `-${r.symbol}${r.vat_amount}`, color: '#ff3b30' },
                        { label: 'FBA', value: `-${r.symbol}${r.fba_fee}`, color: '#ff9f0a' },
                      ].map(row => (
                        <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                          <span style={{ color: '#8e8e93' }}>{row.label}</span>
                          <span style={{ fontWeight: '500', color: row.color }}>{row.value}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: '8px', padding: '6px 8px', borderRadius: '6px', background: vs.bg, textAlign: 'center', fontSize: '11px', fontWeight: '600', color: vs.color }}>
                      {r.verdict} {r.verdict_text}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Not */}
          <div style={{ marginTop: '12px', padding: '12px 16px', background: '#f5f5f7', borderRadius: '8px', fontSize: '11px', color: '#8e8e93', lineHeight: '1.6' }}>
            💡 <strong style={{ color: '#1d1d1f' }}>Not:</strong> Hesaplama Amazon referral ücreti (%15) + FBA fulfillment ücreti + VAT dahildir.
            Gümrük, iade ve depolama maliyetleri hariçtir. Kur: EUR=0.92, GBP=0.79, CAD=1.36, JPY=149.
          </div>
        </div>
      )}

      {/* Boş durum */}
      {!result && !loading && (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: '#8e8e93' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>🧮</div>
          <div style={{ fontSize: '15px', fontWeight: '500', color: '#1d1d1f', marginBottom: '6px' }}>Pan-EU Kar Hesabı</div>
          <div style={{ fontSize: '13px' }}>Amazon ve Alibaba fiyatını girerek 9 pazarı karşılaştır</div>
        </div>
      )}
    </div>
  )
}
