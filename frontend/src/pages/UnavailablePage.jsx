import { useState } from 'react'
import { scanUnavailable } from '../lib/api'

function UnavailablePage() {
  const [asinInput, setAsinInput] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleScan = async () => {
    const asins = asinInput.split('\n').map(a => a.trim()).filter(a => a)
    if (asins.length === 0) return
    setLoading(true)
    try {
      const res = await scanUnavailable(asins)
      setResults(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 style={{fontSize: '24px', fontWeight: '700', marginBottom: '8px'}}>
        🚫 Unavailable Scanner
      </h1>
      <p style={{color: '#64748b', marginBottom: '24px'}}>
        ASIN listesi gir, hangilerinin stokta olmadığını bul. Maksimum 100 ASIN.
      </p>

      <div style={{background: 'white', borderRadius: '12px', padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px'}}>
        <textarea
          value={asinInput}
          onChange={(e) => setAsinInput(e.target.value)}
          placeholder="Her satıra bir ASIN gir:&#10;B00MFN3UJQ&#10;B001ESL09U&#10;B00MOCK003"
          style={{
            width: '100%', height: '200px', padding: '12px', borderRadius: '8px',
            border: '1px solid #e2e8f0', fontSize: '14px', fontFamily: 'monospace',
            resize: 'vertical', outline: 'none'
          }}
        />
        <button
          onClick={handleScan}
          disabled={loading}
          style={{
            marginTop: '12px', padding: '12px 24px', background: '#3b82f6',
            color: 'white', border: 'none', borderRadius: '8px',
            fontSize: '15px', fontWeight: '600', cursor: 'pointer'
          }}
        >
          {loading ? 'Taranıyor...' : '🔍 Tara'}
        </button>
      </div>

      {results && (
        <div>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px'}}>
            <div style={{background: 'white', padding: '20px', borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}}>
              <p style={{color: '#64748b', fontSize: '14px'}}>Toplam</p>
              <h2 style={{fontSize: '28px', fontWeight: '700'}}>{results.total}</h2>
            </div>
            <div style={{background: '#fee2e2', padding: '20px', borderRadius: '12px'}}>
              <p style={{color: '#dc2626', fontSize: '14px'}}>Stokta Yok</p>
              <h2 style={{fontSize: '28px', fontWeight: '700', color: '#dc2626'}}>
                {results.unavailable_count}
              </h2>
            </div>
            <div style={{background: '#dcfce7', padding: '20px', borderRadius: '12px'}}>
              <p style={{color: '#16a34a', fontSize: '14px'}}>Mevcut</p>
              <h2 style={{fontSize: '28px', fontWeight: '700', color: '#16a34a'}}>
                {results.available_count}
              </h2>
            </div>
          </div>

          {results.unavailable.length > 0 && (
            <div style={{background: 'white', borderRadius: '12px', padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}}>
              <h3 style={{marginBottom: '16px', color: '#dc2626'}}>❌ Stokta Olmayan Ürünler</h3>
              {results.unavailable.map((item) => (
                <div key={item.asin} style={{
                  padding: '12px', borderRadius: '8px', background: '#fee2e2',
                  marginBottom: '8px', display: 'flex', justifyContent: 'space-between'
                }}>
                  <span style={{fontFamily: 'monospace', fontWeight: '600'}}>{item.asin}</span>
                  <span style={{color: '#dc2626', fontSize: '14px'}}>Stokta Yok</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default UnavailablePage