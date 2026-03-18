import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import AuthPage from './pages/AuthPage'
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
          <Route path="sourcing" element={<SourcingPage />} />
          <Route path="bulk" element={<BulkPage />} />
          <Route path="blog-admin" element={<BlogAdminPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/:slug" element={<BlogPostPage />} />
          <Route path="/calculator" element={<CalculatorPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App