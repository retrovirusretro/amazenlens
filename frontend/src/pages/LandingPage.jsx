import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Helmet } from 'react-helmet-async'
import LanguageSwitcher from '../components/LanguageSwitcher'
import gsap from 'gsap'

const SITE = 'https://amazenlens.com'
const softwareSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'AmazenLens',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  url: SITE,
  description: 'Amazon FBA satıcıları için Türkçe ürün araştırma ve niş analiz platformu. Helium 10 alternatifi.',
  offers: { '@type': 'Offer', price: '19', priceCurrency: 'USD', priceValidUntil: '2026-12-31' },
  aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.8', reviewCount: '127' },
  publisher: { '@type': 'Organization', name: 'AmazenLens', url: SITE },
}
const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: 'AmazenLens nedir?', acceptedAnswer: { '@type': 'Answer', text: 'AmazenLens, Amazon FBA satıcıları için geliştirilmiş Türkçe destekli bir ürün araştırma ve niş analiz platformudur.' } },
    { '@type': 'Question', name: 'Helium 10\'dan farkı nedir?', acceptedAnswer: { '@type': 'Answer', text: 'AmazenLens Türkçe arayüz, Trendyol arbitrajı ve Alibaba entegrasyonu sunar. Fiyatı ise Helium 10\'un beşte biridir.' } },
    { '@type': 'Question', name: 'Ücretsiz deneme var mı?', acceptedAnswer: { '@type': 'Answer', text: 'Evet, 7 gün ücretsiz deneme sunulmaktadır. Kredi kartı gerekmez.' } },
    { '@type': 'Question', name: 'Hangi pazaryerlerini destekliyor?', acceptedAnswer: { '@type': 'Answer', text: 'Amazon.com, Amazon.de, Amazon.co.uk ve diğer Amazon pazaryerleri ile Trendyol ve Alibaba desteklenmektedir.' } },
  ],
}

