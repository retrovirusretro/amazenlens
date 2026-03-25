import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/api'
import LanguageSwitcher from '../components/LanguageSwitcher'

export default function AuthPage() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()
  const { t } = useTranslation()

  const handleSubmit = async () => {
    if (!email) { setError(t('auth.error_email')); return }
    if (mode !== 'forgot' && !password) { setError(t('auth.error_password')); return }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email)
        if (error) throw error
        setSuccess(t('auth.reset_success'))

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
        navigate('/app/dashboard')

      } else if (mode === 'register') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } }
        })
        if (error) throw error
        setSuccess(t('auth.register_success'))
        setTimeout(() => setMode('login'), 2000)
      }
    } catch (err) {
      setError(err.message || 'Bir hata olustu. Tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  const handleOAuth = async (provider) => {
    setOauthLoading(provider)
    setError('')
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/app/dashboard`,
        }
      })
      if (error) throw error
    } catch (err) {
      setError(err.message || `${provider} girişi başarısız.`)
      setOauthLoading('')
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
    navigate('/app/dashboard')
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
        .oauth-btn { width: 100%; padding: 10px; border-radius: 9px; border: 0.5px solid #d2d2d7; background: white; font-size: 13px; font-family: inherit; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: background 0.15s; font-weight: 500; }
        .oauth-btn:hover { background: #f5f5f7; }
      `}</style>

      <div style={{ width: '100%', maxWidth: '380px', animation: 'fadeIn 0.3s ease' }}>

        {/* Logo + Dil Seçici */}
        <div style={{ textAlign: 'center', marginBottom: '28px', position: 'relative' }}>
          <div style={{ position: 'absolute', right: 0, top: 0 }}>
            <LanguageSwitcher />
          </div>
          <div style={{ width: '52px', height: '52px', background: '#1d1d1f', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', cursor: 'pointer' }}
            onClick={() => navigate('/')}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </div>
          <div style={{ fontSize: '20px', fontWeight: '600', color: '#1d1d1f', letterSpacing: '-0.4px' }}>{t('auth.title')}</div>
          <div style={{ fontSize: '13px', color: '#8e8e93', marginTop: '3px' }}>{t('auth.subtitle')}</div>
        </div>

        {/* Kart */}
        <div style={{ background: 'white', borderRadius: '16px', border: '0.5px solid #e5e5ea', padding: '28px 28px 24px', boxShadow: '0 2px 20px rgba(0,0,0,0.06)' }}>

          {/* Mod Seçici */}
          {mode !== 'forgot' && (
            <div style={{ display: 'flex', gap: '4px', background: '#f5f5f7', borderRadius: '10px', padding: '3px', marginBottom: '20px' }}>
              {[{ key: 'login', label: t('auth.login_tab') }, { key: 'register', label: t('auth.register_tab') }].map(tab => (
                <button key={tab.key} onClick={() => { setMode(tab.key); setError(''); setSuccess('') }}
                  style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', fontSize: '13px', fontFamily: 'inherit', background: mode === tab.key ? 'white' : 'transparent', color: mode === tab.key ? '#1d1d1f' : '#8e8e93', boxShadow: mode === tab.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s' }}>
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* Forgot başlık */}
          {mode === 'forgot' && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '17px', fontWeight: '600', color: '#1d1d1f', marginBottom: '4px' }}>{t('auth.reset_title')}</div>
              <div style={{ fontSize: '13px', color: '#8e8e93' }}>{t('auth.reset_desc')}</div>
            </div>
          )}

          {/* OAuth Butonları — sadece login/register modda */}
          {mode !== 'forgot' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {/* Google */}
              <button className="oauth-btn" onClick={() => handleOAuth('google')} disabled={!!oauthLoading}>
                {oauthLoading === 'google' ? (
                  <div style={{ width: '14px', height: '14px', border: '2px solid #d2d2d7', borderTop: '2px solid #1d1d1f', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                Google ile {mode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
              </button>

              {/* GitHub */}
              <button className="oauth-btn" onClick={() => handleOAuth('github')} disabled={!!oauthLoading}>
                {oauthLoading === 'github' ? (
                  <div style={{ width: '14px', height: '14px', border: '2px solid #d2d2d7', borderTop: '2px solid #1d1d1f', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#1d1d1f">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                  </svg>
                )}
                GitHub ile {mode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
              </button>
            </div>
          )}

          {/* Ayırıcı */}
          {mode !== 'forgot' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ flex: 1, height: '0.5px', background: '#e5e5ea' }}></div>
              <span style={{ fontSize: '12px', color: '#aeaeb2' }}>{t('auth.or_with_email')}</span>
              <div style={{ flex: 1, height: '0.5px', background: '#e5e5ea' }}></div>
            </div>
          )}

          {/* Form alanları */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
            {mode === 'register' && (
              <input className="a-input" type="text" placeholder={t('auth.full_name')}
                value={fullName} onChange={e => setFullName(e.target.value)} />
            )}
            <input className="a-input" type="email" placeholder={t('auth.email')}
              value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
            {mode !== 'forgot' && (
              <div style={{ position: 'relative' }}>
                <input className="a-input" type={showPassword ? 'text' : 'password'} placeholder={t('auth.password')}
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

          {/* Şifremi unuttum */}
          {mode === 'login' && (
            <div style={{ textAlign: 'right', marginBottom: '14px' }}>
              <button onClick={() => { setMode('forgot'); setError(''); setSuccess('') }}
                style={{ background: 'none', border: 'none', color: '#0071e3', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                {t('auth.forgot_password')}
              </button>
            </div>
          )}

          {/* Hata */}
          {error && (
            <div style={{ padding: '9px 13px', background: '#fff1f0', border: '0.5px solid #ffd0ce', borderRadius: '8px', color: '#c00', fontSize: '12px', marginBottom: '12px' }}>
              {error}
            </div>
          )}

          {/* Başarı */}
          {success && (
            <div style={{ padding: '9px 13px', background: '#e8f9ee', border: '0.5px solid #b7f0c8', borderRadius: '8px', color: '#1a7f37', fontSize: '12px', marginBottom: '12px' }}>
              {success}
            </div>
          )}

          {/* Ana buton */}
          <button onClick={handleSubmit} disabled={loading}
            style={{ width: '100%', padding: '11px', background: loading ? '#aeaeb2' : '#0071e3', color: 'white', border: 'none', borderRadius: '9px', fontSize: '14px', fontWeight: '500', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', transition: 'background 0.15s' }}>
            {loading && <div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>}
            {loading ? t('auth.loading') : mode === 'login' ? t('auth.login_btn') : mode === 'register' ? t('auth.register_btn') : t('auth.reset_btn')}
          </button>

          {/* Geri (forgot modda) */}
          {mode === 'forgot' && (
            <button onClick={() => { setMode('login'); setError(''); setSuccess('') }}
              style={{ width: '100%', padding: '10px', background: 'none', border: '0.5px solid #d2d2d7', borderRadius: '9px', fontSize: '13px', color: '#3c3c43', cursor: 'pointer', fontFamily: 'inherit', marginTop: '8px' }}>
              {t('auth.back_to_login')}
            </button>
          )}

          {/* Misafir */}
          {mode !== 'forgot' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '16px 0' }}>
                <div style={{ flex: 1, height: '0.5px', background: '#e5e5ea' }}></div>
                <span style={{ fontSize: '12px', color: '#aeaeb2' }}>{t('auth.or')}</span>
                <div style={{ flex: 1, height: '0.5px', background: '#e5e5ea' }}></div>
              </div>
              <button onClick={handleGuest}
                style={{ width: '100%', padding: '10px', background: 'white', border: '0.5px solid #d2d2d7', borderRadius: '9px', fontSize: '13px', color: '#3c3c43', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span style={{ fontSize: '15px' }}>👀</span>
                {t('auth.guest_btn')}
                <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '20px', background: '#f5f5f7', color: '#8e8e93' }}>{t('auth.guest_limit')}</span>
              </button>
            </>
          )}
        </div>

        {/* Trial notu */}
        {mode === 'register' && (
          <div style={{ marginTop: '12px', padding: '12px 16px', background: 'white', borderRadius: '10px', border: '0.5px solid #b7f0c8', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ fontSize: '18px' }}>🎁</div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '500', color: '#1a7f37' }}>{t('auth.trial_title')}</div>
              <div style={{ fontSize: '11px', color: '#8e8e93', marginTop: '1px' }}>{t('auth.trial_desc')}</div>
            </div>
          </div>
        )}

        {mode === 'register' && (
          <div style={{ marginTop: '12px', fontSize: '11px', color: '#aeaeb2', textAlign: 'center', lineHeight: '1.6' }}>
            {t('auth.terms_text')}
          </div>
        )}
      </div>
    </div>
  )
}
