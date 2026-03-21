import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import axios from 'axios'

const PLAN_COLORS = {
  free:    { color: '#8e8e93', bg: '#f5f5f7', border: '#e5e5ea' },
  starter: { color: '#0071e3', bg: '#e8f0fe', border: '#b8d0fa' },
  pro:     { color: '#1d1d1f', bg: '#1d1d1f', border: '#1d1d1f' },
  agency:  { color: '#af52de', bg: '#f3e8ff', border: '#d8b4fe' },
}

export default function PricingPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const [loadingPlan, setLoadingPlan] = useState(null)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const currentPlan = user.plan || 'free'

  const STATIC_PLANS = [
    {
      id: 'free', name: 'Free', price: 0,
      features: [t('pricing.features.searches_5'), t('pricing.features.basic'), t('pricing.features.niche_score')],
      cta: t('pricing.cta_free'), highlighted: false
    },
    {
      id: 'starter', name: 'Starter', price: 19,
      features: [t('pricing.features.searches_50'), t('pricing.features.lovehate'), t('pricing.features.euro_flips'), t('pricing.features.email_support')],
      cta: t('pricing.cta_starter'), highlighted: false
    },
    {
      id: 'pro', name: 'Pro', price: 49,
      features: [t('pricing.features.searches_200'), t('pricing.features.paneu'), t('pricing.features.supplier'), t('pricing.features.priority_support')],
      cta: t('pricing.cta_pro'), highlighted: true
    },
    {
      id: 'agency', name: 'Agency', price: 99,
      features: [t('pricing.features.searches_unlimited'), t('pricing.features.api'), t('pricing.features.white_label'), t('pricing.features.dedicated')],
      cta: t('pricing.cta_agency'), highlighted: false
    },
  ]

  useEffect(() => {
    if (searchParams.get('upgrade') === 'success') {
      setSuccessMsg('🎉 ' + t('pricing.upgrade_success'))
    }
  }, [])

  const handleSubscribe = async (plan) => {
    setErrorMsg('')
    if (plan.id === 'free') { navigate('/app/dashboard'); return }
    if (plan.id === currentPlan) return
    if (!user.email || user.is_guest) { navigate('/auth'); return }

    setLoadingPlan(plan.id)
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL || ''}/api/payments/create-checkout`, {
        plan: plan.id,
        user_email: user.email,
      })
      window.location.href = res.data.checkout_url
    } catch (err) {
      console.error(err)
      setErrorMsg(t('pricing.checkout_error'))
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

      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ fontSize: '28px', fontWeight: '700', color: '#1d1d1f', letterSpacing: '-0.5px', marginBottom: '8px' }}>
          {t('pricing.page_title')}
        </div>
        <div style={{ fontSize: '15px', color: '#8e8e93' }}>{t('pricing.page_subtitle')}</div>
        <div style={{ display: 'inline-flex', gap: '20px', marginTop: '16px', padding: '10px 20px', background: '#f5f5f7', borderRadius: '20px' }}>
          {[
            { name: 'Helium 10', price: '$97' + t('pricing.per_month') },
            { name: 'Jungle Scout', price: '$49' + t('pricing.per_month') },
            { name: 'AmazenLens', price: '$19' + t('pricing.per_month'), highlight: true },
          ].map(c => (
            <div key={c.name} style={{ fontSize: '12px', color: c.highlight ? '#0071e3' : '#8e8e93', fontWeight: c.highlight ? '600' : '400' }}>
              {c.name} <span style={{ fontWeight: '600' }}>{c.price}</span>
              {c.highlight && ' 🎯'}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '32px' }}>
        {STATIC_PLANS.map(plan => {
          const colors = PLAN_COLORS[plan.id] || PLAN_COLORS.free
          const isCurrent = plan.id === currentPlan
          const isPro = plan.highlighted

          return (
            <div key={plan.id} style={{ borderRadius: '14px', border: `1px solid ${isPro ? '#1d1d1f' : colors.border}`, background: isPro ? '#1d1d1f' : 'white', padding: '20px', position: 'relative', display: 'flex', flexDirection: 'column' }}>
              {isPro && (
                <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#0071e3', color: 'white', fontSize: '11px', fontWeight: '600', padding: '3px 14px', borderRadius: '20px', whiteSpace: 'nowrap' }}>
                  {t('pricing.most_popular')}
                </div>
              )}
              {isCurrent && (
                <div style={{ position: 'absolute', top: 12, right: 12, background: '#34c759', color: 'white', fontSize: '10px', fontWeight: '600', padding: '2px 8px', borderRadius: '10px' }}>
                  {t('pricing.current_plan')}
                </div>
              )}
              <div style={{ fontSize: '15px', fontWeight: '600', color: isPro ? 'white' : '#1d1d1f', marginBottom: '8px' }}>{plan.name}</div>
              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontSize: '32px', fontWeight: '700', color: isPro ? 'white' : '#1d1d1f', letterSpacing: '-1px' }}>${plan.price}</span>
                <span style={{ fontSize: '13px', color: isPro ? 'rgba(255,255,255,0.5)' : '#8e8e93' }}>{t('pricing.per_month')}</span>
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
                {isCurrent ? t('pricing.current_plan') : plan.cta}
              </button>
            </div>
          )
        })}
      </div>

      <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '24px' }}>
        <div style={{ fontSize: '16px', fontWeight: '600', color: '#1d1d1f', marginBottom: '16px' }}>{t('faq.title')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {[
            { q: t('faq.q3'), a: t('faq.a3') },
            { q: t('pricing.faq_security_q'), a: t('pricing.faq_security_a') },
            { q: t('pricing.faq_upgrade_q'), a: t('pricing.faq_upgrade_a') },
            { q: t('pricing.faq_invoice_q'), a: t('pricing.faq_invoice_a') },
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
