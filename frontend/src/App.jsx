import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import AuthPage from './pages/AuthPage'
import SearchPage from './pages/SearchPage'
import ProductPage from './pages/ProductPage'
import UnavailablePage from './pages/UnavailablePage'
import NichePage from './pages/NichePage'
import Dashboard from './pages/Dashboard'
import './App.css'

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token')
  return token ? children : <Navigate to="/auth" replace />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/" element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="product/:asin" element={<ProductPage />} />
          <Route path="unavailable" element={<UnavailablePage />} />
          <Route path="niche" element={<NichePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App