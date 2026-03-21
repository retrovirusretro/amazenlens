import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import axios from 'axios'

const API = ''

const QUICK_SEARCHES = [
  'yoga mat', 'silikon mutfak seti', 'led masa lambası',
  'resistance bands', 'bambu kesme tahtası', 'bluetooth kulaklık'
]

const PLAN_COLORS = {
  free:    { bg: '#f5f5f7', color: '#8e8e93', label: 'Free' },
  trial:   { bg: '#fff4e0', color: '#ff9f0a', label: 'Trial' },
  starter: { bg: '#e8f0fe', color: '#0071e3', label: 'Starter' },
  pro:     { bg: '#e8f9ee', color: '#34c759', label: 'Pro' },
  agency:  { bg: '#f3e8ff', color: '#af52de', label: 'Agency' },
}

function StatCard({ label, value, sub, subColor, icon, iconBg }) {
  return (
    <div style={{ background: 'white', borderRadius: '11px', padding: '14px 16px', border: '0.5px solid #e5e5ea' }}>
      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
        {icon}
      </div>
      <div style={{ fontSize: '11px', color: '#8e8e93', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '22px', fontWeight: '600', color: '#1d1d1f', letterSpacing: '-0.5px' }}>{value}</div>
      {sub && <div style={{ fontSize: '11px', color: subColor || '#8e8e93', marginTop: '3px' }}>{sub}</div>}
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || '{}'))
  const firstName = user.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'Kullanıcı'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? t('dashboard.greeting_morning') : hour < 18 ? t('dashboard.greeting_afternoon') : t('dashboard.greeting_evening')

  const [recentPosts, setRecentPosts] = useState([])
  const [quickPicks, setQuickPicks] = useState([])
  const [picksLoading, setPicksLoading] = useState(true)
  const [activePickTab, setActivePickTab] = useState('all')

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        if (user.email && user.email !== 'misafir@amazenlens.com') {
          const res = await axios.get(`${API}/api/payments/subscription/${encodeURIComponent(user.email)}`)
          if (res.data) {
            const updatedUser = { ...user, plan: res.data.plan, searches_per_day: res.data.searches_per_day, is_admin: res.data.is_admin }
            localStorage.setItem('user', JSON.stringify(updatedUser))
            setUser(updatedUser)
          }
        }
      } catch (err) {
        console.debug('Plan fetch error:', err)
      }
    }

    fetchPlan()
    axios.get(`${API}/api/blog/posts?limit=3`).then(r => setRecentPosts(r.data.posts || [])).catch(() => {})
    fetchQuickPicks()
  }, [])

  const fetchQuickPicks = async () => {
    setPicksLoading(true)
    try {
      const res = await axios.get(`${API}/api/amazon/quick-picks?limit=8`)
      setQuickPicks(res.data.picks || [])
    } catch {
      setQuickPicks([
        { asin: 'B07QK955LS', title: 'Silikon Spatula Seti 6 Parça', price: 24.99, bestseller_rank: 2340, niche_score: 87, score_color: '#34c759', badge: '🔥 Trend', badge_bg: '#fff4e0', badge_color: '#b45309', est_revenue: '$22K/ay', fba: 'FBA' },
        { asin: 'B08N5WRWNW', title: 'LED Masa Lambası USB Şarjlı', price: 22.99, bestseller_rank: 3102, niche_score: 91, score_color: '#0071e3', badge: '⭐ Yüksek Skor', badge_bg: '#e8f0fe', badge_color: '#0071e3', est_revenue: '$18K/ay', fba: 'FBA' },
        { asin: 'B07WDMFGDB', title: "Bambu Kesme Tahtası 3'lü Set", price: 29.99, bestseller_rank: 890, niche_score: 78, score_color: '#ff9f0a', badge: '📈 BSR Düşük', badge_bg: '#e8f9ee', badge_color: '#1a7f37', est_revenue: '$31K/ay', fba: 'FBA' },
        { asin: 'B07YHQGNMR', title: 'Resistance Bands Set 5 Seviye', price: 18.99, bestseller_rank: 2450, niche_score: 74, score_color: '#af52de', badge: '🌍 Global', badge_bg: '#f3e8ff', badge_color: '#7c3aed', est_revenue: '$15K/ay', fba: 'FBM' },
      ])
    } finally {
      setPicksLoading(false)
    }
  }

  const filteredPicks = quickPicks.filter(p => {
    if (activePickTab === 'fba') return p.fba === 'FBA'
    if (activePickTab === 'high') return p.niche_score >= 85
    return true
  })

  const currentPlan = user.plan || 'free'
  const planStyle = PLAN_COLORS[currentPlan] || PLAN_COLORS.free
  const isAgency = currentPlan === 'agency'

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", maxWidth: '1100px' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Plan Barı */}
      <div style={{ background: 'white', borderRadius: '11px', border: '0.5px solid #e5e5ea', padding: '12px 18px', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: '500', color: '#1d1d1f' }}>{planStyle.label} Plan</span>
            <span style={{ fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '10px', background: planStyle.bg, color: planStyle.color }}>
              {planStyle.label}
            </span>
            {isAgency && <span style={{ fontSize: '11px', color: '#af52de' }}>{t('dashboard.plan_bar_active')}</span>}
          </div>
          {!isAgency && (
            <div style={{ height: '4px', background: '#f0f0f5', borderRadius: '2px' }}>
              <div style={{ height: '100%', width: '42%', background: planStyle.color, borderRadius: '2px' }}></div>
            </div>
          )}
        </div>
        {!isAgency && (
          <button onClick={() => navigate('/app/pricing')} style={{ background: '#0071e3', color: 'white', border: 'none', padding: '7px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
            {t('dashboard.upgrade_btn')}
          </button>
        )}
      </div>

      {/* Selamlama */}
      <div style={{ marginBottom: '18px' }}>
        <div style={{ fontSize: '22px', fontWeight: '600', color: '#1d1d1f', letterSpacing: '-0.4px' }}>{greeting}, {firstName} 👋</div>
        <div style={{ fontSize: '13px', color: '#8e8e93', marginTop: '3px' }}>{filteredPicks.length} {t('dashboard.subtitle')}</div>
      </div>

      {/* Metrikler */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '16px' }}>
        <StatCard label={t('dashboard.stat_searches')} value="248" sub={t('dashboard.stat_searches_sub')} subColor="#34c759" iconBg="#e8f0fe"
          icon={<svg width="16" height="16" fill="none" stroke="#0071e3" strokeWidth="1.5" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>} />
        <StatCard label={t('dashboard.stat_niche')} value="34" sub={t('dashboard.stat_niche_sub')} subColor="#34c759" iconBg="#e8f9ee"
          icon={<svg width="16" height="16" fill="none" stroke="#34c759" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>} />
        <StatCard label={t('dashboard.stat_supplier')} value="12" sub={t('dashboard.stat_supplier_sub')} iconBg="#fff4e0"
          icon={<svg width="16" height="16" fill="none" stroke="#ff9f0a" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>} />
        <StatCard label={t('dashboard.stat_margin')} value="%64" sub={t('dashboard.stat_margin_sub')} subColor="#ff3b30" iconBg="#f3e8ff"
          icon={<svg width="16" height="16" fill="none" stroke="#af52de" strokeWidth="1.5" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>} />
      </div>

      {/* Quick Picks */}
      <div style={{ background: 'white', borderRadius: '11px', border: '0.5px solid #e5e5ea', marginBottom: '12px' }}>
        <div style={{ padding: '13px 16px 10px', borderBottom: '0.5px solid #f5f5f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f' }}>{t('dashboard.quick_picks_title')}</div>
            <div style={{ fontSize: '11px', color: '#8e8e93', marginTop: '2px' }}>{t('dashboard.quick_picks_sub')}</div>
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {[
              { key: 'all', label: t('dashboard.filter_all') },
              { key: 'fba', label: t('dashboard.filter_fba') },
              { key: 'high', label: t('dashboard.filter_high') }
            ].map(tab => (
              <div key={tab.key} onClick={() => setActivePickTab(tab.key)}
                style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', cursor: 'pointer', border: `0.5px solid ${activePickTab === tab.key ? '#1d1d1f' : '#d2d2d7'}`, background: activePickTab === tab.key ? '#1d1d1f' : 'white', color: activePickTab === tab.key ? 'white' : '#3c3c43' }}>
                {tab.label}
              </div>
            ))}
            <div onClick={fetchQuickPicks} style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', cursor: 'pointer', border: '0.5px solid #d2d2d7', background: 'white', color: '#0071e3' }}>
              {t('dashboard.refresh')}
            </div>
          </div>
        </div>

        {picksLoading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{ width: '24px', height: '24px', border: '2px solid #f0f0f5', borderTop: '2px solid #0071e3', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 10px' }}></div>
            <div style={{ fontSize: '12px', color: '#8e8e93' }}>{t('dashboard.loading')}</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0' }}>
            {filteredPicks.slice(0, 8).map((pick, i) => (
              <div key={pick.asin} onClick={() => navigate(`/app/product/${pick.asin}`)}
                style={{ padding: '14px 16px', borderRight: (i % 4 !== 3) ? '0.5px solid #f5f5f7' : 'none', borderBottom: i < 4 ? '0.5px solid #f5f5f7' : 'none', cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f9f9f9'}
                onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', background: pick.badge_bg || '#f5f5f7', color: pick.badge_color || '#8e8e93', fontWeight: '500' }}>{pick.badge || '🔥 Trend'}</div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: pick.score_color || '#34c759' }}>{pick.niche_score}</div>
                </div>
                <div style={{ fontSize: '12px', fontWeight: '500', color: '#1d1d1f', lineHeight: '1.4', marginBottom: '6px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{pick.title}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f' }}>${pick.price}</div>
                  <div style={{ fontSize: '10px', color: '#8e8e93' }}>#{pick.bestseller_rank?.toLocaleString()}</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                  <div style={{ fontSize: '10px', color: pick.fba === 'FBA' ? '#0071e3' : '#b45309', fontWeight: '500' }}>{pick.fba}</div>
                  <div style={{ fontSize: '10px', color: '#34c759', fontWeight: '500' }}>{pick.est_revenue}</div>
                </div>
                <div style={{ height: '3px', background: '#f0f0f5', borderRadius: '2px', marginTop: '6px' }}>
                  <div style={{ height: '100%', borderRadius: '2px', background: pick.score_color || '#34c759', width: `${pick.niche_score}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* İki Kolon */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px', marginBottom: '12px' }}>
        <div style={{ background: 'white', borderRadius: '11px', border: '0.5px solid #e5e5ea' }}>
          <div style={{ padding: '13px 16px 10px', borderBottom: '0.5px solid #f5f5f7' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f' }}>{t('dashboard.activity_title')}</div>
          </div>
          <div style={{ padding: '8px 16px' }}>
            {[
              { text: 'yoga mat araması — 48 sonuç', time: '2 dk önce', color: '#0071e3' },
              { text: 'B07YX93GFC niş skoru — 82/100', time: '15 dk önce', color: '#34c759' },
              { text: 'Alibaba tedarikçi — silikon spatula', time: '1 saat önce', color: '#ff9f0a' },
              { text: '15 ASIN toplu analiz tamamlandı', time: '3 saat önce', color: '#af52de' },
              { text: 'Trendyol arbitraj — yoga mat $8.91', time: 'Dün 22:14', color: '#0071e3' },
            ].map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '8px 0', borderBottom: i < 4 ? '0.5px solid #f5f5f7' : 'none' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: a.color, flexShrink: 0, marginTop: '4px' }}></div>
                <div>
                  <div style={{ fontSize: '12px', color: '#3c3c43', lineHeight: '1.5' }}>{a.text}</div>
                  <div style={{ fontSize: '11px', color: '#aeaeb2', marginTop: '1px' }}>{a.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: '11px', border: '0.5px solid #e5e5ea', padding: '14px 16px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f', marginBottom: '12px' }}>{t('dashboard.tools_title')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
            {[
              { labelKey: 'tool_search', descKey: 'tool_search_desc', to: '/app/search', color: '#0071e3', bg: '#e8f0fe' },
              { labelKey: 'tool_niche', descKey: 'tool_niche_desc', to: '/app/niche', color: '#34c759', bg: '#e8f9ee' },
              { labelKey: 'tool_calc', descKey: 'tool_calc_desc', to: '/app/calculator', color: '#ff9f0a', bg: '#fff4e0' },
              { labelKey: 'tool_bulk', descKey: 'tool_bulk_desc', to: '/app/bulk', color: '#af52de', bg: '#f3e8ff' },
            ].map(tool => (
              <div key={tool.to} onClick={() => navigate(tool.to)} style={{ background: tool.bg, borderRadius: '9px', padding: '12px', cursor: 'pointer' }}>
                <div style={{ fontSize: '13px', fontWeight: '500', color: tool.color, marginBottom: '2px' }}>{t(`dashboard.${tool.labelKey}`)}</div>
                <div style={{ fontSize: '11px', color: '#8e8e93' }}>{t(`dashboard.${tool.descKey}`)}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: '12px', fontWeight: '500', color: '#8e8e93', marginBottom: '8px' }}>{t('dashboard.quick_search_label')}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
            {QUICK_SEARCHES.map(q => (
              <div key={q} onClick={() => navigate(`/app/search?q=${q.replace(/ /g, '+')}`)}
                style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '20px', border: '0.5px solid #d2d2d7', background: '#f5f5f7', color: '#3c3c43', cursor: 'pointer' }}>
                {q}
              </div>
            ))}
          </div>
        </div>
      </div>

      {recentPosts.length > 0 && (
        <div style={{ background: 'white', borderRadius: '11px', border: '0.5px solid #e5e5ea' }}>
          <div style={{ padding: '13px 16px 10px', borderBottom: '0.5px solid #f5f5f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f' }}>{t('dashboard.blog_title')}</div>
            <div onClick={() => navigate('/app/blog')} style={{ fontSize: '12px', color: '#0071e3', cursor: 'pointer' }}>{t('dashboard.blog_all')}</div>
          </div>
          <div style={{ padding: '8px 16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {recentPosts.map(post => (
              <div key={post.id} onClick={() => navigate(`/app/blog/${post.slug}`)} style={{ cursor: 'pointer', padding: '8px 0' }}>
                <div style={{ fontSize: '11px', color: '#0071e3', marginBottom: '4px', fontWeight: '500' }}>{post.category}</div>
                <div style={{ fontSize: '13px', fontWeight: '500', color: '#1d1d1f', lineHeight: '1.4', marginBottom: '4px' }}>{post.title_tr}</div>
                <div style={{ fontSize: '11px', color: '#8e8e93' }}>⏱ {post.read_time} dk · 👁 {post.view_count}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