export default function LandingPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [scrollY, setScrollY] = useState(0)
  const [openFaq, setOpenFaq] = useState(null)
  const [activeVideo, setActiveVideo] = useState(0)
  const heroRef = useRef(null)

  // Demo video ID'leri — YouTube video ID'lerini buraya girin
  const DEMO_VIDEOS = [
    { id: 'REPLACE_VIDEO_ID_1', title: t('demo.v1_title'), desc: t('demo.v1_desc'), icon: '🎯' },
    { id: 'REPLACE_VIDEO_ID_2', title: t('demo.v2_title'), desc: t('demo.v2_desc'), icon: '💚' },
    { id: 'REPLACE_VIDEO_ID_3', title: t('demo.v3_title'), desc: t('demo.v3_desc'), icon: '🇪🇺' },
    { id: 'REPLACE_VIDEO_ID_4', title: t('demo.v4_title'), desc: t('demo.v4_desc'), icon: '📊' },
  ]

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (!heroRef.current) return
    const ctx = gsap.context(() => {
      gsap.from('.hero-badge', { opacity: 0, y: 24, duration: 0.6, ease: 'power3.out' })
      gsap.from('.hero-h1', { opacity: 0, y: 32, duration: 0.7, ease: 'power3.out', delay: 0.12 })
      gsap.from('.hero-desc', { opacity: 0, y: 20, duration: 0.6, ease: 'power3.out', delay: 0.28 })
      gsap.from('.hero-btns', { opacity: 0, y: 16, duration: 0.5, ease: 'power2.out', delay: 0.42 })
      gsap.from('.hero-chip', { opacity: 0, y: 12, duration: 0.4, ease: 'power2.out', stagger: 0.07, delay: 0.55 })
    }, heroRef)
    return () => ctx.revert()
  }, [])

  const FEATURES = [
    { icon: '🎯', title: t('features.niche_title'), desc: t('features.niche_desc'), ai: 'Claude AI' },
    { icon: '💚', title: t('features.lovehate_title'), desc: t('features.lovehate_desc'), ai: 'Claude AI' },
    { icon: '🇪🇺', title: t('features.euro_title'), desc: t('features.euro_desc'), ai: null },
    { icon: '🇹🇷', title: t('features.supplier_title'), desc: t('features.supplier_desc'), ai: null },
    { icon: '🔍', title: t('features.scanner_title'), desc: t('features.scanner_desc'), ai: 'AI' },
    { icon: '📊', title: t('features.paneu_title'), desc: t('features.paneu_desc'), ai: null },
    { icon: '🔤', title: t('features.keyword_title'), desc: t('features.keyword_desc'), ai: 'AI' },
    { icon: '📦', title: t('features.bulk_title'), desc: t('features.bulk_desc'), ai: null },
    { icon: '🔑', title: t('features.api_title'), desc: t('features.api_desc'), ai: 'B2B' },
  ]

  const PRODUCTS = [
    { icon: '🏮', title: 'LED Masa Lambası USB Şarjlı 3 Mod', price: '$22.99 · BSR #3,102 · FBA', score: 91, high: true },
    { icon: '🧘', title: 'Silikon Spatula Seti 6 Parça', price: '$24.99 · BSR #2,340 · FBA', score: 87, high: true },
    { icon: '💻', title: 'Laptop Stand Aluminum Portable', price: '$32.99 · BSR #3,891 · FBA', score: 79, high: false },
  ]

  const PLANS = [
    { name: 'Free', price: 0, features: [t('pricing.features.searches_5'), t('pricing.features.niche_score'), t('pricing.features.basic')], featured: false },
    { name: 'Starter', price: 24, features: [t('pricing.features.searches_50'), t('pricing.features.lovehate'), t('pricing.features.euro_flips'), t('pricing.features.email_support')], featured: false },
    { name: 'Pro', price: 49, features: [t('pricing.features.searches_200'), t('pricing.features.paneu'), t('pricing.features.supplier'), t('pricing.features.priority_support')], featured: true },
    { name: 'Agency', price: 99, features: [t('pricing.features.searches_unlimited'), t('pricing.features.api'), t('pricing.features.white_label'), t('pricing.features.dedicated')], featured: false },
  ]

  const FAQS = [
    { q: t('faq.q1'), a: t('faq.a1') },
    { q: t('faq.q2'), a: t('faq.a2') },
    { q: t('faq.q3'), a: t('faq.a3') },
    { q: t('faq.q4'), a: t('faq.a4') },
    { q: t('faq.q5'), a: t('faq.a5') },
    { q: t('faq.q6'), a: t('faq.a6') },
  ]

  return (
    <>
    <Helmet>
      <title>AmazenLens — Amazon Satıcıları için Türkçe Araştırma Platformu</title>
      <meta name="description" content="Amazon FBA ürün araştırması, niş analizi, Trendyol arbitrajı ve Alibaba entegrasyonu. Helium 10'dan 5x ucuz, Türkçe arayüz. 7 gün ücretsiz dene." />
      <meta name="keywords" content="amazon ürün araştırma, amazon fba türkçe, helium 10 alternatif, jungle scout alternatif, amazon niş analizi, trendyol arbitraj" />
      <meta property="og:title" content="AmazenLens — Amazon Satıcıları için Türkçe Araştırma Platformu" />
      <meta property="og:description" content="Amazon FBA ürün araştırması ve niş analizi. Türkçe arayüz, 5x ucuz fiyat. 7 gün ücretsiz dene." />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={SITE} />
      <meta property="og:image" content={`${SITE}/logo-light.svg`} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="AmazenLens — Amazon Araştırma Platformu" />
      <meta name="twitter:description" content="Amazon FBA için Türkçe niş analizi ve ürün araştırması. $19/ay'dan başlayan fiyatlar." />
      <link rel="canonical" href={SITE} />
      <script type="application/ld+json">{JSON.stringify(softwareSchema)}</script>
      <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
    </Helmet>
    <div style={{ fontFamily: "'Space Grotesk', sans-serif", background: '#fafafa', overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes glow { 0%,100%{box-shadow:0 0 0 0 rgba(52,211,153,0.4)} 50%{box-shadow:0 0 0 6px rgba(52,211,153,0)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .hero-btn:hover { transform: scale(1.02); }
        .feat-card:hover { transform: translateY(-3px); box-shadow: 0 8px 32px rgba(0,0,0,0.08); }
        .plan-card:hover { transform: translateY(-3px); }
        .nav-link { color: #71717a; font-size: 13px; text-decoration: none; font-weight: 500; transition: color 0.15s; }
        .nav-link:hover { color: #09090b; }
      `}</style>

      {/* NAV */}
      <nav style={{ padding: '18px 60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: scrollY > 20 ? 'rgba(255,255,255,0.95)' : 'white', borderBottom: '1px solid #e4e4e7', position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(20px)', transition: 'all 0.3s' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img src="/logo-light.svg" alt="AmazenLens" style={{ height: '32px', objectFit: 'contain' }} />
        </div>
        <div style={{ display: 'flex', gap: '28px' }}>
          <a href="#özellikler" className="nav-link">{t('nav.features')}</a>
          <a href="#fiyatlar" className="nav-link">{t('nav.pricing')}</a>
          <a href="/app/blog" className="nav-link">{t('nav.blog')}</a>
          <a href="#roadmap" className="nav-link">{t('nav.roadmap')}</a>
          <a href="/app/api-docs" className="nav-link">API</a>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <LanguageSwitcher />
          <button onClick={() => navigate('/auth')} style={{ background: 'none', border: '1px solid #e4e4e7', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '500' }}>{t('nav.login')}</button>
          <button onClick={() => navigate('/auth')} style={{ background: 'linear-gradient(135deg, #6366f1, #ec4899)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '500' }}>{t('nav.start_free')}</button>
        </div>
      </nav>

      {/* HERO */}
      <div ref={heroRef} style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4c1d95 70%, #701a75 100%)', minHeight: '90vh', display: 'flex', alignItems: 'center', padding: '80px 60px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>

        <div style={{ maxWidth: '560px', position: 'relative', zIndex: 1 }}>
          <div className="hero-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '100px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', fontSize: '12px', fontWeight: '500', marginBottom: '28px', backdropFilter: 'blur(10px)' }}>
            <div style={{ width: '6px', height: '6px', background: '#34d399', borderRadius: '50%', animation: 'glow 2s ease-in-out infinite' }}></div>
            {t('hero.badge')}
          </div>

          <h1 className="hero-h1" style={{ fontSize: '68px', fontWeight: '700', lineHeight: '1', letterSpacing: '-2px', color: 'white', marginBottom: '20px' }}>
            {t('hero.title_line1')}<br />
            <span style={{ background: 'linear-gradient(135deg, #a78bfa, #f472b6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{t('hero.title_highlight')}</span><br />
            {t('hero.title_line3')}
          </h1>

          <p className="hero-desc" style={{ fontSize: '17px', color: 'rgba(255,255,255,0.65)', lineHeight: '1.7', marginBottom: '36px', maxWidth: '480px' }}>
            {t('hero.desc')}
          </p>

          <div className="hero-btns" style={{ display: 'flex', gap: '12px', marginBottom: '40px' }}>
            <button className="hero-btn" onClick={() => navigate('/auth')} style={{ background: 'white', color: '#09090b', border: 'none', padding: '14px 28px', borderRadius: '10px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', transition: 'transform 0.2s' }}>
              {t('hero.cta_primary')}
            </button>
            <button className="hero-btn" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '14px 28px', borderRadius: '10px', fontSize: '15px', cursor: 'pointer', fontFamily: 'inherit', backdropFilter: 'blur(10px)', transition: 'transform 0.2s' }}>
              {t('hero.cta_secondary')}
            </button>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {['🎯 Niş Skoru AI', '💚 Love/Hate', '🇪🇺 Euro Flips', '🔑 API v1', '📦 Toplu Import'].map(chip => (
              <div key={chip} className="hero-chip" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)', fontSize: '12px', fontWeight: '500' }}>
                {chip}
              </div>
            ))}
          </div>
        </div>

        {/* Sağ — Mockup */}
        <div style={{ flex: 1, paddingLeft: '60px', position: 'relative', zIndex: 1 }}>
          <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: '16px', padding: '20px', boxShadow: '0 40px 80px rgba(0,0,0,0.4)' }}>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
              {['#ff5f57', '#febc2e', '#28c840'].map(c => <div key={c} style={{ width: '10px', height: '10px', borderRadius: '50%', background: c }}></div>)}
            </div>
            {PRODUCTS.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', borderRadius: '10px', background: '#f4f4f5', marginBottom: '8px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'linear-gradient(135deg, #e0e7ff, #fce7f3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>{p.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#09090b' }}>{p.title}</div>
                  <div style={{ fontSize: '10px', color: '#71717a' }}>{p.price}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', fontSize: '12px', fontWeight: '700', background: p.high ? '#d1fae5' : '#fef3c7', color: p.high ? '#065f46' : '#92400e' }}>
                  {p.score}
                </div>
              </div>
            ))}
            <div style={{ background: 'linear-gradient(135deg, #ede9fe, #fce7f3)', borderRadius: '10px', padding: '12px', marginTop: '10px' }}>
              <div style={{ fontSize: '10px', fontWeight: '600', color: '#6366f1', marginBottom: '6px' }}>✦ Claude AI Analizi</div>
              <div style={{ fontSize: '11px', color: '#374151', lineHeight: '1.5' }}>LED Masa Lambası için güçlü BSR trendi tespit edildi. Review velocity artışı yüksek talep büyümesini doğruluyor — hemen gir fırsatı var.</div>
            </div>
          </div>
        </div>
      </div>

      {/* LOGOS BAR */}
      <div style={{ background: 'white', padding: '24px 60px', borderBottom: '1px solid #e4e4e7', display: 'flex', alignItems: 'center', gap: '24px' }}>
        <span style={{ fontSize: '12px', color: '#71717a', whiteSpace: 'nowrap', fontWeight: '500' }}>{t('compare.label')}</span>
        <div style={{ display: 'flex', gap: '32px', alignItems: 'center', flexWrap: 'wrap' }}>
          {[
            { name: 'Helium 10 $97/mo', crossed: true },
            { name: 'Jungle Scout $49/mo', crossed: true },
            { name: 'AMZScout $45/mo', crossed: true },
            { name: '✓ AmazenLens $24/mo', crossed: false },
          ].map(c => (
            <span key={c.name} style={{ fontSize: '13px', color: c.crossed ? '#a1a1aa' : '#6366f1', fontWeight: '600', textDecoration: c.crossed ? 'line-through' : 'none' }}>{c.name}</span>
          ))}
        </div>
      </div>

      {/* FEATURES */}
      <div id="özellikler" style={{ padding: '80px 60px', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '600', color: '#6366f1', background: '#eef2ff', padding: '4px 12px', borderRadius: '100px', marginBottom: '16px' }}>✦ {t('features.section_label')}</div>
        <h2 style={{ fontSize: '44px', fontWeight: '700', letterSpacing: '-1.5px', marginBottom: '48px' }}>
          {t('features.title')}<br />
          <span style={{ background: 'linear-gradient(135deg, #6366f1, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{t('features.title_highlight')}</span>
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {FEATURES.map((f, i) => (
            <div key={i} className="feat-card" style={{ background: 'white', border: '1px solid #e4e4e7', borderRadius: '16px', padding: '24px', transition: 'all 0.2s', cursor: 'default' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ fontSize: '24px' }}>{f.icon}</div>
                {f.ai && <div style={{ fontSize: '10px', background: '#eef2ff', color: '#6366f1', padding: '3px 8px', borderRadius: '100px', fontWeight: '600' }}>{f.ai}</div>}
              </div>
              <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '8px' }}>{f.title}</div>
              <div style={{ fontSize: '13px', color: '#71717a', lineHeight: '1.6' }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* DEMO VIDEO */}
      <div id="demo" style={{ padding: '80px 60px', background: '#09090b' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '600', color: '#a78bfa', background: 'rgba(167,139,250,0.1)', padding: '4px 12px', borderRadius: '100px', marginBottom: '16px' }}>▶ {t('demo.label')}</div>
            <h2 style={{ fontSize: '44px', fontWeight: '700', letterSpacing: '-1.5px', color: 'white', marginBottom: '12px' }}>{t('demo.title')}</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '16px' }}>{t('demo.subtitle')}</p>
          </div>

          {/* Ana Video Player */}
          <div style={{ borderRadius: '16px', overflow: 'hidden', marginBottom: '20px', background: '#1c1917', border: '1px solid rgba(255,255,255,0.08)', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            {DEMO_VIDEOS[activeVideo].id.startsWith('REPLACE') ? (
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>{DEMO_VIDEOS[activeVideo].icon}</div>
                <div style={{ fontSize: '18px', fontWeight: '600', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>{DEMO_VIDEOS[activeVideo].title}</div>
                <div style={{ fontSize: '13px' }}>Video yakında eklenecek</div>
              </div>
            ) : (
              <iframe
                width="100%" height="100%"
                src={`https://www.youtube.com/embed/${DEMO_VIDEOS[activeVideo].id}?autoplay=1&rel=0`}
                title={DEMO_VIDEOS[activeVideo].title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ display: 'block' }}
              />
            )}
          </div>

          {/* 4 Video Tab */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            {DEMO_VIDEOS.map((v, i) => (
              <button key={i} onClick={() => setActiveVideo(i)}
                style={{ padding: '16px', borderRadius: '12px', border: activeVideo === i ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.08)', background: activeVideo === i ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', fontFamily: 'inherit' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>{v.icon}</div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: activeVideo === i ? '#a78bfa' : 'rgba(255,255,255,0.7)', marginBottom: '4px' }}>{v.title}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', lineHeight: '1.4' }}>{v.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ROADMAP */}
      <div id="roadmap" style={{ background: 'linear-gradient(135deg, #1e1b4b, #312e81)', padding: '80px 60px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '600', color: '#a78bfa', background: 'rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: '100px', marginBottom: '16px' }}>{t('roadmap.section_label')}</div>
          <h2 style={{ fontSize: '44px', fontWeight: '700', letterSpacing: '-1.5px', color: 'white', marginBottom: '8px' }}>{t('roadmap.title')}</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '16px', marginBottom: '48px' }}>{t('roadmap.subtitle')}</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
            {[
              {
                label: `✅ ${t('roadmap.phase1_label')}`, color: '#34d399', chipBg: 'rgba(52,211,153,0.15)', chipColor: '#34d399', chipText: t('roadmap.chip_active'),
                items: ['Niş Skoru (100pt)', 'Love/Hate AI', 'Euro Flips Arbitraj', 'Pan-EU FBA Hesabı', 'Keyword Scanner', 'Toplu Import (500 ASIN)', 'API v1 (B2B)', 'Blog Sistemi'],
                done: true
              },
              {
                label: `🚀 ${t('roadmap.phase2_label')}`, color: '#818cf8', chipBg: 'rgba(129,140,248,0.15)', chipColor: '#818cf8', chipText: t('roadmap.chip_soon'),
                items: ['Chrome Extension', 'Trend Radar', 'WhatsApp / Telegram Alerts', 'Business Valuation', 'Product Opportunity Gap', 'AI Listing Optimizer'],
                done: false
              },
              {
                label: `🔮 ${t('roadmap.phase3_label')}`, color: '#f472b6', chipBg: 'rgba(244,114,182,0.15)', chipColor: '#f472b6', chipText: t('roadmap.chip_future'),
                items: ['Mobile App', 'Barcode Scanner', 'RapidAPI Marketplace', 'Seller Segmentation', 'SnapSearch (Visual)', 'Easyparser WebSocket'],
                done: false
              }
            ].map((phase, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '24px', backdropFilter: 'blur(10px)' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', color: phase.color, marginBottom: '16px' }}>{phase.label}</div>
                {phase.items.map((item, j) => (
                  <div key={j} style={{ fontSize: '13px', color: phase.done ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.6)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: phase.color, flexShrink: 0 }}></div>
                    {item}
                    <span style={{ fontSize: '9px', fontWeight: '600', padding: '2px 6px', borderRadius: '4px', background: phase.chipBg, color: phase.chipColor, marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                      {phase.chipText}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* API SECTION */}
      <div style={{ background: '#09090b', padding: '80px 60px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '60px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1', minWidth: '280px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '600', color: '#34d399', background: 'rgba(52,211,153,0.1)', padding: '4px 12px', borderRadius: '100px', marginBottom: '16px' }}>🔑 API v1</div>
              <h2 style={{ fontSize: '38px', fontWeight: '700', letterSpacing: '-1.5px', color: 'white', marginBottom: '12px' }}>Amazon zekasını<br />uygulamanıza taşıyın</h2>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '15px', lineHeight: '1.7', marginBottom: '28px' }}>4 endpoint, tek key. Niş skoru, keyword analizi ve yorum sentiment'i kendi SaaS'ınıza veya ajans aracınıza entegre edin.</p>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '28px' }}>
                {[
                  { label: '100 sorgu/ay', sub: 'Ücretsiz' },
                  { label: '5.000 sorgu/ay', sub: '$49/ay' },
                  { label: '25.000 sorgu/ay', sub: '$149/ay' },
                ].map((t, i) => (
                  <div key={i} style={{ padding: '10px 16px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: 'white' }}>{t.label}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{t.sub}</div>
                  </div>
                ))}
              </div>
              <button onClick={() => navigate('/auth')} style={{ background: 'white', color: '#09090b', border: 'none', padding: '12px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
                API Docs →
              </button>
            </div>
            <div style={{ flex: '1', minWidth: '320px' }}>
              <div style={{ background: '#111', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '6px' }}>
                  {['#ff5f57', '#febc2e', '#28c840'].map(c => <div key={c} style={{ width: '10px', height: '10px', borderRadius: '50%', background: c }} />)}
                </div>
                <div style={{ padding: '20px', fontFamily: 'monospace', fontSize: '12px', lineHeight: '1.8' }}>
                  <div style={{ color: '#71717a' }}># Niş skoru al</div>
                  <div><span style={{ color: '#818cf8' }}>GET</span> <span style={{ color: '#34d399' }}>/v1/niche/score</span></div>
                  <div style={{ color: '#71717a', marginTop: '4px' }}>  ?asin=B07QK955LS&marketplace=US</div>
                  <div style={{ color: '#f472b6' }}>  X-API-Key: al_xxxxxxxx</div>
                  <div style={{ marginTop: '16px', color: '#71717a' }}># Yanıt</div>
                  <div style={{ color: '#e4e4e7' }}>{'{'}</div>
                  <div style={{ paddingLeft: '16px' }}>
                    <div><span style={{ color: '#fbbf24' }}>"total"</span><span style={{ color: '#e4e4e7' }}>: </span><span style={{ color: '#34d399' }}>87</span><span style={{ color: '#e4e4e7' }}>,</span></div>
                    <div><span style={{ color: '#fbbf24' }}>"verdict"</span><span style={{ color: '#e4e4e7' }}>: </span><span style={{ color: '#a78bfa' }}>"🟢 Excellent"</span><span style={{ color: '#e4e4e7' }}>,</span></div>
                    <div><span style={{ color: '#fbbf24' }}>"unmet_demand"</span><span style={{ color: '#e4e4e7' }}>: </span><span style={{ color: '#34d399' }}>true</span></div>
                  </div>
                  <div style={{ color: '#e4e4e7' }}>{'}'}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px' }}>
                {['/v1/niche/score', '/v1/keyword/analyze', '/v1/review/sentiment', '/v1/product/detail'].map(ep => (
                  <div key={ep} style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', fontSize: '11px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.5)' }}>
                    <span style={{ color: '#818cf8' }}>GET</span> {ep}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PRICING */}
      <div id="fiyatlar" style={{ padding: '80px 60px', maxWidth: '1000px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '44px', fontWeight: '700', letterSpacing: '-1.5px', textAlign: 'center', marginBottom: '8px' }}>{t('pricing.title')}</h2>
        <p style={{ textAlign: 'center', color: '#71717a', marginBottom: '48px', fontSize: '16px' }}>{t('pricing.subtitle')}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
          {PLANS.map(plan => (
            <div key={plan.name} className="plan-card" style={{ background: plan.featured ? 'linear-gradient(135deg, #1e1b4b, #312e81)' : 'white', border: plan.featured ? 'none' : '1px solid #e4e4e7', borderRadius: '16px', padding: '24px', position: 'relative', transition: 'transform 0.2s', cursor: 'default' }}>
              {plan.featured && (
                <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #6366f1, #ec4899)', color: 'white', fontSize: '10px', fontWeight: '700', padding: '3px 12px', borderRadius: '100px', whiteSpace: 'nowrap' }}>{t('pricing.most_popular')}</div>
              )}
              <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: plan.featured ? 'white' : '#09090b' }}>{plan.name}</div>
              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontSize: '40px', fontWeight: '700', letterSpacing: '-1px', color: plan.featured ? '#a78bfa' : '#6366f1' }}>${plan.price}</span>
                <span style={{ fontSize: '13px', color: plan.featured ? 'rgba(255,255,255,0.5)' : '#71717a' }}>{t('pricing.per_month')}</span>
              </div>
              <div style={{ marginBottom: '20px' }}>
                {plan.features.map((f, i) => (
                  <div key={i} style={{ fontSize: '12px', color: plan.featured ? 'rgba(255,255,255,0.7)' : '#71717a', marginBottom: '8px', display: 'flex', gap: '6px' }}>
                    <span style={{ color: '#10b981' }}>✓</span>{f}
                  </div>
                ))}
              </div>
              <button onClick={() => navigate('/auth')} style={{ width: '100%', padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', border: plan.featured ? 'none' : '1px solid #e4e4e7', background: plan.featured ? 'linear-gradient(135deg, #6366f1, #ec4899)' : 'white', color: plan.featured ? 'white' : '#09090b' }}>
                {plan.price === 0 ? t('pricing.cta_free') : t('pricing.cta_trial')}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* SSS */}
      <div style={{ padding: '0 60px 80px', maxWidth: '700px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '36px', fontWeight: '700', letterSpacing: '-1px', textAlign: 'center', marginBottom: '36px' }}>{t('faq.title')}</h2>
        {FAQS.map((faq, i) => (
          <div key={i} style={{ borderBottom: '1px solid #e4e4e7', overflow: 'hidden' }}>
            <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{ width: '100%', padding: '18px 0', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'inherit', textAlign: 'left' }}>
              <span style={{ fontSize: '15px', fontWeight: '500', color: '#09090b' }}>{faq.q}</span>
              <span style={{ fontSize: '20px', color: '#71717a', transition: 'transform 0.2s', transform: openFaq === i ? 'rotate(45deg)' : 'none', flexShrink: 0 }}>+</span>
            </button>
            {openFaq === i && <div style={{ paddingBottom: '16px', fontSize: '14px', color: '#71717a', lineHeight: '1.7' }}>{faq.a}</div>}
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{ background: 'linear-gradient(135deg, #6366f1, #ec4899)', padding: '80px 60px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '52px', fontWeight: '700', color: 'white', letterSpacing: '-2px', marginBottom: '16px' }}>{t('cta.title')}</h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '18px', marginBottom: '36px' }}>{t('cta.subtitle')}</p>
        <button onClick={() => navigate('/auth')} style={{ background: 'white', color: '#09090b', border: 'none', padding: '16px 36px', borderRadius: '12px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
          {t('cta.button')}
        </button>
      </div>

      {/* FOOTER */}
      <footer style={{ background: '#09090b', padding: '40px 60px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/logo-dark.svg" alt="AmazenLens" style={{ height: '28px', objectFit: 'contain' }} />
          <span style={{ fontSize: '12px', color: '#52525b' }}>© 2025</span>
        </div>
        <div style={{ display: 'flex', gap: '24px' }}>
          <a href="/privacy" style={{ fontSize: '13px', color: '#52525b', textDecoration: 'none' }}>{t('footer.privacy')}</a>
          <a href="/terms" style={{ fontSize: '13px', color: '#52525b', textDecoration: 'none' }}>{t('footer.terms')}</a>
          <a href="/contact" style={{ fontSize: '13px', color: '#52525b', textDecoration: 'none' }}>{t('footer.contact')}</a>
        </div>
      </footer>
    </div>
    </>
  )
}
