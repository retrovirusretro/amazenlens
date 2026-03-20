import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'

const API = 'https://amazenlens-production.up.railway.app'

const STATIC_PLANS = [
  {
    id: 'free', name: 'Free', price: 0, period: 'ay',
    features: ['5 arama/gün', 'Temel özellikler', 'Niş skoru'],
    cta: 'Ücretsiz Başla', highlighted: false
  },
  {
    id: 'starter', name: 'Starter', price: 19, period: 'ay',
    features: ['50 arama/gün', 'Tüm Faz 1 özellikleri', 'Love/Hate analizi', 'Euro Flips arbitraj', 'Email destek'],
    cta: 'Starter Başla', highlighted: false
  },
  {
    id: 'pro', name: 'Pro', price: 49, period: 'ay',
    features: ['200 arama/gün', 'Tüm özellikler', 'Pan-EU kar hesabı', 'DHgate + Türk tedarikçi', 'Öncelikli destek'],
    cta: 'Pro Başla', highlighted: true
  },
  {
    id: 'agency', name: 'Agency', price: 99, period: 'ay',
    features: ['Sınırsız arama', 'Tüm özellikler', 'API erişimi', 'Dedicated destek', 'White-label hazırlık'],
    cta: 'Agency Başla', highlighted: false
  },
]

const PLAN_COLORS = {
  free:    { color: '#8e8e93', bg: '#f5f5f7', border: '#e5e5ea' },
  starter: { color: '#0071e3', bg: '#e8f0fe', border: '#b8d0fa' },
  pro:     { color: '#1d1d1f', bg: '#1d1d1f', border: '#1d1d1f' },
  agency:  { color: '#af52de', bg: '#f3e8ff', border: '#d8b4fe' },
}

