import { useState } from 'react'
import axios from 'axios'

const API = 'http://127.0.0.1:8000'

const SCORE_COLOR = (s) => s >= 70 ? '#34c759' : s >= 50 ? '#ff9f0a' : '#ff3b30'

export default function SourcingPage() {
  const [keyword, setKeyword] = useState('')
  const [amazonPrice, setAmazonPrice] = useState('')
  const [alibabaPriceInput, setAlibabaPriceInput] = useState('')
  const [suppliers, setSuppliers] = useState([])
  const [arbitrage, setArbitrage] = useState(null)
  const [profit, setProfit] = useState(null)
  const [loading, setLoading] = useState(false)
  const [profitLoading, setProfitLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('suppliers') // suppliers | arbitrage | profit

  const handleSearch = async () => {
    if (!keyword.trim() || !amazonPrice) return
    setLoading(true)
    try {
      const [suppRes, arbRes] = await Promise.all([
        axios.get(`${API}/api/sourcing/alibaba?keyword=${encodeURIComponent(keyword)}`),
        axios.get(`${API}/api/sourcing/arbitrage?keyword=${encodeURIComponent(keyword)}&amazon_price=${amazonPrice}&include_euro=true`)
      ])
      setSuppliers(suppRes.data.suppliers || [])
      setArbitrage(arbRes.data)
      setActiveTab('suppliers')
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleProfitCalc = async () => {
    if (!amazonPrice || !alibabaPriceInput) return
    setProfitLoading(true)
    try {
      const res = await axios.get(`${API}/api/sourcing/profit-calc?amazon_price=${amazonPrice}&alibaba_price=${alibabaPriceInput}`)
      setProfit(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setProfitLoading(false)
    }
  }

  const tabs = [
    { key: 'suppliers', label: `🏭 Alibaba (${suppliers.length})` },
    { key: 'arbitrage', label: `🌍 Arbitraj${arbitrage ? ` (${arbitrage.total_platforms})` : ''}` },
    { key: 'profit', label: '💰 Kar Hesabı' },
  ]

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", maxWidth: '960px' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Başlık */}
      <div style={{ marginBottom: '18px' }}>
        <div style={{ fontSize: '19px', fontWeight: '600', color: '#1d1d1f', letterSpacing: '-0.3px' }}>
          Tedarik & Arbitraj
        </div>
        <div style={{ fontSize: '13px', color: '#8e8e93', marginTop: '3px' }}>
          Alibaba tedarikçi bul + Global arbitraj fırsatlarını keşfet
        </div>
      </div>

      {/* Arama Kartı */}
      <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '16px 20px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
          <div style={{ flex: 2 }}>
            <div style={{ fontSize: '11px', color: '#8e8e93', marginBottom: '5px', fontWeight: '500' }}>Ürün Adı / Keyword</div>
            <input
              type="text"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="örn: yoga mat, silikon spatula..."
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '0.5px solid #d2d2d7', fontSize: '13px', fontFamily: 'inherit', color: '#1d1d1f', outline: 'none', background: '#f5f5f7', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', color: '#8e8e93', marginBottom: '5px', fontWeight: '500' }}>Amazon Fiyatı ($)</div>
            <input
              type="number"
              value={amazonPrice}
              onChange={e => setAmazonPrice(e.target.value)}
              placeholder="34.99"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '0.5px solid #d2d2d7', fontSize: '13px', fontFamily: 'inherit', color: '#1d1d1f', outline: 'none', background: '#f5f5f7', boxSizing: 'border-box' }}
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading || !keyword.trim() || !amazonPrice}
            style={{ background: keyword && amazonPrice ? '#0071e3' : '#d2d2d7', color: 'white', border: 'none', padding: '9px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: keyword && amazonPrice ? 'pointer' : 'not-allowed', fontFamily: 'inherit', whiteSpace: 'nowrap', height: '38px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {loading ? (
              <div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
            ) : '🔍'}
            {loading ? 'Aranıyor...' : 'Ara'}
          </button>
        </div>
      </div>

      {/* Tab'lar */}
      <div style={{ display: 'flex', gap: '4px', background: 'white', borderRadius: '10px', padding: '4px', border: '0.5px solid #e5e5ea', marginBottom: '14px' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '8px', fontSize: '12.5px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit', background: activeTab === t.key ? '#1d1d1f' : 'transparent', color: activeTab === t.key ? 'white' : '#8e8e93', transition: 'all 0.15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Alibaba Tedarikçiler */}
      {activeTab === 'suppliers' && (
        <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f', marginBottom: '16px' }}>
            🏭 Alibaba Tedarikçiler
          </div>
          {suppliers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', color: '#8e8e93' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🏭</div>
              <div style={{ fontSize: '14px', fontWeight: '500', color: '#1d1d1f', marginBottom: '6px' }}>Tedarikçi ara</div>
              <div style={{ fontSize: '13px' }}>Ürün adı ve Amazon fiyatı girerek arama yap</div>
            </div>
          ) : (
            suppliers.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 0', borderBottom: i < suppliers.length - 1 ? '0.5px solid #f5f5f7' : 'none' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '8px', background: '#f5f5f7', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🏭</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: '#1d1d1f', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                  <div style={{ fontSize: '11px', color: '#8e8e93' }}>
                    {s.company}
                    {s.verified && <span style={{ marginLeft: '6px', color: '#34c759' }}>✅ Verified</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: '#34c759' }}>${s.price_min} – ${s.price_max}</div>
                  <div style={{ fontSize: '11px', color: '#8e8e93', marginTop: '2px' }}>MOQ: {s.moq}</div>
                </div>
                {amazonPrice && (
                  <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '80px' }}>
                    <div style={{ fontSize: '11px', color: '#8e8e93', marginBottom: '2px' }}>Tahmini Kar</div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#0071e3' }}>
                      ${(parseFloat(amazonPrice) - parseFloat(s.price_min) - parseFloat(amazonPrice) * 0.15 - 2.5).toFixed(2)}
                    </div>
                  </div>
                )}
                <a href={s.url} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: '12px', padding: '6px 12px', borderRadius: '7px', border: '0.5px solid #d2d2d7', background: 'white', color: '#0071e3', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  Alibaba'da Gör →
                </a>
              </div>
            ))
          )}
        </div>
      )}

      {/* Arbitraj */}
      {activeTab === 'arbitrage' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {!arbitrage ? (
            <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '48px', textAlign: 'center', color: '#8e8e93' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🌍</div>
              <div style={{ fontSize: '14px', fontWeight: '500', color: '#1d1d1f', marginBottom: '6px' }}>Global Arbitraj</div>
              <div style={{ fontSize: '13px' }}>Ürün adı ve Amazon fiyatı girerek arbitraj fırsatlarını gör</div>
            </div>
          ) : (
            <>
              {/* En İyi Fırsat */}
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

              {/* En İyi Euro Flip */}
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

              {/* Yerel Platformlar */}
              {arbitrage.results?.filter(r => !['DE','FR','UK','IT','ES','CA','JP'].includes(r.marketplace)).length > 0 && (
                <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '0.5px solid #f5f5f7' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#1d1d1f' }}>🌍 Yerel Platformlar</div>
                  </div>
                  {arbitrage.results.filter(r => !['DE','FR','UK','IT','ES','CA','JP'].includes(r.marketplace)).map((r, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '0.5px solid #f5f5f7' }}>
                      <div style={{ fontSize: '20px', marginRight: '12px' }}>{r.flag}</div>
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
              )}

              {/* Euro Flips */}
              {arbitrage.euro_flips?.length > 0 && (
                <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '0.5px solid #f5f5f7', background: '#f5f5f7' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#0071e3' }}>🇪🇺 Euro Flips — Amazon Avrupa Pazarları</div>
                    <div style={{ fontSize: '10px', color: '#8e8e93', marginTop: '2px' }}>VAT dahil hesaplanmıştır</div>
                  </div>
                  {arbitrage.euro_flips.map((r, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '0.5px solid #f5f5f7', background: r.arbitrage_profit > 5 ? '#f0fff4' : 'white' }}>
                      <div style={{ fontSize: '20px', marginRight: '12px' }}>{r.flag}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: '500', color: '#1d1d1f' }}>{r.platform}</div>
                        <div style={{ fontSize: '11px', color: '#8e8e93' }}>{r.price_local} {r.currency} = ${r.price_usd} · VAT {r.vat_rate}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: r.arbitrage_profit > 0 ? '#0071e3' : '#ff3b30' }}>{r.arbitrage_profit > 0 ? '+' : ''}${r.arbitrage_profit}</div>
                        <div style={{ fontSize: '10px', color: '#8e8e93' }}>%{r.margin} · ROI %{r.roi}</div>
                      </div>
                      {r.arbitrage_profit > 5 && (
                        <div style={{ marginLeft: '8px', fontSize: '10px', padding: '2px 8px', borderRadius: '10px', background: '#e8f9ee', color: '#1a7f37', fontWeight: '600' }}>HOT</div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Kur Bilgisi */}
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
            </>
          )}
        </div>
      )}

      {/* Kar Hesabı */}
      {activeTab === 'profit' && (
        <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f', marginBottom: '16px' }}>💰 Kar Hesaplayıcı</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '12px', alignItems: 'flex-end', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#8e8e93', marginBottom: '5px', fontWeight: '500' }}>Amazon Fiyatı ($)</div>
              <input
                type="number"
                value={amazonPrice}
                onChange={e => setAmazonPrice(e.target.value)}
                placeholder="34.99"
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '0.5px solid #d2d2d7', fontSize: '13px', fontFamily: 'inherit', color: '#1d1d1f', outline: 'none', background: '#f5f5f7', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#8e8e93', marginBottom: '5px', fontWeight: '500' }}>Alibaba Alış Fiyatı ($)</div>
              <input
                type="number"
                value={alibabaPriceInput}
                onChange={e => setAlibabaPriceInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleProfitCalc()}
                placeholder="3.50"
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '0.5px solid #d2d2d7', fontSize: '13px', fontFamily: 'inherit', color: '#1d1d1f', outline: 'none', background: '#f5f5f7', boxSizing: 'border-box' }}
              />
            </div>
            <button onClick={handleProfitCalc} disabled={profitLoading || !amazonPrice || !alibabaPriceInput}
              style={{ background: amazonPrice && alibabaPriceInput ? '#0071e3' : '#d2d2d7', color: 'white', border: 'none', padding: '9px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: amazonPrice && alibabaPriceInput ? 'pointer' : 'not-allowed', fontFamily: 'inherit', height: '38px' }}>
              Hesapla
            </button>
          </div>

          {profit && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '12px' }}>
                {[
                  { label: 'FBA Ücreti', value: `$${profit.fba_fee}`, color: '#ff3b30', bg: '#fff1f0' },
                  { label: 'Net Kar', value: `$${profit.net_profit}`, color: '#34c759', bg: '#e8f9ee' },
                  { label: 'Kar Marjı', value: `%${profit.margin_pct}`, color: '#0071e3', bg: '#e8f0fe' },
                  { label: 'ROI', value: `%${profit.roi_pct}`, color: '#ff9f0a', bg: '#fff4e0' },
                ].map(item => (
                  <div key={item.label} style={{ background: item.bg, padding: '14px', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#8e8e93', marginBottom: '6px' }}>{item.label}</div>
                    <div style={{ fontSize: '20px', fontWeight: '600', color: item.color }}>{item.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: profit.net_profit > 0 ? '#e8f9ee' : '#fff1f0', borderRadius: '10px', padding: '12px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: '15px', fontWeight: '600', color: profit.net_profit > 0 ? '#1a7f37' : '#c00' }}>
                  {profit.verdict}
                </div>
                <div style={{ fontSize: '12px', color: '#8e8e93', marginTop: '4px' }}>
                  Breakeven: ${profit.breakeven_price || ((parseFloat(alibabaPriceInput) + parseFloat(profit.fba_fee)) * 1.15).toFixed(2)}
                </div>
              </div>

              {/* Pan-EU linki */}
              <div style={{ marginTop: '12px', padding: '12px 16px', background: '#f5f5f7', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '12px', color: '#3c3c43' }}>
                  🇪🇺 Hangi Avrupa pazarında daha karlı?
                </div>
                <a href="/calculator" style={{ fontSize: '12px', color: '#0071e3', textDecoration: 'none', fontWeight: '500' }}>
                  Pan-EU Hesabı Yap →
                </a>
              </div>
            </div>
          )}

          {!profit && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#8e8e93' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>💰</div>
              <div style={{ fontSize: '13px' }}>Amazon ve Alibaba fiyatını girerek kar hesabı yap</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
