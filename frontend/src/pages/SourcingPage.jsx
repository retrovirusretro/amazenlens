import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'https://amazenlens-production.up.railway.app'

export default function SourcingPage() {
  const { t } = useTranslation()
  const [keyword, setKeyword] = useState('')
  const [amazonPrice, setAmazonPrice] = useState('')
  const [alibabaPriceInput, setAlibabaPriceInput] = useState('')
  const [suppliers, setSuppliers] = useState([])
  const [dhgate, setDhgate] = useState([])
  const [turkish, setTurkish] = useState(null)
  const [arbitrage, setArbitrage] = useState(null)
  const [profit, setProfit] = useState(null)
  const [loading, setLoading] = useState(false)
  const [profitLoading, setProfitLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('alibaba')
  const [searched, setSearched] = useState(false)
  const [mediamarkt, setMediamarkt] = useState(null)
  const [mmMarket, setMmMarket] = useState('DE')
  const [mmLoading, setMmLoading] = useState(false)

  const handleSearch = async () => {
    if (!keyword.trim()) return
    setLoading(true)
    setSearched(true)
    try {
      // Her zaman tedarikçi ara
      const [suppRes, dhgateRes, turkishRes] = await Promise.all([
        axios.get(`${API}/api/sourcing/alibaba?keyword=${encodeURIComponent(keyword)}`),
        axios.get(`${API}/api/sourcing/dhgate?keyword=${encodeURIComponent(keyword)}`),
        axios.get(`${API}/api/sourcing/turkish?keyword=${encodeURIComponent(keyword)}`),
      ])
      setSuppliers(suppRes.data.suppliers || [])
      setDhgate(dhgateRes.data.suppliers || [])
      setTurkish(turkishRes.data)

      // MediaMarkt araması (paralel, hata olursa sessizce geç)
      setMmLoading(true)
      axios.get(`${API}/api/sourcing/mediamarkt?keyword=${encodeURIComponent(keyword)}&market=${mmMarket}`)
        .then(r => setMediamarkt(r.data))
        .catch(() => {})
        .finally(() => setMmLoading(false))

      // Fiyat varsa arbitrajı da çalıştır
      if (amazonPrice) {
        const arbRes = await axios.get(`${API}/api/sourcing/arbitrage?keyword=${encodeURIComponent(keyword)}&amazon_price=${amazonPrice}&include_euro=true`)
        setArbitrage(arbRes.data)
      } else {
        setArbitrage(null)
      }
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

  // Arbitraj için fiyat olmadan da hesapla
  const handleArbitrageWithPrice = async () => {
    if (!keyword || !amazonPrice) return
    setLoading(true)
    try {
      const res = await axios.get(`${API}/api/sourcing/arbitrage?keyword=${encodeURIComponent(keyword)}&amazon_price=${amazonPrice}&include_euro=true`)
      setArbitrage(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { key: 'alibaba', label: `🏭 ${t('sourcing.tab_alibaba')}${searched ? ` (${suppliers.length})` : ''}` },
    { key: 'dhgate', label: `🛒 ${t('sourcing.tab_dhgate')}${searched ? ` (${dhgate.length})` : ''}` },
    { key: 'turkish', label: `🇹🇷 ${t('sourcing.tab_turkish')}${searched ? ` (${turkish?.suppliers?.length || 0})` : ''}` },
    { key: 'mediamarkt', label: `🔴 MediaMarkt${mediamarkt ? ` (${mediamarkt.products?.length || 0})` : ''}` },
    { key: 'arbitrage', label: `🌍 ${t('sourcing.tab_arbitrage')}` },
    { key: 'profit', label: `💰 ${t('sourcing.tab_profit')}` },
  ]

  const EmptyState = ({ icon, title, desc }) => (
    <div style={{ textAlign: 'center', padding: '48px', color: '#8e8e93' }}>
      <div style={{ fontSize: '32px', marginBottom: '12px' }}>{icon}</div>
      <div style={{ fontSize: '14px', fontWeight: '500', color: '#1d1d1f', marginBottom: '6px' }}>{title}</div>
      <div style={{ fontSize: '13px' }}>{desc}</div>
    </div>
  )

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", maxWidth: '960px' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Başlık */}
      <div style={{ marginBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '3px' }}>
          <div style={{ fontSize: '19px', fontWeight: '600', color: '#1d1d1f', letterSpacing: '-0.3px' }}>{t('sourcing.title')}</div>
          {searched && (suppliers[0]?.mock !== false || dhgate[0]?.mock !== false) && (
            <span style={{ background: '#fff3cd', color: '#856404', border: '0.5px solid #ffc107', borderRadius: '6px', fontSize: '11px', fontWeight: '600', padding: '2px 8px' }}>
              Demo Veri
            </span>
          )}
        </div>
        <div style={{ fontSize: '13px', color: '#8e8e93', marginTop: '3px' }}>
          {t('sourcing.subtitle')}
        </div>
      </div>

      {/* Arama */}
      <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '16px 20px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
          <div style={{ flex: 3 }}>
            <div style={{ fontSize: '11px', color: '#8e8e93', marginBottom: '5px', fontWeight: '500' }}>
              {t('sourcing.keyword_label')} <span style={{ color: '#ff3b30' }}>{t('sourcing.keyword_required')}</span>
            </div>
            <input
              type="text"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="örn: yoga mat, silikon spatula, led lamba..."
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '0.5px solid #d2d2d7', fontSize: '13px', fontFamily: 'inherit', color: '#1d1d1f', outline: 'none', background: '#f5f5f7', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ flex: 1.5 }}>
            <div style={{ fontSize: '11px', color: '#8e8e93', marginBottom: '5px', fontWeight: '500' }}>
              {t('sourcing.amazon_price_label')} <span style={{ color: '#8e8e93', fontWeight: '400' }}>{t('sourcing.amazon_price_hint')}</span>
            </div>
            <input
              type="number"
              value={amazonPrice}
              onChange={e => setAmazonPrice(e.target.value)}
              placeholder={t('sourcing.amazon_price_placeholder')}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '0.5px solid #d2d2d7', fontSize: '13px', fontFamily: 'inherit', color: '#1d1d1f', outline: 'none', background: '#f5f5f7', boxSizing: 'border-box' }}
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading || !keyword.trim()}
            style={{ background: keyword.trim() ? '#0071e3' : '#d2d2d7', color: 'white', border: 'none', padding: '9px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: keyword.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit', whiteSpace: 'nowrap', height: '38px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {loading
              ? <div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
              : '🔍'
            }
            {loading ? t('sourcing.searching') : t('sourcing.search_btn')}
          </button>
        </div>
        {loading && (
          <div style={{ marginTop: '10px', fontSize: '11px', color: '#8e8e93', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <span>🏭 Alibaba...</span>
            <span>🛒 DHgate...</span>
            <span>🇹🇷 Türk tedarikçi...</span>
            <span style={{ color: '#e30613' }}>🔴 MediaMarkt...</span>
            {amazonPrice && <span>🌍 Arbitraj...</span>}
          </div>
        )}
      </div>

      {/* Tab'lar */}
      <div style={{ display: 'flex', gap: '4px', background: 'white', borderRadius: '10px', padding: '4px', border: '0.5px solid #e5e5ea', marginBottom: '14px', overflowX: 'auto' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit', background: activeTab === t.key ? '#1d1d1f' : 'transparent', color: activeTab === t.key ? 'white' : '#8e8e93', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ALİBABA */}
      {activeTab === 'alibaba' && (
        <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f', marginBottom: '4px' }}>🏭 {t('sourcing.alibaba_title')}</div>
          <div style={{ fontSize: '11px', color: '#8e8e93', marginBottom: '16px' }}>{t('sourcing.alibaba_subtitle')}</div>
          {!searched
            ? <EmptyState icon="🏭" title={t('sourcing.alibaba_empty_title')} desc={t('sourcing.alibaba_empty_desc')} />
            : suppliers.length === 0
            ? <EmptyState icon="🔍" title={t('sourcing.no_results')} desc={t('sourcing.try_different')} />
            : suppliers.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 0', borderBottom: i < suppliers.length - 1 ? '0.5px solid #f5f5f7' : 'none' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '8px', background: '#fff4e0', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🏭</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: '#1d1d1f', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                  <div style={{ fontSize: '11px', color: '#8e8e93' }}>{s.company} {s.verified && <span style={{ color: '#34c759', marginLeft: '4px' }}>✅ Gold Supplier</span>}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: '#34c759' }}>${s.price_min} – ${s.price_max}</div>
                  <div style={{ fontSize: '11px', color: '#8e8e93' }}>MOQ: {s.moq}</div>
                </div>
                {amazonPrice && (
                  <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '80px' }}>
                    <div style={{ fontSize: '10px', color: '#8e8e93' }}>{t('sourcing.est_profit')}</div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#0071e3' }}>
                      ${(parseFloat(amazonPrice) - parseFloat(s.price_min) - parseFloat(amazonPrice) * 0.15 - 2.5).toFixed(2)}
                    </div>
                  </div>
                )}
                <a href={s.url} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: '12px', padding: '6px 12px', borderRadius: '7px', border: '0.5px solid #d2d2d7', background: 'white', color: '#0071e3', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {t('sourcing.view_on')} Alibaba →
                </a>
              </div>
            ))
          }
        </div>
      )}

      {/* DHGATE */}
      {activeTab === 'dhgate' && (
        <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f', marginBottom: '4px' }}>🛒 {t('sourcing.dhgate_title')}</div>
          <div style={{ fontSize: '11px', color: '#8e8e93', marginBottom: '12px' }}>{t('sourcing.dhgate_subtitle')}</div>
          <div style={{ background: '#e8f0fe', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {['📦 Min. 1 adet', '🚀 ePacket / DHL', '🔒 Escrow güvence', '↩️ 30 gün iade'].map(item => (
              <div key={item} style={{ fontSize: '12px', color: '#0071e3', fontWeight: '500' }}>{item}</div>
            ))}
          </div>
          {!searched
            ? <EmptyState icon="🛒" title={t('sourcing.dhgate_empty_title')} desc={t('sourcing.dhgate_empty_desc')} />
            : dhgate.length === 0
            ? <EmptyState icon="🔍" title={t('sourcing.no_results')} desc={t('sourcing.try_different')} />
            : dhgate.map((s, i) => (
              <div key={i} style={{ padding: '16px', borderRadius: '10px', border: '0.5px solid #e5e5ea', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '8px', background: '#e8f0fe', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🛒</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: '#1d1d1f', marginBottom: '4px' }}>{s.name}</div>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '11px', color: '#ff9f0a' }}>⭐ {s.rating}</span>
                      <span style={{ fontSize: '11px', color: '#8e8e93' }}>{s.sold}</span>
                      <span style={{ fontSize: '11px', color: '#8e8e93' }}>🚚 {s.shipping}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {s.advantages?.map(adv => (
                        <span key={adv} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', background: '#f5f5f7', color: '#3c3c43' }}>{adv}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: '#34c759' }}>${s.price_min} – ${s.price_max}</div>
                    <div style={{ fontSize: '11px', color: '#8e8e93' }}>MOQ: {s.moq}</div>
                    {amazonPrice && (
                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#0071e3', marginTop: '4px' }}>
                        {t('sourcing.est_profit')}: ${(parseFloat(amazonPrice) - parseFloat(s.price_min) - parseFloat(amazonPrice) * 0.15 - 2.5).toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '7px', border: '0.5px solid #d2d2d7', background: 'white', color: '#0071e3', textDecoration: 'none' }}>
                    {t('sourcing.view_on')} DHgate →
                  </a>
                </div>
              </div>
            ))
          }
        </div>
      )}

      {/* TÜRK TEDARİKÇİ */}
      {activeTab === 'turkish' && (
        <div>
          <div style={{ background: '#1d1d1f', borderRadius: '12px', padding: '16px 20px', marginBottom: '12px', color: 'white' }}>
            <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '10px' }}>🇹🇷 {t('sourcing.turkish_advantage_title')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              {[
                { icon: '⚡', title: '2-5 gün teslimat', desc: "Çin'den 30-60 gün beklemek yok" },
                { icon: '✅', title: 'Sıfır gümrük', desc: 'AB-Türkiye Gümrük Birliği avantajı' },
                { icon: '💎', title: 'Premium fiyat', desc: 'Tekstil & deri\'de %20-30 üstünlük' },
                { icon: '📞', title: 'Türkçe iletişim', desc: 'Dil engeli yok, kolay müzakere' },
              ].map(item => (
                <div key={item.title} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '8px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '2px' }}>{item.icon} {item.title}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '20px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f', marginBottom: '4px' }}>🇹🇷 {t('sourcing.turkish_title')}</div>
            {turkish?.category && (
              <div style={{ fontSize: '11px', color: '#0071e3', marginBottom: '16px' }}>
                "{keyword}" → <strong>{turkish.category}</strong> kategorisi
              </div>
            )}
            {!searched
              ? <EmptyState icon="🇹🇷" title={t('sourcing.turkish_empty_title')} desc={t('sourcing.turkish_empty_desc')} />
              : !turkish || turkish.suppliers?.length === 0
              ? <EmptyState icon="🔍" title={t('sourcing.no_results')} desc={t('sourcing.try_different')} />
              : turkish.suppliers.map((s, i) => (
                <div key={i} style={{ padding: '16px', borderRadius: '10px', border: '0.5px solid #e5e5ea', marginBottom: '10px', background: '#fafafa' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '8px', background: '#e8f9ee', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🇹🇷</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f' }}>{s.name}</div>
                        <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', background: '#e8f9ee', color: '#1a7f37', fontWeight: '500' }}>✅ Verified</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#8e8e93', marginBottom: '6px' }}>
                        📍 {s.city} · {s.sector} · 🚚 {s.delivery}
                      </div>
                      {s.certifications?.length > 0 && (
                        <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
                          {s.certifications.map(cert => (
                            <span key={cert} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', background: '#e8f0fe', color: '#0071e3' }}>{cert}</span>
                          ))}
                        </div>
                      )}
                      <div style={{ fontSize: '11px', color: '#34c759', fontWeight: '500' }}>💡 {s.price_advantage}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '15px', fontWeight: '600', color: '#34c759' }}>${s.price_min} – ${s.price_max}</div>
                      <div style={{ fontSize: '11px', color: '#8e8e93' }}>MOQ: {s.moq}</div>
                      {s.price_try && <div style={{ fontSize: '11px', color: '#8e8e93' }}>₺{s.price_try}</div>}
                    </div>
                  </div>
                  <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#8e8e93' }}>📧 {s.contact}</div>
                    <a href={s.url} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '7px', border: '0.5px solid #d2d2d7', background: 'white', color: '#0071e3', textDecoration: 'none' }}>
                      {t('sourcing.contact')} →
                    </a>
                  </div>
                </div>
              ))
            }
            {/* Trendyol bilgi kutusu */}
            <div style={{ marginTop: '14px', padding: '14px 16px', background: '#fff9e6', borderRadius: '10px', border: '0.5px solid #f5d76e' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#b8860b', marginBottom: '4px' }}>🛒 Trendyol Entegrasyonu</div>
              <div style={{ fontSize: '12px', color: '#6b5c00', lineHeight: '1.5' }}>
                Trendyol entegrasyonu için ayrı bir Playwright servisi gerekiyor.
                Şu an Türk tedarikçi verileri gösteriliyor. Trendyol canlı fiyatları yakında!
              </div>
            </div>

            <div style={{ marginTop: '16px', padding: '14px 16px', background: '#f5f5f7', borderRadius: '10px' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#1d1d1f', marginBottom: '10px' }}>📋 {t('sourcing.b2b_platforms')}</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { name: 'KobiVadisi', url: 'https://kobivadisi.com' },
                  { name: 'Altın Sayfalar', url: 'https://www.altinsayfalar.com.tr' },
                  { name: 'İhracatçılar Birliği', url: 'https://www.tim.org.tr' },
                  { name: 'Kolay İhracat', url: 'https://kolayihracat.gov.tr' },
                  { name: 'TOBB', url: 'https://www.tobb.org.tr' },
                ].map(p => (
                  <a key={p.name} href={p.url} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: '12px', padding: '5px 12px', borderRadius: '20px', border: '0.5px solid #d2d2d7', background: 'white', color: '#3c3c43', textDecoration: 'none' }}>
                    {p.name} →
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MEDİAMARKT */}
      {activeTab === 'mediamarkt' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Başlık + pazar seçici */}
          <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f' }}>
                  <span style={{ color: '#e30613' }}>●</span> MediaMarkt Fiyat Araştırması
                </div>
                <div style={{ fontSize: '11px', color: '#8e8e93', marginTop: '2px' }}>
                  8 ülkede MediaMarkt fiyatlarını tara, arbitraj fırsatı bul
                </div>
              </div>
              {mediamarkt?.mock && (
                <span style={{ fontSize: '10px', padding: '3px 10px', borderRadius: '20px', background: '#fff4e0', color: '#c07800', fontWeight: '500', border: '0.5px solid #f0d080' }}>
                  📊 Demo veri
                </span>
              )}
            </div>
            {/* Pazar seçici pills */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {['DE', 'TR', 'NL', 'AT', 'ES', 'IT', 'BE', 'CH'].map(m => (
                <button
                  key={m}
                  onClick={() => {
                    setMmMarket(m)
                    if (keyword.trim()) {
                      setMmLoading(true)
                      axios.get(`${API}/api/sourcing/mediamarkt?keyword=${encodeURIComponent(keyword)}&market=${m}`)
                        .then(r => setMediamarkt(r.data))
                        .catch(() => {})
                        .finally(() => setMmLoading(false))
                    }
                  }}
                  style={{
                    padding: '5px 14px', borderRadius: '20px', border: 'none', fontSize: '12px', fontWeight: '500',
                    cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                    background: mmMarket === m ? '#e30613' : '#f5f5f7',
                    color: mmMarket === m ? 'white' : '#3c3c43'
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Ürün listesi */}
          <div style={{ background: mmLoading ? '#fafafa' : (mediamarkt?.mock ? '#fffdf0' : 'white'), borderRadius: '12px', border: `0.5px solid ${mediamarkt?.mock ? '#f0d080' : '#e5e5ea'}`, padding: '20px' }}>
            {mmLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#8e8e93' }}>
                <div style={{ width: '20px', height: '20px', border: '2px solid #e30613', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }}></div>
                <div style={{ fontSize: '13px' }}>MediaMarkt {mmMarket} aranıyor...</div>
              </div>
            ) : !searched ? (
              <div style={{ textAlign: 'center', padding: '48px', color: '#8e8e93' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔴</div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#1d1d1f', marginBottom: '6px' }}>Arama yapın</div>
                <div style={{ fontSize: '13px' }}>Keyword girerek MediaMarkt fiyatlarını keşfedin</div>
              </div>
            ) : !mediamarkt || mediamarkt.products?.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px', color: '#8e8e93' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔍</div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#1d1d1f', marginBottom: '6px' }}>Sonuç bulunamadı</div>
                <div style={{ fontSize: '13px' }}>Farklı bir keyword deneyin</div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ fontSize: '12px', color: '#8e8e93' }}>
                    {mediamarkt.flag} {mediamarkt.market} · {mediamarkt.products.length} ürün
                  </div>
                  {mediamarkt.mock && (
                    <div style={{ fontSize: '11px', color: '#c07800', background: '#fff4e0', padding: '3px 10px', borderRadius: '20px', border: '0.5px solid #f0d080' }}>
                      📊 Demo veri — ScraperAPI key eklenince gerçek fiyatlar
                    </div>
                  )}
                </div>
                {mediamarkt.products.map((p, i) => {
                  const mmPriceUsd = mediamarkt.currency === 'EUR' ? p.price * 1.08
                    : mediamarkt.currency === 'CHF' ? p.price * 1.10
                    : mediamarkt.currency === 'TRY' ? p.price * 0.031
                    : p.price
                  const priceDiff = amazonPrice ? parseFloat(amazonPrice) - mmPriceUsd : null
                  const arbitragePossible = priceDiff !== null && priceDiff > 5

                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: '14px',
                      padding: '14px 0',
                      borderBottom: i < mediamarkt.products.length - 1 ? '0.5px solid #f5f5f7' : 'none'
                    }}>
                      <div style={{ width: '44px', height: '44px', borderRadius: '8px', background: '#fff0f0', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '700', color: '#e30613' }}>
                        MM
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: '500', color: '#1d1d1f', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.title}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '11px', color: p.availability === 'Limited Stock' ? '#ff9f0a' : '#34c759', fontWeight: '500' }}>
                            {p.availability === 'Limited Stock' ? '⚠️ Sınırlı Stok' : '✅ Stokta'}
                          </span>
                          <span style={{ fontSize: '11px', color: '#8e8e93' }}>{p.flag} {p.market}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '16px', fontWeight: '600', color: '#e30613' }}>
                          {p.price} {p.currency}
                        </div>
                        <div style={{ fontSize: '11px', color: '#8e8e93' }}>
                          ≈ ${mmPriceUsd.toFixed(2)}
                        </div>
                      </div>
                      {arbitragePossible && (
                        <div style={{ flexShrink: 0, background: '#e8f9ee', color: '#1a7f37', fontSize: '11px', fontWeight: '600', padding: '5px 10px', borderRadius: '10px', whiteSpace: 'nowrap' }}>
                          💰 Arbitraj: +${priceDiff.toFixed(2)}
                        </div>
                      )}
                      {p.url ? (
                        <a href={p.url} target="_blank" rel="noopener noreferrer"
                          style={{ fontSize: '12px', padding: '6px 12px', borderRadius: '7px', border: `0.5px solid #e30613`, background: 'white', color: '#e30613', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
                          MediaMarkt'ta Gör →
                        </a>
                      ) : null}
                    </div>
                  )
                })}
              </>
            )}
          </div>
        </div>
      )}

      {/* ARBİTRAJ */}
      {activeTab === 'arbitrage' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Fiyat yoksa input göster */}
          {!amazonPrice && (
            <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '20px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f', marginBottom: '6px' }}>🌍 {t('sourcing.arbitrage_title')}</div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', color: '#8e8e93', marginBottom: '5px' }}>{t('sourcing.amazon_price_label2')}</div>
                  <input type="number" value={amazonPrice} onChange={e => setAmazonPrice(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleArbitrageWithPrice()}
                    placeholder="34.99"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '0.5px solid #d2d2d7', fontSize: '13px', fontFamily: 'inherit', outline: 'none', background: '#f5f5f7', boxSizing: 'border-box' }} />
                </div>
                <button onClick={handleArbitrageWithPrice} disabled={!keyword || !amazonPrice}
                  style={{ background: keyword && amazonPrice ? '#0071e3' : '#d2d2d7', color: 'white', border: 'none', padding: '9px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit', height: '38px' }}>
                  {t('sourcing.calculate')}
                </button>
              </div>
            </div>
          )}

          {!arbitrage
            ? !amazonPrice
              ? null
              : <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea' }}><EmptyState icon="🌍" title={t('sourcing.search_first_title')} desc={t('sourcing.search_first_desc')} /></div>
            : (
              <>
                {arbitrage.best_opportunity?.arbitrage_profit > 0 && (
                  <div style={{ background: '#e8f9ee', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#34c759', marginBottom: '4px' }}>🏆 {t('sourcing.best_opportunity')}</div>
                      <div style={{ fontSize: '15px', fontWeight: '600', color: '#1d1d1f' }}>{arbitrage.best_opportunity.flag} {arbitrage.best_opportunity.platform}</div>
                      <div style={{ fontSize: '12px', color: '#8e8e93', marginTop: '2px' }}>${arbitrage.best_opportunity.price_usd} {t('sourcing.source')} · %{arbitrage.best_opportunity.margin} {t('sourcing.margin')}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '28px', fontWeight: '600', color: '#1a7f37' }}>+${arbitrage.best_opportunity.arbitrage_profit}</div>
                      <div style={{ fontSize: '11px', color: '#8e8e93' }}>{t('sourcing.net_profit_per')}</div>
                    </div>
                  </div>
                )}
                {arbitrage.best_euro_flip?.arbitrage_profit > 0 && (
                  <div style={{ background: '#e8f0fe', borderRadius: '12px', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#0071e3', marginBottom: '4px' }}>🇪🇺 {t('sourcing.best_euro_flip')}</div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#1d1d1f' }}>{arbitrage.best_euro_flip.flag} {arbitrage.best_euro_flip.platform}</div>
                      <div style={{ fontSize: '11px', color: '#8e8e93' }}>VAT {arbitrage.best_euro_flip.vat_rate} {t('sourcing.vat_included')}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '22px', fontWeight: '600', color: '#0071e3' }}>+${arbitrage.best_euro_flip.arbitrage_profit}</div>
                      <div style={{ fontSize: '11px', color: '#8e8e93' }}>%{arbitrage.best_euro_flip.margin} {t('sourcing.margin')}</div>
                    </div>
                  </div>
                )}
                <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', overflow: 'hidden' }}>
                  {arbitrage.results?.filter(r => !['DE','FR','UK','IT','ES','CA','JP'].includes(r.marketplace)).map((r, i, arr) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: i < arr.length - 1 ? '0.5px solid #f5f5f7' : 'none' }}>
                      <div style={{ fontSize: '20px', marginRight: '12px' }}>{r.flag}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: '500', color: '#1d1d1f' }}>{r.platform}</div>
                        <div style={{ fontSize: '11px', color: '#8e8e93' }}>{r.currency === 'TRY' ? `₺${r.price_local}` : `$${r.price_local}`} = ${r.price_usd}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: r.arbitrage_profit > 0 ? '#34c759' : '#ff3b30' }}>{r.arbitrage_profit > 0 ? '+' : ''}${r.arbitrage_profit}</div>
                        <div style={{ fontSize: '10px', color: '#8e8e93' }}>%{r.margin} {t('sourcing.margin')}</div>
                      </div>
                    </div>
                  ))}
                </div>
                {arbitrage.euro_flips?.length > 0 && (
                  <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px', borderBottom: '0.5px solid #f5f5f7', background: '#f5f5f7' }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#0071e3' }}>🇪🇺 {t('sourcing.euro_flips_title')}</div>
                    </div>
                    {arbitrage.euro_flips.map((r, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '0.5px solid #f5f5f7', background: r.arbitrage_profit > 5 ? '#f0fff4' : 'white' }}>
                        <div style={{ fontSize: '20px', marginRight: '12px' }}>{r.flag}</div>
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
              </>
            )
          }
        </div>
      )}

      {/* KAR HESABI */}
      {activeTab === 'profit' && (
        <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f', marginBottom: '16px' }}>💰 {t('sourcing.profit_title')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '12px', alignItems: 'flex-end', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#8e8e93', marginBottom: '5px', fontWeight: '500' }}>{t('sourcing.amazon_price_calc')}</div>
              <input type="number" value={amazonPrice} onChange={e => setAmazonPrice(e.target.value)} placeholder="34.99"
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '0.5px solid #d2d2d7', fontSize: '13px', fontFamily: 'inherit', outline: 'none', background: '#f5f5f7', boxSizing: 'border-box' }} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#8e8e93', marginBottom: '5px', fontWeight: '500' }}>{t('sourcing.alibaba_price_calc')}</div>
              <input type="number" value={alibabaPriceInput} onChange={e => setAlibabaPriceInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleProfitCalc()} placeholder="3.50"
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '0.5px solid #d2d2d7', fontSize: '13px', fontFamily: 'inherit', outline: 'none', background: '#f5f5f7', boxSizing: 'border-box' }} />
            </div>
            <button onClick={handleProfitCalc} disabled={profitLoading || !amazonPrice || !alibabaPriceInput}
              style={{ background: amazonPrice && alibabaPriceInput ? '#0071e3' : '#d2d2d7', color: 'white', border: 'none', padding: '9px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit', height: '38px' }}>
              {t('sourcing.calculate')}
            </button>
          </div>
          {profit ? (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '12px' }}>
                {[
                  { label: t('sourcing.fba_fee'), value: `$${profit.fba_fee}`, color: '#ff3b30', bg: '#fff1f0' },
                  { label: t('sourcing.net_profit'), value: `$${profit.net_profit}`, color: '#34c759', bg: '#e8f9ee' },
                  { label: t('sourcing.profit_margin'), value: `%${profit.margin_pct}`, color: '#0071e3', bg: '#e8f0fe' },
                  { label: t('sourcing.roi'), value: `%${profit.roi_pct}`, color: '#ff9f0a', bg: '#fff4e0' },
                ].map(item => (
                  <div key={item.label} style={{ background: item.bg, padding: '14px', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#8e8e93', marginBottom: '6px' }}>{item.label}</div>
                    <div style={{ fontSize: '20px', fontWeight: '600', color: item.color }}>{item.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: profit.net_profit > 0 ? '#e8f9ee' : '#fff1f0', borderRadius: '10px', padding: '12px 16px', textAlign: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '15px', fontWeight: '600', color: profit.net_profit > 0 ? '#1a7f37' : '#c00' }}>{profit.verdict}</div>
                <div style={{ fontSize: '12px', color: '#8e8e93', marginTop: '4px' }}>{t('sourcing.breakeven')}: ${profit.breakeven_price}</div>
              </div>
              <div style={{ padding: '12px 16px', background: '#f5f5f7', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '12px', color: '#3c3c43' }}>🇪🇺 {t('sourcing.compare_eu')}</div>
                <a href="/calculator" style={{ fontSize: '12px', color: '#0071e3', textDecoration: 'none', fontWeight: '500' }}>{t('sourcing.pan_eu_link')}</a>
              </div>
            </div>
          ) : (
            <EmptyState icon="💰" title={t('sourcing.empty_profit_title')} desc={t('sourcing.empty_profit_desc')} />
          )}
        </div>
      )}
    </div>
  )
}