export default function PricingPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [plans, setPlans] = useState(STATIC_PLANS)
  const [loadingPlan, setLoadingPlan] = useState(null)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const currentPlan = user.plan || 'free'

  useEffect(() => {
    if (searchParams.get('upgrade') === 'success') {
      setSuccessMsg('🎉 Aboneliğin başarıyla aktifleşti! Hoş geldin.')
    }
  }, [])

  const handleSubscribe = async (plan) => {
    setErrorMsg('')

    if (plan.id === 'free') { navigate('/app/dashboard'); return }
    if (plan.id === currentPlan) return

    if (!user.email || user.is_guest) {
      navigate('/auth')
      return
    }

    setLoadingPlan(plan.id)
    try {
      const res = await axios.post(`${API}/api/payments/create-checkout`, {
        plan: plan.id,
        user_email: user.email,
      })
      window.location.href = res.data.checkout_url
    } catch (err) {
      console.error(err)
      setErrorMsg('Ödeme sayfası açılamadı. Lütfen tekrar dene.')
    } finally {
      setLoadingPlan(null)
    }
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", maxWidth: '900px' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {successMsg && (
        <div style={{ background: '#e8f9ee', border: '0.5px solid #b7f0c8', borderRadius: '10px', padding: '14px 20px', marginBottom: '20px', fontSize: '14px', color: '#1a7f37', fontWeight: '500' }}>
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div style={{ background: '#fff1f0', border: '0.5px solid #ffd0ce', borderRadius: '10px', padding: '14px 20px', marginBottom: '20px', fontSize: '14px', color: '#c00' }}>
          {errorMsg}
        </div>
      )}

      {/* Başlık */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ fontSize: '28px', fontWeight: '700', color: '#1d1d1f', letterSpacing: '-0.5px', marginBottom: '8px' }}>
          Basit, Şeffaf Fiyatlandırma
        </div>
        <div style={{ fontSize: '15px', color: '#8e8e93' }}>
          İstediğin zaman iptal et. Kredi kartı zorunlu değil (Free plan için).
        </div>
        <div style={{ display: 'inline-flex', gap: '20px', marginTop: '16px', padding: '10px 20px', background: '#f5f5f7', borderRadius: '20px' }}>
          {[
            { name: 'Helium 10', price: '$97/ay' },
            { name: 'Jungle Scout', price: '$49/ay' },
            { name: 'AmazenLens', price: '$19/ay', highlight: true },
          ].map(c => (
            <div key={c.name} style={{ fontSize: '12px', color: c.highlight ? '#0071e3' : '#8e8e93', fontWeight: c.highlight ? '600' : '400' }}>
              {c.name} <span style={{ fontWeight: '600' }}>{c.price}</span>
              {c.highlight && ' 🎯'}
            </div>
          ))}
        </div>
      </div>

      {/* Plan Kartları */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '32px' }}>
        {plans.map(plan => {
          const colors = PLAN_COLORS[plan.id] || PLAN_COLORS.free
          const isCurrent = plan.id === currentPlan
          const isPro = plan.highlighted

          return (
            <div key={plan.id} style={{ borderRadius: '14px', border: `1px solid ${isPro ? '#1d1d1f' : colors.border}`, background: isPro ? '#1d1d1f' : 'white', padding: '20px', position: 'relative', display: 'flex', flexDirection: 'column' }}>

              {isPro && (
                <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#0071e3', color: 'white', fontSize: '11px', fontWeight: '600', padding: '3px 14px', borderRadius: '20px', whiteSpace: 'nowrap' }}>
                  EN POPÜLER
                </div>
              )}

              {isCurrent && (
                <div style={{ position: 'absolute', top: 12, right: 12, background: '#34c759', color: 'white', fontSize: '10px', fontWeight: '600', padding: '2px 8px', borderRadius: '10px' }}>
                  Mevcut
                </div>
              )}

              <div style={{ fontSize: '15px', fontWeight: '600', color: isPro ? 'white' : '#1d1d1f', marginBottom: '8px' }}>{plan.name}</div>

              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontSize: '32px', fontWeight: '700', color: isPro ? 'white' : '#1d1d1f', letterSpacing: '-1px' }}>${plan.price}</span>
                <span style={{ fontSize: '13px', color: isPro ? 'rgba(255,255,255,0.5)' : '#8e8e93' }}>/{plan.period}</span>
              </div>

              <div style={{ flex: 1, marginBottom: '20px' }}>
                {plan.features.map((f, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', fontSize: '12px', color: isPro ? 'rgba(255,255,255,0.8)' : '#3c3c43' }}>
                    <span style={{ color: '#34c759', flexShrink: 0 }}>✓</span>
                    {f}
                  </div>
                ))}
              </div>

              <button onClick={() => handleSubscribe(plan)} disabled={isCurrent || loadingPlan === plan.id}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: '600', cursor: isCurrent ? 'default' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  background: isCurrent ? (isPro ? 'rgba(255,255,255,0.15)' : '#f5f5f7') : isPro ? '#0071e3' : colors.bg,
                  color: isCurrent ? (isPro ? 'rgba(255,255,255,0.5)' : '#8e8e93') : isPro ? 'white' : colors.color,
                }}>
                {loadingPlan === plan.id && (
                  <div style={{ width: '14px', height: '14px', border: `2px solid ${isPro ? 'rgba(255,255,255,0.3)' : '#d2d2d7'}`, borderTop: `2px solid ${isPro ? 'white' : colors.color}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
                )}
                {isCurrent ? 'Mevcut Plan' : plan.cta}
              </button>
            </div>
          )
        })}
      </div>

      {/* SSS */}
      <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '24px' }}>
        <div style={{ fontSize: '16px', fontWeight: '600', color: '#1d1d1f', marginBottom: '16px' }}>Sık Sorulan Sorular</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {[
            { q: 'İstediğin zaman iptal edebilir misin?', a: 'Evet, istediğin zaman iptal edebilirsin. Dönem sonuna kadar erişimin devam eder.' },
            { q: 'Kredi kartı bilgileri güvende mi?', a: 'Ödeme işlemleri Stripe altyapısıyla yapılır. Kart bilgilerin AmazenLens sunucularına ulaşmaz.' },
            { q: 'Ücretsiz plandan yükseltebilir misin?', a: 'Evet! İstediğin zaman upgrade yapabilirsin. Fark ücret orantılı hesaplanır.' },
            { q: 'Fatura alabilir misin?', a: 'Stripe otomatik fatura keser. Stripe portalı üzerinden PDF olarak indirebilirsin.' },
          ].map(item => (
            <div key={item.q} style={{ padding: '14px', background: '#f5f5f7', borderRadius: '10px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f', marginBottom: '6px' }}>{item.q}</div>
              <div style={{ fontSize: '12px', color: '#8e8e93', lineHeight: '1.6' }}>{item.a}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
