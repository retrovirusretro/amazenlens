import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/api'

export default function AuthPage() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async () => {
    if (!email) { setError('Email gerekli'); return }
    if (mode !== 'forgot' && !password) { setError('Sifre gerekli'); return }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email)
        if (error) throw error
        setSuccess('Sifre sifirlama linki emailinize gonderildi!')

      } else if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        localStorage.setItem('token', data.session.access_token)
        localStorage.setItem('user', JSON.stringify({
          id: data.user.id,
          email: data.user.email,
          full_name: data.user.user_metadata?.full_name || '',
          plan: 'free',
        }))
        navigate('/dashboard')

      } else if (mode === 'register') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } }
        })
        if (error) throw error
        setSuccess('Kayit basarili! 7 gun ucretsiz Pro denemeniz basladi.')
        setTimeout(() => setMode('login'), 2000)
      }
    } catch (err) {
      setError(err.message || 'Bir hata olustu. Tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  const handleGuest = () => {
    localStorage.setItem('token', 'guest')
    localStorage.setItem('user', JSON.stringify({
      email: 'misafir@amazenlens.com',
      full_name: 'Misafir Kullanici',
      plan: 'free',
      is_guest: true,
    }))
    navigate('/dashboard')
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f5f5f7',
      fontFamily: "'Inter', -apple-system, sans-serif",
      padding: '20px',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .a-input {
          width: 100%; padding: 11px 14px; border-radius: 9px;
          border: 0.5px solid #d2d2d7; font-size: 14px; font-family: inherit;
          color: #1d1d1f; outline: none; background: #f5f5f7;
          box-sizing: border-box; transition: border 0.15s, background 0.15s;
        }
        .a-input:focus { border-color: #0071e3; background: white; }
        .a-input::placeholder { color: #aeaeb2; }
      `}</style>

      <div style={{ width: '100%', maxWidth: '380px', animation: 'fadeIn 0.3s ease' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ width: '52px', height: '52px', background: '#1d1d1f', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </div>
          <div style={{ fontSize: '20px', fontWeight: '600', color: '#1d1d1f', letterSpacing: '-0.4px' }}>AmazenLens</div>
          <div style={{ fontSize: '13px', color: '#8e8e93', marginTop: '3px' }}>Amazon Arastirma Platformu</div>
        </div>

        {/* Kart */}
        <div style={{ background: 'white', borderRadius: '16px', border: '0.5px solid #e5e5ea', padding: '28px 28px 24px', boxShadow: '0 2px 20px rgba(0,0,0,0.06)' }}>

          {/* Mod Seçici */}
          {mode !== 'forgot' && (
            <div style={{ display: 'flex', gap: '4px', background: '#f5f5f7', borderRadius: '10px', padding: '3px', marginBottom: '20px' }}>
              {[{ key: 'login', label: 'Giris Yap' }, { key: 'register', label: 'Kayit Ol' }].map(t => (
                <button key={t.key} onClick={() => { setMode(t.key); setError(''); setSuccess('') }}
                  style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', fontSize: '13px', fontFamily: 'inherit', background: mode === t.key ? 'white' : 'transparent', color: mode === t.key ? '#1d1d1f' : '#8e8e93', boxShadow: mode === t.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s' }}>
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {/* Forgot başlık */}
          {mode === 'forgot' && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '17px', fontWeight: '600', color: '#1d1d1f', marginBottom: '4px' }}>Sifre Sifirla</div>
              <div style={{ fontSize: '13px', color: '#8e8e93' }}>Email adresinize sifirlama linki gonderilecek</div>
            </div>
          )}

          {/* Form alanları */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
            {mode === 'register' && (
              <input className="a-input" type="text" placeholder="Ad Soyad"
                value={fullName} onChange={e => setFullName(e.target.value)} />
            )}
            <input className="a-input" type="email" placeholder="Email adresi"
              value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
            {mode !== 'forgot' && (
              <div style={{ position: 'relative' }}>
                <input className="a-input" type={showPassword ? 'text' : 'password'} placeholder="Sifre"
                  value={password} onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  style={{ paddingRight: '42px' }} />
                <button onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#aeaeb2', fontSize: '15px', padding: 0 }}>
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            )}
          </div>

          {/* Sifremi unuttum linki */}
          {mode === 'login' && (
            <div style={{ textAlign: 'right', marginBottom: '14px' }}>
              <button onClick={() => { setMode('forgot'); setError(''); setSuccess('') }}
                style={{ background: 'none', border: 'none', color: '#0071e3', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                Sifremi unuttum
              </button>
            </div>
          )}

          {/* Hata mesajı */}
          {error && (
            <div style={{ padding: '9px 13px', background: '#fff1f0', border: '0.5px solid #ffd0ce', borderRadius: '8px', color: '#c00', fontSize: '12px', marginBottom: '12px' }}>
              {error}
            </div>
          )}

          {/* Başarı mesajı */}
          {success && (
            <div style={{ padding: '9px 13px', background: '#e8f9ee', border: '0.5px solid #b7f0c8', borderRadius: '8px', color: '#1a7f37', fontSize: '12px', marginBottom: '12px' }}>
              {success}
            </div>
          )}

          {/* Ana buton */}
          <button onClick={handleSubmit} disabled={loading}
            style={{ width: '100%', padding: '11px', background: loading ? '#aeaeb2' : '#0071e3', color: 'white', border: 'none', borderRadius: '9px', fontSize: '14px', fontWeight: '500', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', transition: 'background 0.15s' }}>
            {loading && <div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>}
            {loading ? 'Lutfen bekleyin...' : mode === 'login' ? 'Giris Yap' : mode === 'register' ? 'Hesap Olustur' : 'Sifirlama Linki Gonder'}
          </button>

          {/* Geri butonu (forgot modda) */}
          {mode === 'forgot' && (
            <button onClick={() => { setMode('login'); setError(''); setSuccess('') }}
              style={{ width: '100%', padding: '10px', background: 'none', border: '0.5px solid #d2d2d7', borderRadius: '9px', fontSize: '13px', color: '#3c3c43', cursor: 'pointer', fontFamily: 'inherit', marginTop: '8px' }}>
              Giris sayfasina don
            </button>
          )}

          {/* Ayırıcı + Misafir */}
          {mode !== 'forgot' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '16px 0' }}>
                <div style={{ flex: 1, height: '0.5px', background: '#e5e5ea' }}></div>
                <span style={{ fontSize: '12px', color: '#aeaeb2' }}>veya</span>
                <div style={{ flex: 1, height: '0.5px', background: '#e5e5ea' }}></div>
              </div>
              <button onClick={handleGuest}
                style={{ width: '100%', padding: '10px', background: 'white', border: '0.5px solid #d2d2d7', borderRadius: '9px', fontSize: '13px', color: '#3c3c43', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span style={{ fontSize: '15px' }}>👀</span>
                Uye olmadan devam et
                <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '20px', background: '#f5f5f7', color: '#8e8e93' }}>5 arama/gun</span>
              </button>
            </>
          )}
        </div>

        {/* Trial notu */}
        {mode === 'register' && (
          <div style={{ marginTop: '12px', padding: '12px 16px', background: 'white', borderRadius: '10px', border: '0.5px solid #b7f0c8', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ fontSize: '18px' }}>🎁</div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '500', color: '#1a7f37' }}>7 gun ucretsiz Pro deneme</div>
              <div style={{ fontSize: '11px', color: '#8e8e93', marginTop: '1px' }}>Kayit olunca otomatik baslar, kart bilgisi gerekmez</div>
            </div>
          </div>
        )}

        {/* Alt not */}
        {mode === 'register' && (
          <div style={{ marginTop: '12px', fontSize: '11px', color: '#aeaeb2', textAlign: 'center', lineHeight: '1.6' }}>
            Kayit olarak Kullanim Sartlari ve Gizlilik Politikasini kabul etmis olursunuz.
          </div>
        )}
      </div>
    </div>
  )
}
