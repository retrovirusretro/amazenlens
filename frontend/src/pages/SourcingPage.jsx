import { useState } from 'react'
import { searchProducts } from '../lib/api'
import axios from 'axios'

const API = 'http://127.0.0.1:8000'

function SourcingPage() {
  const [keyword, setKeyword] = useState('')
  const [amazonPrice, setAmazonPrice] = useState('')
  const [suppliers, setSuppliers] = useState([])
  const [arbitrage, setArbitrage] = useState(null)
  const [profit, setProfit] = useState(null)
  const [alibabaPriceInput, setAlibabaPriceInput] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSearch = async () => {
    if (!keyword || !amazonPrice) return
    setLoading(true)
    try {
      const [suppRes, arbRes] = await Promise.all([
        axios.get(`${API}/api/sourcing/alibaba?keyword=${keyword}`),
        axios.get(`${API}/api/sourcing/arbitrage?keyword=${keyword}&amazon_price=${amazonPrice}`)
      ])
      setSuppliers(suppRes.data.suppliers || [])
      setArbitrage(arbRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleProfitCalc = async () => {
    if (!amazonPrice || !alibabaPriceInput) return
    try {
      const res = await axios.get(`${API}/api/sourcing/profit-calc?amazon_price=${amazonPrice}&alibaba_price=${alibabaPriceInput}`)
      setProfit(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div>
      <h1 style={{fontSize: '24px', fontWeight: '700', marginBottom: '24px'}}>
        🏭 Tedarik & Arbitraj
      </h1>

      {/* Arama */}
      <div style={{background: 'white', borderRadius: '12px', padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px'}}>
        <div style={{display: 'flex', gap: '12px', flexWrap: 'wrap'}}>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Ürün adı... (örn: yoga mat)"
            style={{flex: 2, minWidth: '200px', padding: '12px', borderRadius: '8px',
              border: '1px solid #e2e8f0', fontSize: '15px', outline: 'none'}}
          />
          <input
            type="number"
            value={amazonPrice}
            onChange={(e) => setAmazonPrice(e.target.value)}
            placeholder="Amazon fiyatı ($)"
            style={{flex: 1, minWidth: '150px', padding: '12px', borderRadius: '8px',
              border: '1px solid #e2e8f0', fontSize: '15px', outline: 'none'}}
          />
          <button onClick={handleSearch} disabled={loading}
            style={{padding: '12px 24px', background: '#3b82f6', color: 'white',
              border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer'}}>
            {loading ? 'Aranıyor...' : '🔍 Ara'}
          </button>
        </div>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px'}}>
        {/* Alibaba Tedarikçiler */}
        <div style={{background: 'white', borderRadius: '12px', padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}}>
          <h2 style={{fontSize: '18px', fontWeight: '700', marginBottom: '16px'}}>
            🏭 Alibaba Tedarikçiler
          </h2>
          {suppliers.length === 0 ? (
            <p style={{color: '#64748b', fontSize: '14px'}}>Arama yapın...</p>
          ) : (
            suppliers.map((s, i) => (
              <div key={i} style={{padding: '12px', borderRadius: '8px',
                background: '#f8fafc', marginBottom: '8px', border: '1px solid #e2e8f0'}}>
                <p style={{fontWeight: '600', fontSize: '14px', marginBottom: '4px'}}>{s.name}</p>
                <p style={{color: '#64748b', fontSize: '12px', marginBottom: '4px'}}>{s.company}</p>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <span style={{color: '#3b82f6', fontWeight: '700'}}>
                    ${s.price_min} - ${s.price_max}
                  </span>
                  <span style={{fontSize: '12px', color: '#64748b'}}>MOQ: {s.moq}</span>
                  {s.verified && <span style={{fontSize: '12px', color: '#16a34a'}}>✅ Verified</span>}
                </div>
                <a href={s.url} target="_blank" rel="noopener noreferrer"
                  style={{display: 'block', marginTop: '8px', fontSize: '12px',
                    color: '#3b82f6', textDecoration: 'none'}}>
                  Alibaba'da Gör →
                </a>
              </div>
            ))
          )}
        </div>

        {/* Global Arbitraj */}
        <div style={{background: 'white', borderRadius: '12px', padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}}>
          <h2 style={{fontSize: '18px', fontWeight: '700', marginBottom: '16px'}}>
            🌍 Global Arbitraj
          </h2>
          {!arbitrage ? (
            <p style={{color: '#64748b', fontSize: '14px'}}>Arama yapın...</p>
          ) : (
            <>
              {arbitrage.best_opportunity && (
                <div style={{background: '#dcfce7', borderRadius: '8px', padding: '12px', marginBottom: '16px'}}>
                  <p style={{fontSize: '12px', color: '#16a34a', fontWeight: '600'}}>🏆 En İyi Fırsat</p>
                  <p style={{fontWeight: '700'}}>{arbitrage.best_opportunity.flag} {arbitrage.best_opportunity.platform}</p>
                  <p style={{color: '#16a34a', fontWeight: '700', fontSize: '18px'}}>
                    +${arbitrage.best_opportunity.arbitrage_profit} kar
                  </p>
                </div>
              )}
              {arbitrage.results.map((r, i) => (
                <div key={i} style={{padding: '12px', borderRadius: '8px',
                  background: '#f8fafc', marginBottom: '8px', border: '1px solid #e2e8f0'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between'}}>
                    <span style={{fontWeight: '600'}}>{r.flag} {r.platform}</span>
                    <span style={{color: r.arbitrage_profit > 0 ? '#16a34a' : '#dc2626', fontWeight: '700'}}>
                      {r.arbitrage_profit > 0 ? '+' : ''} ${r.arbitrage_profit}
                    </span>
                  </div>
                  <p style={{color: '#64748b', fontSize: '12px'}}>
                    {r.currency === 'TRY' ? `₺${r.price_local}` : `$${r.price_local}`} = ${r.price_usd}
                  </p>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Kar Hesaplayıcı */}
      <div style={{background: 'white', borderRadius: '12px', padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginTop: '24px'}}>
        <h2 style={{fontSize: '18px', fontWeight: '700', marginBottom: '16px'}}>
          💰 Kar Hesaplayıcı
        </h2>
        <div style={{display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap'}}>
          <div>
            <p style={{fontSize: '12px', color: '#64748b', marginBottom: '4px'}}>Amazon Fiyatı ($)</p>
            <input type="number" value={amazonPrice} readOnly
              style={{padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0',
                width: '140px', background: '#f8fafc'}} />
          </div>
          <div>
            <p style={{fontSize: '12px', color: '#64748b', marginBottom: '4px'}}>Alibaba Fiyatı ($)</p>
            <input type="number" value={alibabaPriceInput}
              onChange={(e) => setAlibabaPriceInput(e.target.value)}
              placeholder="3.50"
              style={{padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', width: '140px'}} />
          </div>
          <button onClick={handleProfitCalc}
            style={{padding: '10px 20px', background: '#10b981', color: 'white',
              border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer'}}>
            Hesapla
          </button>
        </div>

        {profit && (
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginTop: '16px'}}>
            {[
              {label: 'FBA Ücreti', value: `$${profit.fba_fee}`, color: '#dc2626'},
              {label: 'Net Kar', value: `$${profit.net_profit}`, color: '#16a34a'},
              {label: 'Kar Marjı', value: `%${profit.margin_pct}`, color: '#3b82f6'},
              {label: 'ROI', value: `%${profit.roi_pct}`, color: '#f59e0b'},
            ].map((item) => (
              <div key={item.label} style={{background: '#f8fafc', padding: '12px',
                borderRadius: '8px', textAlign: 'center'}}>
                <p style={{fontSize: '12px', color: '#64748b', marginBottom: '4px'}}>{item.label}</p>
                <p style={{fontSize: '20px', fontWeight: '700', color: item.color}}>{item.value}</p>
              </div>
            ))}
            <div style={{gridColumn: '1/-1', background: '#f0fdf4', padding: '12px',
              borderRadius: '8px', textAlign: 'center'}}>
              <p style={{fontWeight: '700', fontSize: '16px'}}>{profit.verdict}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SourcingPage