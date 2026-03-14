import { Outlet, NavLink } from 'react-router-dom'
import './Layout.css'

function Layout() {
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
        </nav>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout