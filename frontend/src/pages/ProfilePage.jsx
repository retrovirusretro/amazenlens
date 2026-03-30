import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Helmet } from 'react-helmet-async'
import axios from 'axios'
import { supabase } from '../lib/api'

const API = import.meta.env.VITE_API_URL || 'https://amazenlens-production.up.railway.app'

const PLAN_META = {
  free:    { label: 'Free',    color: '#8e8e93', bg: '#f5f5f7', searches: 5 },
  starter: { label: 'Starter', color: '#0071e3', bg: '#e8f0fe', searches: 50 },
  pro:     { label: 'Pro',     color: '#1d1d1f', bg: '#1d1d1f', searches: 200 },
  agency:  { label: 'Agency',  color: '#af52de', bg: '#f3e8ff', searches: -1 },
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || '{}'))
  const [lensPoints, setLensPoints] = useState(0)
  const [pointHistory, setPointHistory] = useState([])
  const [stats, setStats] = useState({ searches: 0, niches: 0, products: 0 })
  const [editName, setEditName] = useState(false)
  const [newName, setNewName] = useState(user.full_name || '')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  const plan = user.plan || 'free'
  const planMeta = PLAN_META[plan] || PLAN_META.free

  useEffect(() => {
    if (user.id) {
      fetchPoints()
      fetchStats()
    }
  }, [])

  const fetchPoints = async () => {
    try {
      const res = await axios.get(`${API}/api/feedback/points/${user.id}`)
      setLensPoints(res.data?.points || 0)

      // Son 5 puan aktivitesi
      const { data } = await supabase
        .from('lens_points')
        .select('action, points, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)
      setPointHistory(data || [])
    } catch {}
  }

  const fetchStats = async () => {
    try {
      const { data } = await supabase
        .from('user_events')
        .select('event_type')
        .eq('user_id', user.id)
      if (data) {
        setStats({
          searches: data.filter(e => e.event_type === 'keyword_search').length,
          niches: data.filter(e => e.event_type === 'niche_score').length,
          products: data.filter(e => e.event_type === 'product_view').length,
        })
      }
    } catch {}
  }

  const handleSaveName = async () => {
    if (!newName.trim()) return
    setSaving(true)
    try {
      await supabase.from('profiles').update({ full_name: newName }).eq('id', user.id)
      const updated = { ...user, full_name: newName }
      localStorage.setItem('user', JSON.stringify(updated))
      setUser(updated)
      setEditName(false)
      setSaveMsg('✅ İsim güncellendi')
      setTimeout(() => setSaveMsg(''), 2500)
    } catch {
      setSaveMsg('Hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  const levelName = lensPoints < 500 ? 'Yeni Üye' : lensPoints < 2000 ? 'Araştırmacı' : lensPoints < 5000 ? 'Niş Avcısı' : 'Uzman Satıcı'
  const levelColor = lensPoints < 500 ? '#8e8e93' : lensPoints < 2000 ? '#0071e3' : lensPoints < 5000 ? '#ff9f0a' : '#af52de'
  const nextLevel = lensPoints < 500 ? 500 : lensPoints < 2000 ? 2000 : lensPoints < 5000 ? 5000 : 10000
  const progress = Math.min(100, Math.round((lensPoints / nextLevel) * 100))

  const initials = (user.full_name || user.email || 'U').slice(0, 2).toUpperCase()

  const actionLabels = {
    feedback_submit: 'Feedback gönderildi',
    bug_report: 'Bug raporu',
    nps_score: 'NPS skoru',
    vote: 'Oylama',
    daily_login: 'Günlük giriş',
    first_search: 'İlk arama',
    niche_score: 'Niş analizi',
    referral: 'Arkadaş daveti',
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", maxWidth: '860px' }}>
      <Helmet>
        <title>Profil — AmazenLens</title>
      </Helmet>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {saveMsg && (
        <div style={{ background: '#e8f9ee', border: '0.5px solid #b7f0c8', borderRadius: '10px', padding: '10px 16px', marginBottom: '16px', fontSize: '13px', color: '#1a7f37' }}>
          {saveMsg}
        </div>
      )}

      {/* Profil Kartı */}
      <div style={{ background: 'linear-gradient(135deg, #1d1d1f 0%, #2d2d2f 100%)', borderRadius: '16px', padding: '28px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '20px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: '180px', height: '180px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,113,227,0.15) 0%, transparent 70%)' }} />

        {/* Avatar */}
        <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: levelColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', fontWeight: '700', color: 'white', flexShrink: 0, letterSpacing: '-1px' }}>
          {initials}
        </div>

        <div style={{ flex: 1 }}>
          {/* İsim */}
          {editName ? (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                autoFocus
                style={{ fontSize: '18px', fontWeight: '600', color: '#1d1d1f', background: 'white', border: '1px solid #e5e5ea', borderRadius: '8px', padding: '4px 10px', fontFamily: 'inherit', outline: 'none', width: '200px' }}
              />
              <button onClick={handleSaveName} disabled={saving}
                style={{ padding: '5px 14px', background: '#0071e3', color: 'white', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
                {saving ? '...' : 'Kaydet'}
              </button>
              <button onClick={() => setEditName(false)}
                style={{ padding: '5px 10px', background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', border: 'none', borderRadius: '7px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                İptal
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: 'white', letterSpacing: '-0.3px' }}>
                {user.full_name || 'İsimsiz Kullanıcı'}
              </div>
              <button onClick={() => setEditName(true)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: 'inherit' }}>
                ✏️ Düzenle
              </button>
            </div>
          )}
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '10px' }}>{user.email}</div>

          {/* Plan badge */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', padding: '3px 12px', borderRadius: '20px', background: plan === 'pro' ? '#0071e3' : planMeta.bg, color: plan === 'pro' ? 'white' : planMeta.color }}>
              {planMeta.label} Plan
            </span>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
              {planMeta.searches === -1 ? 'Sınırsız arama/gün' : `${planMeta.searches} arama/gün`}
            </span>
          </div>
        </div>

        {/* Lens Puan */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#ffd60a', letterSpacing: '-1px' }}>
            {lensPoints.toLocaleString()}
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Lens Puanı</div>
          <div style={{ fontSize: '12px', color: levelColor, fontWeight: '600' }}>{levelName}</div>
        </div>
      </div>

      {/* Seviye ilerlemesi + İstatistikler */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px', marginBottom: '16px' }}>
        {/* Seviye */}
        <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f', marginBottom: '12px' }}>🏆 Seviye İlerlemesi</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#8e8e93', marginBottom: '6px' }}>
            <span style={{ color: levelColor, fontWeight: '600' }}>{levelName}</span>
            <span>{lensPoints.toLocaleString()} / {nextLevel.toLocaleString()} puan</span>
          </div>
          <div style={{ height: '8px', background: '#f5f5f7', borderRadius: '4px', overflow: 'hidden', marginBottom: '12px' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: `linear-gradient(90deg, ${levelColor}, ${levelColor}dd)`, borderRadius: '4px', transition: 'width 0.6s ease' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
            {[
              { label: 'Yeni Üye', threshold: 0, color: '#8e8e93' },
              { label: 'Araştırmacı', threshold: 500, color: '#0071e3' },
              { label: 'Niş Avcısı', threshold: 2000, color: '#ff9f0a' },
              { label: 'Uzman', threshold: 5000, color: '#af52de' },
            ].map(l => (
              <div key={l.label} style={{ padding: '6px', borderRadius: '8px', background: lensPoints >= l.threshold ? l.color + '15' : '#f5f5f7', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', fontWeight: '600', color: lensPoints >= l.threshold ? l.color : '#aeaeb2' }}>{l.label}</div>
                <div style={{ fontSize: '9px', color: '#aeaeb2' }}>{l.threshold.toLocaleString()}+</div>
              </div>
            ))}
          </div>
        </div>

        {/* İstatistikler */}
        <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f', marginBottom: '16px' }}>📊 Kullanım İstatistikleri</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { icon: '🔍', label: 'Toplam Arama', value: stats.searches, color: '#0071e3' },
              { icon: '🎯', label: 'Niş Analizi', value: stats.niches, color: '#ff9f0a' },
              { icon: '📦', label: 'Ürün Görüntüleme', value: stats.products, color: '#34c759' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: s.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px' }}>{s.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: '#8e8e93' }}>{s.label}</div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#1d1d1f' }}>{s.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Son Puan Aktivitesi + Hızlı Linkler */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
        {/* Puan Geçmişi */}
        <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f', marginBottom: '14px' }}>🪙 Son Puan Aktivitesi</div>
          {pointHistory.length === 0 ? (
            <div style={{ fontSize: '13px', color: '#8e8e93', textAlign: 'center', padding: '16px' }}>
              Henüz puan kazanılmadı.<br />
              <span style={{ fontSize: '12px' }}>Feedback gönder, niş analizi yap, puan kazan!</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {pointHistory.map((h, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f5f5f7', borderRadius: '8px' }}>
                  <div style={{ fontSize: '12px', color: '#3c3c43' }}>{actionLabels[h.action] || h.action}</div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#34c759' }}>+{h.points}</div>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: '14px', padding: '10px 12px', background: '#f0f7ff', borderRadius: '8px', fontSize: '11px', color: '#0071e3' }}>
            💡 Feedback +50 · Bug raporu +200 · Niş analizi +15
          </div>
        </div>

        {/* Hızlı Linkler */}
        <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f', marginBottom: '14px' }}>⚡ Hızlı Erişim</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { icon: '🔍', label: 'Ürün Ara', path: '/app/search', color: '#0071e3' },
              { icon: '🎯', label: 'Niş Skoru', path: '/app/niche', color: '#ff9f0a' },
              { icon: '💰', label: 'Plan Yükselt', path: '/app/pricing', color: '#34c759' },
              { icon: '💬', label: 'Geri Bildirim', path: '/app/feedback', color: '#af52de' },
            ].map(l => (
              <button key={l.path} onClick={() => navigate(l.path)}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: '#f5f5f7', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = l.color + '15'}
                onMouseLeave={e => e.currentTarget.style.background = '#f5f5f7'}>
                <span style={{ fontSize: '18px' }}>{l.icon}</span>
                <span style={{ fontSize: '13px', fontWeight: '500', color: '#1d1d1f' }}>{l.label}</span>
                <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#aeaeb2' }}>→</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
