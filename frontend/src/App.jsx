import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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
import './App.css'

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token')
  return token ? children : <Navigate to="/auth" replace />
}

function App() {
  return (
    <BrowserRouter>
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
        </Route>

        {/* Eski URL'leri yeni yapıya yönlendir */}
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
        <Route path="/blog-admin" element={<Navigate to="/app/blog-admin" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
