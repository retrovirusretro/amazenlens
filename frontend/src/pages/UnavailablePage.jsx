import { useState } from 'react'
import { scanUnavailable, searchProducts } from '../lib/api'
import axios from 'axios'

const API = ''

const CATEGORIES = [
  'Home & Kitchen', 'Sports & Outdoors', 'Electronics', 'Baby',
  'Pet Supplies', 'Patio, Lawn & Garden', 'Health & Household',
  'Arts, Crafts & Sewing', 'Automotive', 'Clothing, Shoes & Jewelry',
  'Toys & Games', 'Tools & Home Improvement', 'Grocery & Gourmet Food',
  'Office Products', 'Musical Instruments', 'Industrial & Scientific',
]

export default function UnavailablePage() {
  const [tab, setTab] = useState('asin')

  // ASIN tab
  const [asinInput, setAsinInput] = useState('')
  const [asinResults, setAsinResults] = useState(null)
  const [asinLoading, setAsinLoading] = useState(false)

  // Keyword tab
  const [keyword, setKeyword] = useState('')
  const [kwResults, setKwResults] = useState(null)
  const [kwLoading, setKwLoading] = useState(false)

  // Kategori tab
  const [selectedCat, setSelectedCat] = useState('')
  const [catResults, setCatResults] = useState(null)
  const [catLoading, setCatLoading] = useState(false)

  // ASIN Tara
  const handleAsinScan = async () => {
    const asins = asinInput.split('\n').map(a => a.trim()).filter(a => a)
    if (asins.length === 0) return
    setAsinLoading(true)
    try {
      const res = await scanUnavailable(asins)
      setAsinResults(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setAsinLoading(false)
    }
  }

  // Keyword ile ara → stokta olmayanları filtrele
  const handleKeywordScan = async () => {
    if (!keyword.trim()) return
    setKwLoading(true)
    setKwResults(null)
    try {
      const res = await searchProducts(keyword)
      const products = res.data.results || []
      const unavailable = products.filter(p => p.in_stock === false)
      const available = products.filter(p => p.in_stock !== false)
      setKwResults({
        total: products.length,
        unavailable_count: unavailable.length,
        available_count: available.length,
        unavailable,
        available,
        keyword
      })
    } catch (err) {
      console.error(err)
    } finally {
      setKwLoading(false)
    }
  }

  // Kategori ile tara
  const handleCatScan = async () => {
    if (!selectedCat) return
    setCatLoading(true)
    setCatResults(null)
    try {
      const res = await searchProducts(selectedCat)
      const products = res.data.results || []
      const unavailable = products.filter(p => p.in_stock === false)
      const available = products.filter(p => p.in_stock !== false)
      setCatResults({
        total: products.length,
        unavailable_count: unavailable.length,
        available_count: available.length,
        unavailable,
        available,
        category: selectedCat
      })
    } catch (err) {
      console.error(err)
    } finally {
      setCatLoading(false)
    }
  }

  const TABS = [
    { key: 'asin', label: 'ASIN Listesi' },
    { key: 'keyword', label: 'Keyword Tarama' },
    { key: 'category', label: 'Kategori Tarama' },
  ]

  const ResultCards = ({ data }) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
      {[
        { label: 'Toplam Ürün', value: data.total, color: '#1d1d1f', bg: 'white', border: '#e5e5ea' },
        { label: 'Stokta Yok', value: data.unavailable_count, color: '#ff3b30', bg: '#fff1f0', border: '#ffd0ce' },
        { label: 'Mevcut', value: data.available_count, color: '#34c759', bg: '#e8f9ee', border: '#b7f0c8' },
      ].map(item => (
        <div key={item.label} style={{
          background: item.bg, borderRadius: '10px', padding: '16px',
          border: `0.5px solid ${item.border}`, textAlign: 'center'
        }}>
          <div style={{ fontSize: '11px', color: item.color === '#1d1d1f' ? '#8e8e93' : item.color, marginBottom: '6px', fontWeight: '500' }}>
            {item.label}
          </div>
          <div style={{ fontSize: '28px', fontWeight: '600', color: item.color, letterSpacing: '-0.5px' }}>
            {item.value}
          </div>
        </div>
      ))}
    </div>
  )

  const UnavailableList = ({ items }) => (
    items.length === 0 ? (
      <div style={{ textAlign: 'center', padding: '32px', color: '#8e8e93', fontSize: '13px' }}>
        ✅ Tüm ürünler stokta mevcut!
      </div>
    ) : (
      <div>
        <div style={{ fontSize: '13px', fontWeight: '600', color: '#ff3b30', marginBottom: '10px' }}>
          ❌ Stokta Olmayan Ürünler ({items.length})
        </div>
        {items.map((item, i) => (
          <div key={item.asin || i} style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '10px 14px', borderRadius: '8px', background: '#fff1f0',
            border: '0.5px solid #ffd0ce', marginBottom: '6px'
          }}>
            {item.image && (
              <img src={item.image} alt="" style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'contain', background: 'white' }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              {item.title ? (
                <div style={{ fontSize: '13px', fontWeight: '500', color: '#1d1d1f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.title}
                </div>
              ) : null}
              <div style={{ fontSize: '11px', color: '#8e8e93', fontFamily: 'monospace', marginTop: '2px' }}>
                {item.asin}
              </div>
            </div>
            {item.price && (
              <div style={{ fontSize: '13px', fontWeight: '500', color: '#1d1d1f', flexShrink: 0 }}>
                ${item.price}
              </div>
            )}
            <div style={{ fontSize: '11px', fontWeight: '600', color: '#ff3b30', flexShrink: 0 }}>
              Stokta Yok
            </div>
            <a href={`https://amazon.com/dp/${item.asin}`} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '6px', border: '0.5px solid #d2d2d7', background: 'white', color: '#0071e3', textDecoration: 'none', flexShrink: 0 }}>
              Amazon →
            </a>
          </div>
        ))}
      </div>
    )
  )

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", maxWidth: '900px' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{ marginBottom: '18px' }}>
        <div style={{ fontSize: '19px', fontWeight: '600', color: '#1d1d1f', letterSpacing: '-0.3px' }}>
          Unavailable Scanner
        </div>
        <div style={{ fontSize: '13px', color: '#8e8e93', marginTop: '3px' }}>
          Stokta olmayan ürünleri 3 farklı yöntemle tespit et
        </div>
      </div>

      {/* Tab'lar */}
      <div style={{
        display: 'flex', gap: '4px', background: 'white',
        borderRadius: '10px', padding: '4px', border: '0.5px solid #e5e5ea', marginBottom: '16px'
      }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex: 1, padding: '8px', border: 'none', borderRadius: '8px',
            fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit',
            background: tab === t.key ? '#1d1d1f' : 'transparent',
            color: tab === t.key ? 'white' : '#8e8e93',
            transition: 'all 0.15s'
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Sekme 1: ASIN Listesi */}
      {tab === 'asin' && (
        <div>
          <div style={{ background: 'white', borderRadius: '11px', border: '0.5px solid #e5e5ea', padding: '20px', marginBottom: '14px' }}>
            <div style={{ fontSize: '13px', fontWeight: '500', color: '#1d1d1f', marginBottom: '10px' }}>
              ASIN listesi gir (her satıra bir tane, max 100)
            </div>
            <textarea
              value={asinInput}
              onChange={(e) => setAsinInput(e.target.value)}
              placeholder={'B00MFN3UJQ\nB001ESL09U\nB00MOCK003'}
              style={{
                width: '100%', height: '180px', padding: '10px 12px', borderRadius: '8px',
                border: '0.5px solid #d2d2d7', fontSize: '13px', fontFamily: 'monospace',
                resize: 'vertical', outline: 'none', color: '#1d1d1f', boxSizing: 'border-box'
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
              <div style={{ fontSize: '12px', color: '#8e8e93' }}>
                {asinInput.split('\n').filter(a => a.trim()).length} ASIN girildi
              </div>
              <button onClick={handleAsinScan} disabled={asinLoading} style={{
                background: '#0071e3', color: 'white', border: 'none',
                padding: '9px 20px', borderRadius: '8px', fontSize: '13px',
                fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}>
                {asinLoading ? (
                  <>
                    <div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
                    Taranıyor...
                  </>
                ) : '🔍 Tara'}
              </button>
            </div>
          </div>
          {asinResults && (
            <div style={{ background: 'white', borderRadius: '11px', border: '0.5px solid #e5e5ea', padding: '20px' }}>
              <ResultCards data={asinResults} />
              <UnavailableList items={asinResults.unavailable || []} />
            </div>
          )}
        </div>
      )}

      {/* Sekme 2: Keyword */}
      {tab === 'keyword' && (
        <div>
          <div style={{ background: 'white', borderRadius: '11px', border: '0.5px solid #e5e5ea', padding: '20px', marginBottom: '14px' }}>
            <div style={{ fontSize: '13px', fontWeight: '500', color: '#1d1d1f', marginBottom: '10px' }}>
              Keyword gir — o keyword'deki stokta olmayan ürünleri listeler
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleKeywordScan()}
                placeholder="örn: yoga mat, silikon spatula, led lamba..."
                style={{
                  flex: 1, padding: '9px 14px', borderRadius: '8px',
                  border: '0.5px solid #d2d2d7', fontSize: '13px',
                  fontFamily: 'inherit', color: '#1d1d1f', outline: 'none', background: '#f5f5f7'
                }}
              />
              <button onClick={handleKeywordScan} disabled={kwLoading} style={{
                background: '#0071e3', color: 'white', border: 'none',
                padding: '9px 20px', borderRadius: '8px', fontSize: '13px',
                fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap'
              }}>
                {kwLoading ? (
                  <>
                    <div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
                    Taranıyor...
                  </>
                ) : '🔍 Tara'}
              </button>
            </div>
            <div style={{ fontSize: '12px', color: '#8e8e93', marginTop: '8px' }}>
              💡 Amazon'da o keyword için çıkan ürünler arasında stokta olmayanlar listelenir. Fırsat ürünleri için idealdir.
            </div>
          </div>
          {kwResults && (
            <div style={{ background: 'white', borderRadius: '11px', border: '0.5px solid #e5e5ea', padding: '20px' }}>
              <div style={{ fontSize: '12px', color: '#8e8e93', marginBottom: '12px' }}>
                "{kwResults.keyword}" araması — {kwResults.total} ürün tarandı
              </div>
              <ResultCards data={kwResults} />
              <UnavailableList items={kwResults.unavailable || []} />
              {kwResults.unavailable_count === 0 && kwResults.available_count > 0 && (
                <div style={{ marginTop: '12px', padding: '12px 14px', background: '#f5f5f7', borderRadius: '8px' }}>
                  <div style={{ fontSize: '12px', color: '#8e8e93' }}>
                    Bu keyword'de tüm ürünler mevcut. Daha iyi fırsatlar için farklı keyword deneyin.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Sekme 3: Kategori */}
      {tab === 'category' && (
        <div>
          <div style={{ background: 'white', borderRadius: '11px', border: '0.5px solid #e5e5ea', padding: '20px', marginBottom: '14px' }}>
            <div style={{ fontSize: '13px', fontWeight: '500', color: '#1d1d1f', marginBottom: '12px' }}>
              Kategori seç — o kategorideki stokta olmayan ürünleri listeler
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
              {CATEGORIES.map(cat => (
                <div key={cat} onClick={() => setSelectedCat(cat)} style={{
                  fontSize: '12px', padding: '5px 12px', borderRadius: '20px',
                  border: `0.5px solid ${selectedCat === cat ? '#1d1d1f' : '#d2d2d7'}`,
                  background: selectedCat === cat ? '#1d1d1f' : 'white',
                  color: selectedCat === cat ? 'white' : '#3c3c43',
                  cursor: 'pointer', whiteSpace: 'nowrap'
                }}>
                  {cat}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '12px', color: selectedCat ? '#0071e3' : '#8e8e93' }}>
                {selectedCat ? `Seçili: ${selectedCat}` : 'Kategori seçilmedi'}
              </div>
              <button onClick={handleCatScan} disabled={catLoading || !selectedCat} style={{
                background: selectedCat ? '#0071e3' : '#d2d2d7', color: 'white', border: 'none',
                padding: '9px 20px', borderRadius: '8px', fontSize: '13px',
                fontWeight: '500', cursor: selectedCat ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}>
                {catLoading ? (
                  <>
                    <div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
                    Taranıyor...
                  </>
                ) : '🔍 Tara'}
              </button>
            </div>
            <div style={{ fontSize: '12px', color: '#8e8e93', marginTop: '8px' }}>
              💡 Seçilen kategoride Amazon'da stokta olmayan ürünler listelenir. Rakip boşluklarını tespit etmek için harika!
            </div>
          </div>
          {catResults && (
            <div style={{ background: 'white', borderRadius: '11px', border: '0.5px solid #e5e5ea', padding: '20px' }}>
              <div style={{ fontSize: '12px', color: '#8e8e93', marginBottom: '12px' }}>
                "{catResults.category}" kategorisi — {catResults.total} ürün tarandı
              </div>
              <ResultCards data={catResults} />
              <UnavailableList items={catResults.unavailable || []} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
