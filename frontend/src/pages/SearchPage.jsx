import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchProducts } from '../lib/api'

function SearchPage() {
  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSearch = async () => {
    if (!keyword.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await searchProducts(keyword)
      setResults(res.data.results || [])
    } catch (err) {
      setError('Arama sırasında hata oluştu.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 style={{fontSize: '24px', fontWeight: '700', marginBottom: '24px'}}>
        🔍 Ürün Ara
      </h1>

      <div style={{display: 'flex', gap: '12px', marginBottom: '24px'}}>
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Ürün ara... (örn: yoga mat)"
          style={{
            flex: 1, padding: '12px 16px', borderRadius: '8px',
            border: '1px solid #e2e8f0', fontSize: '15px', outline: 'none'
          }}
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          style={{
            padding: '12px 24px', background: '#3b82f6', color: 'white',
            border: 'none', borderRadius: '8px', fontSize: '15px',
            fontWeight: '600', cursor: 'pointer'
          }}
        >
          {loading ? 'Aranıyor...' : 'Ara'}
        </button>
      </div>

      {error && <p style={{color: 'red', marginBottom: '16px'}}>{error}</p>}

      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px'}}>
        {results.map((product) => (
          <div
            key={product.asin}
            style={{
              background: 'white', borderRadius: '12px', padding: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)', cursor: 'pointer',
              transition: 'transform 0.2s'
            }}
            onClick={() => navigate(`/product/${product.asin}`)}
          >
            <img
              src={product.image}
              alt={product.title}
              style={{width: '100%', height: '160px', objectFit: 'contain', marginBottom: '12px'}}
            />
            <h3 style={{fontSize: '14px', fontWeight: '600', marginBottom: '8px', lineHeight: '1.4'}}>
              {product.title}
            </h3>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <span style={{fontSize: '18px', fontWeight: '700', color: '#3b82f6'}}>
                ${product.price}
              </span>
              <span style={{
                fontSize: '12px', padding: '4px 8px', borderRadius: '20px',
                background: product.in_stock ? '#dcfce7' : '#fee2e2',
                color: product.in_stock ? '#16a34a' : '#dc2626'
              }}>
                {product.in_stock ? '✅ Mevcut' : '❌ Stokta Yok'}
              </span>
            </div>
            <div style={{marginTop: '8px', fontSize: '13px', color: '#64748b'}}>
              ⭐ {product.rating} · {product.reviews} yorum
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default SearchPage