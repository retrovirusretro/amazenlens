import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = 'http://127.0.0.1:8000'

const SCORE_COLOR = (s) => s >= 70 ? '#34c759' : s >= 50 ? '#ff9f0a' : '#ff3b30'
const SCORE_BG = (s) => s >= 70 ? '#e8f9ee' : s >= 50 ? '#fff4e0' : '#fff1f0'
const SCORE_TEXT = (s) => s >= 70 ? '#1a7f37' : s >= 50 ? '#b45309' : '#c00'

export default function ProductPage() {
  const { asin } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [niche, setNiche] = useState(null)
  const [suppliers, setSuppliers] = useState([])
  const [arbitrage, setArbitrage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    fetchAll()
  }, [asin])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [prodRes, nicheRes] = await Promise.all([
        axios.get(`${API}/api/amazon/product/${asin}`),
        axios.get(`${API}/api/amazon/niche-score/${asin}`)
      ])
      setProduct(prodRes.data)
      setNiche(nicheRes.data)

      const keyword = prodRes.data?.title?.split(' ').slice(0, 3).join(' ') || asin
      const price = prodRes.data?.price || 30

      const [suppRes, arbRes] = await Promise.all([
        axios.get(`${API}/api/sourcing/alibaba?keyword=${keyword}`),
        axios.get(`${API}/api/sourcing/arbitrage?keyword=${keyword}&amazon_price=${price}`)
      ])
      setSuppliers(suppRes.data.suppliers || [])
      setArbitrage(arbRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'400px',flexDirection:'column',gap:'12px'}}>
      <div style={{width:'32px',height:'32px',border:'2px solid #f0f0f5',borderTop:'2px solid #0071e3',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}></div>
      <div style={{fontSize:'13px',color:'#8e8e93'}}>Ürün analiz ediliyor...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (!product) return (
    <div style={{textAlign:'center',padding:'60px',color:'#8e8e93'}}>
      <div style={{fontSize:'32px',marginBottom:'12px'}}>🔍</div>
      <div style={{fontSize:'15px',fontWeight:'500',color:'#1d1d1f',marginBottom:'6px'}}>Ürün bulunamadı</div>
      <div style={{fontSize:'13px',marginBottom:'20px'}}>ASIN: {asin}</div>
      <button onClick={() => navigate('/search')} style={{background:'#0071e3',color:'white',border:'none',padding:'10px 20px',borderRadius:'8px',fontSize:'13px',fontWeight:'500',cursor:'pointer'}}>
        Aramaya Dön
      </button>
    </div>
  )

  const score = niche?.total_score || 0
  const dims = niche?.dimensions || {}
  const alibabaPriceMin = suppliers[0]?.price_min ? parseFloat(suppliers[0].price_min) : 3.5
  const amazonPrice = product?.price || 0
  const fbaFee = amazonPrice * 0.15 + 2.5
  const netProfit = amazonPrice - alibabaPriceMin - fbaFee
  const margin = amazonPrice > 0 ? ((netProfit / amazonPrice) * 100).toFixed(1) : 0
  const roi = alibabaPriceMin > 0 ? ((netProfit / alibabaPriceMin) * 100).toFixed(0) : 0

  const tabs = ['overview', 'niche', 'sourcing', 'arbitrage']
  const tabLabels = { overview: 'Genel Bakış', niche: 'Niş Skoru', sourcing: 'Tedarik', arbitrage: 'Arbitraj' }

  return (
    <div style={{fontFamily:"'Inter',sans-serif",maxWidth:'960px'}}>
      {/* Geri butonu */}
      <button onClick={() => navigate(-1)} style={{display:'flex',alignItems:'center',gap:'6px',background:'none',border:'none',color:'#0071e3',fontSize:'13px',cursor:'pointer',marginBottom:'16px',padding:'0',fontFamily:'inherit'}}>
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        Arama Sonuçlarına Dön
      </button>

      {/* Ürün Header */}
      <div style={{background:'white',borderRadius:'12px',border:'0.5px solid #e5e5ea',padding:'20px',marginBottom:'12px'}}>
        <div style={{display:'flex',gap:'18px',alignItems:'flex-start'}}>
          {product.image ? (
            <img src={product.image} alt="" style={{width:'90px',height:'90px',borderRadius:'10px',objectFit:'contain',background:'#f5f5f7',flexShrink:0}} />
          ) : (
            <div style={{width:'90px',height:'90px',borderRadius:'10px',background:'linear-gradient(135deg,#0071e3,#34aadc)',flexShrink:0}}></div>
          )}
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:'17px',fontWeight:'600',color:'#1d1d1f',lineHeight:'1.35',marginBottom:'6px',letterSpacing:'-0.3px'}}>
              {product.title || asin}
            </div>
            <div style={{fontSize:'11px',color:'#8e8e93',fontFamily:'monospace',marginBottom:'10px'}}>
              ASIN: {asin} · {product.category || 'Amazon'}
            </div>
            <div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginBottom:'12px'}}>
              {score >= 70 && <span style={{fontSize:'11px',padding:'3px 9px',borderRadius:'4px',background:'#e8f9ee',color:'#1a7f37',fontWeight:'500'}}>✅ Karlı</span>}
              {product.is_new && <span style={{fontSize:'11px',padding:'3px 9px',borderRadius:'4px',background:'#e8f0fe',color:'#0071e3',fontWeight:'500'}}>Yeni</span>}
              {niche?.flags?.big_brand && <span style={{fontSize:'11px',padding:'3px 9px',borderRadius:'4px',background:'#fff1f0',color:'#c00',fontWeight:'500'}}>🚩 Big Brand</span>}
              {niche?.flags?.seasonal && <span style={{fontSize:'11px',padding:'3px 9px',borderRadius:'4px',background:'#fff1f0',color:'#c00',fontWeight:'500'}}>🚩 Sezonluk</span>}
              {niche?.flags?.low_development && <span style={{fontSize:'11px',padding:'3px 9px',borderRadius:'4px',background:'#fff1f0',color:'#c00',fontWeight:'500'}}>🚩 Low Dev</span>}
            </div>
            <div style={{display:'flex',gap:'8px'}}>
              {[
                {label:'🇺🇸 Amazon', url:`https://amazon.com/dp/${asin}`},
                {label:'🇹🇷 Trendyol', url:`https://trendyol.com/search?q=${product.title?.split(' ').slice(0,3).join('+')}`},
                {label:'🏭 Alibaba', url:`https://alibaba.com/trade/search?SearchText=${product.title?.split(' ').slice(0,3).join('+')}`},
                {label:'🛒 eBay', url:`https://ebay.com/sch/i.html?_nkw=${product.title?.split(' ').slice(0,3).join('+')}` },
              ].map(l => (
                <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer"
                  style={{fontSize:'11px',padding:'4px 10px',borderRadius:'6px',border:'0.5px solid #d2d2d7',background:'white',color:'#3c3c43',textDecoration:'none',whiteSpace:'nowrap'}}>
                  {l.label}
                </a>
              ))}
            </div>
          </div>
          <div style={{textAlign:'right',flexShrink:0}}>
            <div style={{fontSize:'26px',fontWeight:'600',color:'#1d1d1f',letterSpacing:'-0.5px'}}>${amazonPrice}</div>
            <div style={{fontSize:'11px',color:'#8e8e93',marginTop:'2px'}}>Amazon fiyatı</div>
            {margin > 0 && <div style={{fontSize:'13px',color:'#34c759',marginTop:'8px',fontWeight:'500'}}>+%{margin} marj</div>}
            <div style={{display:'flex',alignItems:'center',gap:'6px',justifyContent:'flex-end',marginTop:'10px'}}>
              <div style={{width:'40px',height:'40px',borderRadius:'50%',background:SCORE_BG(score),display:'flex',alignItems:'center',justifyContent:'center',fontSize:'13px',fontWeight:'600',color:SCORE_TEXT(score)}}>
                {score}
              </div>
              <div style={{fontSize:'11px',color:'#8e8e93'}}>Niş<br/>Skoru</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:'4px',marginBottom:'12px',background:'white',borderRadius:'10px',padding:'4px',border:'0.5px solid #e5e5ea'}}>
        {tabs.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            style={{flex:1,padding:'8px',border:'none',borderRadius:'8px',fontSize:'12.5px',fontWeight:'500',cursor:'pointer',fontFamily:'inherit',
              background: activeTab === t ? '#1d1d1f' : 'transparent',
              color: activeTab === t ? 'white' : '#8e8e93',
              transition:'all 0.15s'}}>
            {tabLabels[t]}
          </button>
        ))}
      </div>

      {/* Tab: Genel Bakış */}
      {activeTab === 'overview' && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
          <div style={{background:'white',borderRadius:'12px',border:'0.5px solid #e5e5ea',padding:'16px'}}>
            <div style={{fontSize:'13px',fontWeight:'600',color:'#1d1d1f',marginBottom:'14px'}}>Ürün Metrikleri</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
              {[
                {l:'BSR', v: product.bestseller_rank ? `#${product.bestseller_rank.toLocaleString()}` : '-'},
                {l:'Yorum', v: product.reviews_count?.toLocaleString() || '-'},
                {l:'Puan', v: product.rating ? `${product.rating} ⭐` : '-'},
                {l:'Satıcı', v: product.sellers_count || '-'},
                {l:'FBA Ücreti', v: `$${fbaFee.toFixed(2)}`},
                {l:'Net Kar', v: `$${netProfit.toFixed(2)}`},
              ].map(item => (
                <div key={item.l} style={{background:'#f5f5f7',borderRadius:'8px',padding:'10px 12px'}}>
                  <div style={{fontSize:'10px',color:'#8e8e93',marginBottom:'4px'}}>{item.l}</div>
                  <div style={{fontSize:'15px',fontWeight:'600',color:'#1d1d1f'}}>{item.v}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{background:'white',borderRadius:'12px',border:'0.5px solid #e5e5ea',padding:'16px'}}>
            <div style={{fontSize:'13px',fontWeight:'600',color:'#1d1d1f',marginBottom:'14px'}}>Kar Analizi</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'12px'}}>
              {[
                {l:'Satış Fiyatı', v:`$${amazonPrice}`, c:'#1d1d1f'},
                {l:'Alibaba Maliyeti', v:`$${alibabaPriceMin}`, c:'#ff3b30'},
                {l:'FBA Ücreti', v:`$${fbaFee.toFixed(2)}`, c:'#ff9f0a'},
                {l:'Net Kar', v:`$${netProfit.toFixed(2)}`, c:'#34c759'},
              ].map(item => (
                <div key={item.l} style={{background:'#f5f5f7',borderRadius:'8px',padding:'10px 12px',textAlign:'center'}}>
                  <div style={{fontSize:'10px',color:'#8e8e93',marginBottom:'4px'}}>{item.l}</div>
                  <div style={{fontSize:'16px',fontWeight:'600',color:item.c}}>{item.v}</div>
                </div>
              ))}
            </div>
            <div style={{background: netProfit > 0 ? '#e8f9ee' : '#fff1f0',borderRadius:'8px',padding:'12px 14px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div>
                <div style={{fontSize:'13px',fontWeight:'600',color: netProfit > 0 ? '#1a7f37' : '#c00'}}>
                  {netProfit > 0 ? '✅ Karlı Ürün' : '❌ Zararlı Ürün'}
                </div>
                <div style={{fontSize:'11px',color: netProfit > 0 ? '#34c759' : '#ff3b30',marginTop:'2px'}}>ROI: %{roi}</div>
              </div>
              <div style={{fontSize:'24px',fontWeight:'600',color: netProfit > 0 ? '#1a7f37' : '#c00'}}>%{margin}</div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Niş Skoru */}
      {activeTab === 'niche' && (
        <div style={{background:'white',borderRadius:'12px',border:'0.5px solid #e5e5ea',padding:'20px'}}>
          <div style={{display:'flex',alignItems:'center',gap:'24px',marginBottom:'24px',paddingBottom:'20px',borderBottom:'0.5px solid #f5f5f7'}}>
            <div style={{position:'relative',width:'100px',height:'100px',flexShrink:0}}>
              <svg viewBox="0 0 100 100" style={{transform:'rotate(-90deg)',width:'100px',height:'100px'}}>
                <circle cx="50" cy="50" r="42" fill="none" stroke="#f0f0f5" strokeWidth="8"/>
                <circle cx="50" cy="50" r="42" fill="none" stroke={SCORE_COLOR(score)} strokeWidth="8"
                  strokeDasharray={`${(score/100)*263.9} 263.9`} strokeLinecap="round"/>
              </svg>
              <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
                <div style={{fontSize:'24px',fontWeight:'600',color:'#1d1d1f',letterSpacing:'-0.5px'}}>{score}</div>
                <div style={{fontSize:'11px',color:'#8e8e93'}}>/100</div>
              </div>
            </div>
            <div>
              <div style={{fontSize:'16px',fontWeight:'600',color:'#1d1d1f',marginBottom:'6px'}}>
                {score >= 90 ? '🟢 Mükemmel — Hemen gir' : score >= 70 ? '🟡 İyi — Araştır' : score >= 50 ? '🟠 Orta — Dikkatli ol' : '🔴 Zayıf — Kaçın'}
              </div>
              <div style={{fontSize:'13px',color:'#8e8e93',lineHeight:'1.6'}}>
                {niche?.ai_comment || 'Bu ürün analiz edildi. Tüm boyutları inceleyerek karar verin.'}
              </div>
            </div>
          </div>
          {[
            {key:'volume', label:'Hacim & Depolama', max:25, color:'#0071e3', desc:'Ürün boyutu, BSR bazlı depolama riski'},
            {key:'logistics', label:'Lojistik', max:25, color:'#34c759', desc:'Ağırlık, FBA uygunluğu, kırılganlık'},
            {key:'competition', label:'Rekabet', max:25, color:'#ff9f0a', desc:'Rakip sayısı, review sayısı, marka riski'},
            {key:'profitability', label:'Karlılık', max:25, color:'#af52de', desc:'Fiyat aralığı, kar marjı, fiyat rekabeti'},
          ].map(dim => {
            const val = dims[dim.key] || 0
            const pct = (val / dim.max) * 100
            return (
              <div key={dim.key} style={{marginBottom:'18px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
                  <div>
                    <div style={{fontSize:'13px',fontWeight:'500',color:'#1d1d1f'}}>{dim.label}</div>
                    <div style={{fontSize:'11px',color:'#8e8e93',marginTop:'2px'}}>{dim.desc}</div>
                  </div>
                  <div style={{fontSize:'15px',fontWeight:'600',color:dim.color}}>{val}/{dim.max}</div>
                </div>
                <div style={{height:'6px',background:'#f0f0f5',borderRadius:'3px'}}>
                  <div style={{height:'100%',borderRadius:'3px',background:dim.color,width:`${pct}%`,transition:'width 0.5s'}}></div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Tab: Tedarik */}
      {activeTab === 'sourcing' && (
        <div style={{background:'white',borderRadius:'12px',border:'0.5px solid #e5e5ea',padding:'20px'}}>
          <div style={{fontSize:'13px',fontWeight:'600',color:'#1d1d1f',marginBottom:'16px'}}>🏭 Alibaba Tedarikçiler</div>
          {suppliers.length === 0 ? (
            <div style={{textAlign:'center',padding:'40px',color:'#8e8e93'}}>Tedarikçi bulunamadı</div>
          ) : suppliers.map((s, i) => (
            <div key={i} style={{display:'flex',alignItems:'center',gap:'14px',padding:'14px 0',borderBottom:'0.5px solid #f5f5f7'}}>
              <div style={{width:'44px',height:'44px',borderRadius:'8px',background:'#f5f5f7',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px'}}>🏭</div>
              <div style={{flex:1}}>
                <div style={{fontSize:'13px',fontWeight:'500',color:'#1d1d1f',marginBottom:'3px'}}>{s.name}</div>
                <div style={{fontSize:'11px',color:'#8e8e93'}}>{s.company} {s.verified ? '· ✅ Verified' : ''}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:'15px',fontWeight:'600',color:'#34c759'}}>${s.price_min}–${s.price_max}</div>
                <div style={{fontSize:'11px',color:'#8e8e93'}}>MOQ: {s.moq}</div>
              </div>
              <a href={s.url} target="_blank" rel="noopener noreferrer"
                style={{fontSize:'12px',padding:'6px 12px',borderRadius:'7px',border:'0.5px solid #d2d2d7',background:'white',color:'#0071e3',textDecoration:'none',whiteSpace:'nowrap'}}>
                Alibaba'da Gör →
              </a>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Arbitraj */}
      {activeTab === 'arbitrage' && arbitrage && (
        <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
          {arbitrage.best_opportunity && (
            <div style={{background:'#e8f9ee',borderRadius:'12px',padding:'16px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div>
                <div style={{fontSize:'12px',fontWeight:'600',color:'#34c759',marginBottom:'4px'}}>🏆 En İyi Fırsat</div>
                <div style={{fontSize:'15px',fontWeight:'600',color:'#1d1d1f'}}>{arbitrage.best_opportunity.flag} {arbitrage.best_opportunity.platform}</div>
                <div style={{fontSize:'12px',color:'#8e8e93',marginTop:'2px'}}>${arbitrage.best_opportunity.price_usd} kaynak fiyatı</div>
              </div>
              <div style={{fontSize:'28px',fontWeight:'600',color:'#1a7f37'}}>+${arbitrage.best_opportunity.arbitrage_profit}</div>
            </div>
          )}
          <div style={{background:'white',borderRadius:'12px',border:'0.5px solid #e5e5ea',padding:'20px'}}>
            <div style={{fontSize:'13px',fontWeight:'600',color:'#1d1d1f',marginBottom:'16px'}}>🌍 Tüm Platformlar</div>
            {arbitrage.results?.map((r, i) => (
              <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 0',borderBottom:'0.5px solid #f5f5f7'}}>
                <div style={{fontSize:'14px',fontWeight:'500',color:'#1d1d1f'}}>{r.flag} {r.platform}</div>
                <div style={{fontSize:'13px',color:'#8e8e93'}}>{r.currency === 'TRY' ? `₺${r.price_local}` : `$${r.price_local}`} = ${r.price_usd}</div>
                <div style={{fontSize:'14px',fontWeight:'600',color: r.arbitrage_profit > 0 ? '#34c759' : '#ff3b30'}}>
                  {r.arbitrage_profit > 0 ? '+' : ''}${r.arbitrage_profit}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}