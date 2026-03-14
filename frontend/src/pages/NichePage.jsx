import { useState } from 'react'
import { getNicheScore } from '../lib/api'

function NichePage() {
  const [asin, setAsin] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleAnalyze = async () => {
    if (!asin.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await getNicheScore(asin)
      setResult(res.data)
    } catch (err) {
      setError('Analiz sırasında hata oluştu.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 style={{fontSize: '24px', fontWeight: '700', marginBottom: '8px'}}>
        🎯 Niş Skoru Analizi
      </h1>
      <p style={{color: '#64748b', marginBottom: '24px'}}>
        ASIN gir, 100 puanlık niş skoru hesapla.
      </p>

      <div style={{background: 'white', borderRadius: '12px', padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px'}}>
        <div style={{display: 'flex', gap: '12px'}}>
          <input
            type="text"
            value={asin}
            onChange={(e) => setAsin(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
            placeholder="ASIN gir... (örn: B00MFN3UJQ)"
            style={{
              flex: 1, padding: '12px 16px', borderRadius: '8px',
              border: '1px solid #e2e8f0', fontSize: '15px', outline: 'none'
            }}
          />
          <button
            onClick={handleAnalyze}
            disabled={loading}
            style={{
              padding: '12px 24px', background: '#3b82f6', color: 'white',
              border: 'none', borderRadius: '8px', fontSize: '15px',
              fontWeight: '600', cursor: 'pointer'
            }}
          >
            {loading ? 'Analiz ediliyor...' : 'Analiz Et'}
          </button>
        </div>
        {error && <p style={{color: 'red', marginTop: '8px'}}>{error}</p>}
      </div>

      {result && (
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px'}}>
          <div style={{background: 'white', borderRadius: '12px', padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}}>
            <h2 style={{fontSize: '16px', fontWeight: '700', marginBottom: '16px'}}>
              {result.title}
            </h2>
            <p style={{color: '#64748b', fontSize: '14px', marginBottom: '8px'}}>
              ASIN: <strong>{result.asin}</strong>
            </p>
            <p style={{color: '#64748b', fontSize: '14px'}}>
              Fiyat: <strong>${result.price}</strong>
            </p>
          </div>

          <div style={{background: 'white', borderRadius: '12px', padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}}>
            <div style={{
              textAlign: 'center', padding: '20px', borderRadius: '12px', marginBottom: '20px',
              background: result.niche_score.color === 'green' ? '#dcfce7' :
                result.niche_score.color === 'yellow' ? '#fef9c3' :
                result.niche_score.color === 'orange' ? '#ffedd5' : '#fee2e2'
            }}>
              <div style={{fontSize: '48px', fontWeight: '800', color:
                result.niche_score.color === 'green' ? '#16a34a' :
                result.niche_score.color === 'yellow' ? '#ca8a04' :
                result.niche_score.color === 'orange' ? '#ea580c' : '#dc2626'}}>
                {result.niche_score.total_score}
              </div>
              <div style={{fontSize: '14px', color: '#64748b'}}>/ 100</div>
              <div style={{fontSize: '18px', fontWeight: '700', marginTop: '8px'}}>
                {result.niche_score.verdict}
              </div>
              <div style={{fontSize: '14px', color: '#64748b', marginTop: '4px'}}>
                {result.niche_score.recommendation}
              </div>
            </div>

            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
              {[
                {label: '📦 Depolama', value: result.niche_score.details.storage},
                {label: '🚚 Lojistik', value: result.niche_score.details.logistics},
                {label: '⚔️ Rekabet', value: result.niche_score.details.competition},
                {label: '💰 Karlılık', value: result.niche_score.details.profit},
              ].map((item) => (
                <div key={item.label} style={{background: '#f8fafc', padding: '12px', borderRadius: '8px'}}>
                  <p style={{fontSize: '12px', color: '#64748b', marginBottom: '4px'}}>{item.label}</p>
                  <p style={{fontSize: '20px', fontWeight: '700'}}>
                    {item.value}<span style={{fontSize: '12px', color: '#64748b'}}>/25</span>
                  </p>
                </div>
              ))}
            </div>

            <div style={{background: '#f0fdf4', padding: '12px', borderRadius: '8px', marginTop: '12px'}}>
              <p style={{fontSize: '14px', color: '#16a34a', fontWeight: '600'}}>
                💰 Tahmini Kar Marjı: %{result.niche_score.estimated_margin}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default NichePage