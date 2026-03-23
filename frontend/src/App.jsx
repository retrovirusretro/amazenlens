import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/api'
import Layout from './components/Layout'
import AuthPage from './pages/AuthPage'
import LandingPage from './pages/LandingPage'
import SearchPage from './pages/SearchPage'
import ProductPage from './pages/ProductPage'
import UnavailablePage from './pages/UnavailablePage'
import NichePage from './pages/NichePage'
import Dashboard from './pages/Dashboard'
import SourcingPage from './pages/SourcingPage'
import BulkPage from './pages/BulkPage'
import BlogPage from './pages/BlogPage'
import BlogPostPage from './pages/BlogPostPage'
import BlogAdminPage from './pages/BlogAdminPage'
import CalculatorPage from './pages/CalculatorPage'
import PricingPage from './pages/PricingPage'
import FeedbackPage from './pages/FeedbackPage'
import AboutPage from './pages/AboutPage'
import KeywordPage from './pages/KeywordPage'
//import TrendRadarPage from './pages/TrendRadarPage'
import RankTrackerPage from './pages/RankTrackerPage'

import './App.css'

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token')
  return token ? children : <Navigate to="/auth" replace />
}

// Blog slug redirect — /blog/:slug → /app/blog/:slug
function BlogSlugRedirect() {
  const { slug } = useParams()
  return <Navigate to={`/app/blog/${slug}`} replace />
}

// Supabase auth token'larını yakalar (OAuth + Reset)
function AuthHandler() {
  const navigate = useNavigate()
  const location = useLocation()
  const [resetMode, setResetMode] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    const hash = window.location.hash
    if (!hash) return

    const params = new URLSearchParams(hash.replace('#', '?'))
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const type = params.get('type')

    if (!accessToken) return

    if (type === 'recovery') {
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken || '' })
      setResetMode(true)
    } else {
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken || '' })
        .then(({ data }) => {
          if (data?.user) {
            localStorage.setItem('token', accessToken)
            localStorage.setItem('user', JSON.stringify({
              id: data.user.id,
              email: data.user.email,
              full_name: data.user.user_metadata?.full_name || '',
              plan: 'free',
            }))
            navigate('/app/dashboard', { replace: true })
          }
        })
    }
  }, [])

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setMsg('Şifre en az 6 karakter olmalı.')
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setMsg('✅ Şifren güncellendi! Giriş yapabilirsin.')
      setTimeout(() => navigate('/auth', { replace: true }), 2000)
    } catch (err) {
      setMsg(err.message || 'Bir hata oluştu.')
    } finally {
      setLoading(false)
    }
  }

  if (!resetMode) return null

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f7', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ background: 'white', borderRadius: '16px', border: '0.5px solid #e5e5ea', padding: '32px', width: '100%', maxWidth: '380px', boxShadow: '0 2px 20px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: '20px', fontWeight: '600', color: '#1d1d1f', marginBottom: '6px' }}>Yeni Şifre Belirle</div>
        <div style={{ fontSize: '13px', color: '#8e8e93', marginBottom: '20px' }}>En az 6 karakter olmalı.</div>
        <input
          type="password"
          placeholder="Yeni şifre"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleResetPassword()}
          style={{ width: '100%', padding: '11px 14px', borderRadius: '9px', border: '0.5px solid #d2d2d7', fontSize: '14px', fontFamily: 'inherit', color: '#1d1d1f', outline: 'none', background: '#f5f5f7', boxSizing: 'border-box', marginBottom: '12px' }}
        />
        {msg && (
          <div style={{ padding: '9px 13px', borderRadius: '8px', fontSize: '12px', marginBottom: '12px', background: msg.includes('✅') ? '#e8f9ee' : '#fff1f0', color: msg.includes('✅') ? '#1a7f37' : '#c00' }}>
            {msg}
          </div>
        )}
        <button onClick={handleResetPassword} disabled={loading}
          style={{ width: '100%', padding: '11px', background: '#0071e3', color: 'white', border: 'none', borderRadius: '9px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit' }}>
          {loading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
        </button>
      </div>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthHandler />
      <Routes>
        {/* Public sayfalar */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />

        {/* Korumalı sayfalar — Layout içinde */}
        <Route path="/app" element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }>
          <Route index element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="product/:asin" element={<ProductPage />} />
          <Route path="unavailable" element={<UnavailablePage />} />
          <Route path="niche" element={<NichePage />} />
          <Route path="sourcing" element={<SourcingPage />} />
          <Route path="bulk" element={<BulkPage />} />
          <Route path="blog" element={<BlogPage />} />
          <Route path="blog/:slug" element={<BlogPostPage />} />
          <Route path="blog-admin" element={<BlogAdminPage />} />
          <Route path="calculator" element={<CalculatorPage />} />
          <Route path="pricing" element={<PricingPage />} />
          <Route path="feedback" element={<FeedbackPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="keywords" element={<KeywordPage />} />
          // <Route path="/rank-tracker" element={<RankTrackerPage />} />
          <Route path="/app/rank-tracker" element={<RankTrackerPage />} />
        </Route>

        {/* Eski + dış URL'leri yeni yapıya yönlendir */}
        <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
        <Route path="/search" element={<Navigate to="/app/search" replace />} />
        <Route path="/niche" element={<Navigate to="/app/niche" replace />} />
        <Route path="/pricing" element={<Navigate to="/app/pricing" replace />} />
        <Route path="/feedback" element={<Navigate to="/app/feedback" replace />} />
        <Route path="/calculator" element={<Navigate to="/app/calculator" replace />} />
        <Route path="/sourcing" element={<Navigate to="/app/sourcing" replace />} />
        <Route path="/bulk" element={<Navigate to="/app/bulk" replace />} />
        <Route path="/unavailable" element={<Navigate to="/app/unavailable" replace />} />
        <Route path="/blog" element={<Navigate to="/app/blog" replace />} />
        <Route path="/blog/:slug" element={<BlogSlugRedirect />} />
        <Route path="/blog-admin" element={<Navigate to="/app/blog-admin" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
