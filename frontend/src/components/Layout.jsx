import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import './Layout.css'

function Layout() {
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/auth')
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="logo">
          <h2>🔍 AmazenLens</h2>
        </div>
        <nav>
          <NavLink to="/dashboard" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
            📊 Dashboard
          </NavLink>
          <NavLink to="/search" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
            🔍 Ürün Ara
          </NavLink>
          <NavLink to="/unavailable" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
            🚫 Unavailable Scanner
          </NavLink>
          <NavLink to="/niche" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
            🎯 Niş Skoru
          </NavLink>
          <NavLink to="/sourcing" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
            🏭 Tedarik & Arbitraj
          </NavLink>
          <NavLink to="/bulk" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
            📦 Toplu Import
          </NavLink>
          <NavLink to="/blog-admin" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
            ✍️ Blog Yönetimi
          </NavLink>
        </nav>
        <div style={{padding: '16px 24px', marginTop: 'auto', borderTop: '1px solid #334155'}}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%', padding: '10px', background: 'transparent',
              border: '1px solid #475569', borderRadius: '8px',
              color: '#94a3b8', cursor: 'pointer', fontSize: '14px'
            }}
          >
            🚪 Çıkış Yap
          </button>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout