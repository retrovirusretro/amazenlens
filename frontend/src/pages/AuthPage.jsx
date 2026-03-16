import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'

function AuthPage() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      if (mode === 'login') {
        const res = await api.post('/api/auth/login', { email, password })
        localStorage.setItem('token', res.data.access_token)
        localStorage.setItem('user', JSON.stringify(res.data.user))
        navigate('/dashboard')
      } else {
        await api.post('/api/auth/register', { email, password, full_name: fullName })
        setMode('login')
        setError('Kayıt başarılı! Şimdi giriş yapabilirsiniz.')
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#f8fafc'
    }}>
      <div style={{
        background: 'white', borderRadius: '16px', padding: '40px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px'
      }}>
        <h1 style={{fontSize: '24px', fontWeight: '800', textAlign: 'center',
          marginBottom: '8px', color: '#1e293b'}}>
          🔍 AmazenLens
        </h1>
        <p style={{textAlign: 'center', color: '#64748b', marginBottom: '32px', fontSize: '14px'}}>
          Amazon Araştırma Platformu
        </p>

        <div style={{display: 'flex', marginBottom: '24px', background: '#f1f5f9',
          borderRadius: '8px', padding: '4px'}}>
          <button onClick={() => setMode('login')} style={{
            flex: 1, padding: '8px', border: 'none', borderRadius: '6px',
            cursor: 'pointer', fontWeight: '600', fontSize: '14px',
            background: mode === 'login' ? 'white' : 'transparent',
            color: mode === 'login' ? '#1e293b' : '#64748b',
            boxShadow: mode === 'login' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
          }}>Giriş Yap</button>
          <button onClick={() => setMode('register')} style={{
            flex: 1, padding: '8px', border: 'none', borderRadius: '6px',
            cursor: 'pointer', fontWeight: '600', fontSize: '14px',
            background: mode === 'register' ? 'white' : 'transparent',
            color: mode === 'register' ? '#1e293b' : '#64748b',
            boxShadow: mode === 'register' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
          }}>Kayıt Ol</button>
        </div>

        {mode === 'register' && (
          <input
            type="text"
            placeholder="Ad Soyad"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            style={{width: '100%', padding: '12px', borderRadius: '8px',
              border: '1px solid #e2e8f0', marginBottom: '12px',
              fontSize: '15px', outline: 'none', boxSizing: 'border-box'}}
          />
        )}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{width: '100%', padding: '12px', borderRadius: '8px',
            border: '1px solid #e2e8f0', marginBottom: '12px',
            fontSize: '15px', outline: 'none', boxSizing: 'border-box'}}
        />

        <input
          type="password"
          placeholder="Şifre"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          style={{width: '100%', padding: '12px', borderRadius: '8px',
            border: '1px solid #e2e8f0', marginBottom: '16px',
            fontSize: '15px', outline: 'none', boxSizing: 'border-box'}}
        />

        {error && (
          <p style={{
            color: error.includes('başarılı') ? '#16a34a' : '#dc2626',
            fontSize: '14px', marginBottom: '16px', textAlign: 'center'
          }}>{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%', padding: '12px', background: '#3b82f6',
            color: 'white', border: 'none', borderRadius: '8px',
            fontSize: '15px', fontWeight: '600', cursor: 'pointer'
          }}
        >
          {loading ? 'Yükleniyor...' : mode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
        </button>
      </div>
    </div>
  )
}

export default AuthPage