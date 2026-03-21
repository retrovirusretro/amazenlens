import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import LanguageSwitcher from './LanguageSwitcher'

const NAV = [
  {
    section: 'Ana',
    items: [
      { to: '/app/dashboard', label: 'Dashboard', icon: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
      { to: '/app/search', label: 'Ürün Ara', icon: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg> },
      { to: '/app/unavailable', label: 'Unavailable', icon: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg> },
      { to: '/app/calculator', label: 'Kar Hesabı', icon: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="12" y2="14"/></svg> },
      { to: '/app/pricing', label: 'Fiyatlandırma', icon: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg> },
    ]
  },
  {
    section: 'Analiz',
    items: [
      { to: '/app/niche', label: 'Niş Skoru', icon: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> },
      { to: '/app/keywords', label: 'Keyword Scanner', icon: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="12" y1="7" x2="12" y2="13"/></svg> },
      { to: '/app/sourcing', label: 'Tedarik & Arbitraj', icon: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg> },
      { to: '/app/bulk', label: 'Toplu Import', icon: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg> },
    ]
  },
  {
    section: 'İçerik',
    items: [
      { to: '/app/blog', label: 'Blog', icon: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg> },
      { to: '/app/blog-admin', label: 'Blog Yönetimi', adminOnly: true, icon: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg> },
    ]
  },
  {
    section: 'Topluluk',
    items: [
      { to: '/app/feedback', label: 'Geri Bildirim', icon: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> },
      { to: '/app/about', label: 'Hakkımızda', icon: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> },
    ]
  }
]

function Layout() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const initials = user.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user.email ? user.email[0].toUpperCase() : 'U'

  const planColors = {
    free:    { bg: '#f5f5f7', color: '#8e8e93' },
    trial:   { bg: '#fff4e0', color: '#ff9f0a' },
    starter: { bg: '#e8f0fe', color: '#0071e3' },
    pro:     { bg: '#e8f9ee', color: '#34c759' },
    agency:  { bg: '#f3e8ff', color: '#af52de' },
  }
  const plan = user.plan || 'free'
  const planStyle = planColors[plan] || planColors.free

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/')
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
        .app-layout { display: flex; min-height: 100vh; background: #f5f5f7; }
        .sidebar { width: 200px; background: #1d1d1f; display: flex; flex-direction: column; flex-shrink: 0; position: fixed; top: 0; left: 0; bottom: 0; z-index: 50; }
        .sb-logo { padding: 18px 16px 14px; border-bottom: 0.5px solid rgba(255,255,255,0.07); cursor: pointer; }
        .sb-logo-name { font-size: 14px; font-weight: 600; color: #f5f5f7; letter-spacing: -0.3px; }
        .sb-logo-tag { font-size: 10px; color: rgba(255,255,255,0.28); margin-top: 1px; }
        .sb-nav { flex: 1; overflow-y: auto; padding: 10px 8px; }
        .sb-section { margin-bottom: 4px; }
        .sb-section-label { font-size: 9px; color: rgba(255,255,255,0.22); letter-spacing: 0.8px; text-transform: uppercase; padding: 8px 8px 4px; }
        .nav-link { display: flex; align-items: center; gap: 8px; padding: 7px 8px; border-radius: 7px; color: rgba(255,255,255,0.42); font-size: 12.5px; font-weight: 400; margin-bottom: 1px; cursor: pointer; text-decoration: none; transition: all 0.15s; }
        .nav-link:hover { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.7); }
        .nav-link.active { background: rgba(255,255,255,0.09); color: #f5f5f7; }
        .nav-link svg { opacity: 0.5; flex-shrink: 0; }
        .nav-link.active svg { opacity: 1; }
        .sb-bottom { padding: 10px 8px; border-top: 0.5px solid rgba(255,255,255,0.07); }
        .user-row { display: flex; align-items: center; gap: 8px; padding: 7px 8px; border-radius: 7px; cursor: pointer; }
        .user-row:hover { background: rgba(255,255,255,0.05); }
        .user-avatar { width: 26px; height: 26px; border-radius: 50%; background: linear-gradient(135deg, #0071e3, #34aadc); display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 600; color: white; flex-shrink: 0; }
        .user-name { font-size: 12px; color: rgba(255,255,255,0.6); }
        .user-plan { font-size: 10px; color: rgba(255,255,255,0.24); }
        .logout-btn { display: flex; align-items: center; gap: 8px; padding: 7px 8px; border-radius: 7px; color: rgba(255,255,255,0.3); font-size: 12px; cursor: pointer; border: none; background: none; width: 100%; font-family: inherit; margin-top: 2px; }
        .logout-btn:hover { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.5); }
        .main-content { margin-left: 200px; flex: 1; min-height: 100vh; }
        .top-bar { background: white; border-bottom: 0.5px solid #e5e5ea; padding: 10px 24px; display: flex; align-items: center; justify-content: flex-end; }
        .page-content { padding: 24px; }
      `}</style>

      <div className="app-layout">
        <aside className="sidebar">
          <div className="sb-logo" onClick={() => navigate('/')}>
            <div className="sb-logo-name">AmazenLens</div>
            <div className="sb-logo-tag">Amazon Araştırma Platformu</div>
          </div>

          <nav className="sb-nav">
            {NAV.map(group => (
              <div key={group.section} className="sb-section">
                <div className="sb-section-label">{group.section}</div>
                {group.items
                  .filter(item => !item.adminOnly || user.is_admin)
                  .map(item => (
                    <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                      {item.icon}
                      {item.label}
                    </NavLink>
                  ))}
              </div>
            ))}
          </nav>

          <div className="sb-bottom">
            {user.lens_points > 0 && (
              <div onClick={() => navigate('/app/feedback')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 8px', borderRadius: '7px', cursor: 'pointer', marginBottom: '4px' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>🪙 Lens Puanı</div>
                <div style={{ fontSize: '11px', fontWeight: '600', color: '#ffd60a' }}>{user.lens_points?.toLocaleString()}</div>
              </div>
            )}

            <div onClick={() => navigate('/app/pricing')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 8px', borderRadius: '7px', cursor: 'pointer', marginBottom: '4px' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Mevcut Plan</div>
              <div style={{ fontSize: '10px', fontWeight: '600', padding: '2px 8px', borderRadius: '10px', background: planStyle.bg, color: planStyle.color }}>
                {plan.charAt(0).toUpperCase() + plan.slice(1)}
              </div>
            </div>

            <div className="user-row">
              <div className="user-avatar">{initials}</div>
              <div>
                <div className="user-name">{user.full_name || user.email?.split('@')[0] || 'Kullanıcı'}</div>
                <div className="user-plan">{user.email}</div>
              </div>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Çıkış Yap
            </button>
          </div>
        </aside>

        <main className="main-content">
          <div className="top-bar">
            <LanguageSwitcher />
          </div>
          <div className="page-content">
            <Outlet />
          </div>
        </main>
      </div>
    </>
  )
}

export default Layout
