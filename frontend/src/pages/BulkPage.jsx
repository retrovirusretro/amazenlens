import { useState } from 'react'
import axios from 'axios'

const API = ''

function BulkPage() {
  const [file, setFile] = useState(null)
  const [asins, setAsins] = useState([])
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)
  const [message, setMessage] = useState('')

  const handleFileUpload = async (e) => {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    setLoading(true)
    setMessage('')

    const formData = new FormData()
    formData.append('file', f)

    try {
      const res = await axios.post(`${API}/api/bulk/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setAsins(res.data.asins)
      setMessage(res.data.message)
      setStep(2)
    } catch (err) {
      setMessage(err.response?.data?.detail || 'Dosya yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  const handleProcess = async () => {
    setLoading(true)
    try {
      const res = await axios.post(`${API}/api/bulk/process`, { asins })
      setResults(res.data)
      setStep(3)
    } catch (err) {
      setMessage('İşlem hatası')
    } finally {
      setLoading(false)
    }
  }

  const downloadTemplate = () => {
    const csv = 'ASIN\nB07YX93GFC\nB08N5WRWNW\nB09G9FPHY6'
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'amazenlens_template.csv'
    a.click()
  }

  return (
    <div>
      <h1 style={{fontSize: '24px', fontWeight: '700', marginBottom: '8px'}}>
        📦 Toplu ASIN Import
      </h1>
      <p style={{color: '#64748b', marginBottom: '24px', fontSize: '14px'}}>
        Excel veya CSV ile 100'e kadar ASIN toplu analiz et
      </p>

      {/* Adımlar */}
      <div style={{display: 'flex', gap: '8px', marginBottom: '24px'}}>
        {['Dosya Yükle', 'ASIN\'leri Onayla', 'Sonuçlar'].map((s, i) => (
          <div key={i} style={{
            flex: 1, padding: '12px', textAlign: 'center', borderRadius: '8px',
            background: step === i+1 ? '#3b82f6' : step > i+1 ? '#dcfce7' : '#f1f5f9',
            color: step === i+1 ? 'white' : step > i+1 ? '#16a34a' : '#64748b',
            fontWeight: '600', fontSize: '14px'
          }}>
            {step > i+1 ? '✅' : i+1} {s}
          </div>
        ))}
      </div>

      {/* Adım 1 */}
      {step === 1 && (
        <div style={{background: 'white', borderRadius: '12px', padding: '32px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)', textAlign: 'center'}}>
          <p style={{fontSize: '48px', marginBottom: '16px'}}>📂</p>
          <p style={{fontWeight: '600', marginBottom: '8px'}}>CSV veya Excel dosyası yükle</p>
          <p style={{color: '#64748b', fontSize: '14px', marginBottom: '24px'}}>
            Dosyanda "ASIN" başlıklı kolon olmalı. Maksimum 100 ASIN.
          </p>
          <input type="file" accept=".csv,.xlsx,.xls"
            onChange={handleFileUpload}
            style={{marginBottom: '16px', display: 'block', margin: '0 auto 16px'}} />
          <button onClick={downloadTemplate}
            style={{padding: '8px 16px', background: 'transparent', border: '1px solid #3b82f6',
              borderRadius: '8px', color: '#3b82f6', cursor: 'pointer', fontSize: '14px'}}>
            📥 Şablon İndir
          </button>
          {message && <p style={{marginTop: '16px', color: '#dc2626'}}>{message}</p>}
          {loading && <p style={{marginTop: '16px', color: '#3b82f6'}}>Yükleniyor...</p>}
        </div>
      )}

      {/* Adım 2 */}
      {step === 2 && (
        <div style={{background: 'white', borderRadius: '12px', padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
            <h2 style={{fontSize: '18px', fontWeight: '700'}}>{message}</h2>
            <button onClick={handleProcess} disabled={loading}
              style={{padding: '10px 24px', background: '#3b82f6', color: 'white',
                border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer'}}>
              {loading ? 'Analiz ediliyor...' : '🚀 Analiz Başlat'}
            </button>
          </div>
          <div style={{maxHeight: '400px', overflowY: 'auto'}}>
            {asins.map((asin, i) => (
              <div key={i} style={{padding: '8px 12px', borderRadius: '6px',
                background: '#f8fafc', marginBottom: '4px', fontSize: '14px',
                display: 'flex', justifyContent: 'space-between'}}>
                <span>{i+1}. {asin}</span>
                <a href={`https://amazon.com/dp/${asin}`} target="_blank"
                  rel="noopener noreferrer" style={{color: '#3b82f6', fontSize: '12px'}}>
                  Amazon →
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Adım 3 */}
      {step === 3 && results && (
        <div>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px'}}>
            {[
              {label: 'Toplam ASIN', value: results.total, color: '#3b82f6'},
              {label: 'Başarılı', value: results.success, color: '#16a34a'},
              {label: 'Hata', value: results.errors, color: '#dc2626'},
            ].map((item) => (
              <div key={item.label} style={{background: 'white', padding: '20px',
                borderRadius: '12px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}}>
                <p style={{fontSize: '32px', fontWeight: '700', color: item.color}}>{item.value}</p>
                <p style={{color: '#64748b', fontSize: '14px'}}>{item.label}</p>
              </div>
            ))}
          </div>

          <div style={{background: 'white', borderRadius: '12px', padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}}>
            <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '14px'}}>
              <thead>
                <tr style={{borderBottom: '2px solid #e2e8f0'}}>
                  {['ASIN', 'Başlık', 'Fiyat', 'BSR', 'Yorum', 'Puan', 'Durum'].map(h => (
                    <th key={h} style={{padding: '8px', textAlign: 'left', color: '#64748b', fontWeight: '600'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.results.map((r, i) => (
                  <tr key={i} style={{borderBottom: '1px solid #f1f5f9'}}>
                    <td style={{padding: '8px', fontFamily: 'monospace'}}>{r.asin}</td>
                    <td style={{padding: '8px', maxWidth: '200px', overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{r.title || '-'}</td>
                    <td style={{padding: '8px'}}>{r.price ? `$${r.price}` : '-'}</td>
                    <td style={{padding: '8px'}}>{r.bsr || '-'}</td>
                    <td style={{padding: '8px'}}>{r.reviews || '-'}</td>
                    <td style={{padding: '8px'}}>{r.rating || '-'}</td>
                    <td style={{padding: '8px'}}>
                      <span style={{
                        padding: '2px 8px', borderRadius: '4px', fontSize: '12px',
                        background: r.status === 'success' ? '#dcfce7' : '#fee2e2',
                        color: r.status === 'success' ? '#16a34a' : '#dc2626'
                      }}>{r.status === 'success' ? '✅' : '❌'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default BulkPage
