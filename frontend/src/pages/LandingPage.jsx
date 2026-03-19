import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function LandingPage() {
  const navigate = useNavigate()
  const [scrollY, setScrollY] = useState(0)
  const [openFaq, setOpenFaq] = useState(null)

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const FEATURES = [
    { icon: '🎯', title: 'Niş Skoru', desc: '100 puanlık AI analiz sistemi. BSR geçmişi, RVI ve trend skoru bir arada değerlendiriliyor.', ai: 'Claude AI' },
    { icon: '💚', title: 'Love/Hate Analizi', desc: 'Rakiplerinize gelen yorumları Claude analiz eder. Ürün geliştirme fırsatlarını yakala.', ai: 'Claude AI' },
    { icon: '🇪🇺', title: 'Euro Flips', desc: '7 Avrupa pazarında VAT dahil arbitraj hesabı. Amazon.de\'den al, ABD\'de sat.', ai: null },
    { icon: '🇹🇷', title: 'Türk Tedarikçi DB', desc: 'Alibaba\'ya alternatif. Made in Turkey avantajıyla global pazarda fark yarat.', ai: null },
    { icon: '🔍', title: 'Unavailable Scanner', desc: '500 ASIN toplu tarama. Rakipsiz fırsatları otomatik tespit et ve yakala.', ai: 'AI Destekli' },
    { icon: '📊', title: 'Pan-EU FBA', desc: '9 Avrupa pazarında VAT ve FBA dahil net kar hesabı. Tek sayfada tüm Avrupa.', ai: null },
  ]

  const PRODUCTS = [
    { icon: '🏮', title: 'LED Masa Lambası USB Şarjlı 3 Mod', price: '$22.99 · BSR #3,102 · FBA', score: 91, high: true },
    { icon: '🧘', title: 'Silikon Spatula Seti 6 Parça', price: '$24.99 · BSR #2,340 · FBA', score: 87, high: true },
    { icon: '💻', title: 'Laptop Stand Aluminum Portable', price: '$32.99 · BSR #3,891 · FBA', score: 79, high: false },
  ]

  const PLANS = [
    { name: 'Free', price: 0, features: ['5 arama/gün', 'Niş skoru', 'Temel özellikler'], featured: false },
    { name: 'Starter', price: 19, features: ['50 arama/gün', 'Love/Hate AI', 'Euro Flips', 'Email destek'], featured: false },
    { name: 'Pro', price: 49, features: ['200 arama/gün', 'Pan-EU FBA', 'Türk tedarikçi', 'Öncelikli destek'], featured: true },
    { name: 'Agency', price: 99, features: ['Sınırsız', 'API erişimi', 'White-label', 'Dedicated destek'], featured: false },
  ]

  const FAQS = [
    { q: 'Kredi kartı bilgisi vermeden deneyebilir miyim?', a: 'Evet! Kayıt olunca 7 gün boyunca tüm Pro özellikleri ücretsiz. Kart bilgisi gerekmez.' },
    { q: 'Helium 10\'dan ne farkı var?', a: 'Türkçe arayüz, Türk tedarikçi modülü, Euro Flips ve Trendyol entegrasyonu. Helium 10\'un 1/5 fiyatına.' },
    { q: 'İstediğim zaman iptal edebilir miyim?', a: 'Evet, istediğin zaman. Dönem sonuna kadar erişimin devam eder.' },
    { q: 'Hangi Amazon pazarlarını destekliyorsunuz?', a: 'ABD, Almanya, Fransa, İtalya, İspanya, İngiltere, Kanada, Japonya dahil 15+ pazar.' },
  ]

  return (
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '30px', height: '30px', background: 'linear-gradient(135deg, #6366f1, #ec4899)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>🔍</div>
          <span style={{ fontSize: '16px', fontWeight: '700', color: '#09090b' }}>AmazenLens</span>
        </div>
        <div style={{ display: 'flex', gap: '28px' }}>
          {['Özellikler', 'Fiyatlar', 'Blog', 'Roadmap'].map(item => (
            <a key={item} href={`#${item.toLowerCase()}`} className="nav-link">{item}</a>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => navigate('/auth')} style={{ background: 'none', border: '1px solid #e4e4e7', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '500' }}>Giriş Yap</button>
          <button onClick={() => navigate('/auth')} style={{ background: 'linear-gradient(135deg, #6366f1, #ec4899)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '500' }}>Ücretsiz Başla →</button>
        </div>
      </nav>

      {/* HERO */}
      <div style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4c1d95 70%, #701a75 100%)', minHeight: '90vh', display: 'flex', alignItems: 'center', padding: '80px 60px', position: 'relative', overflow: 'hidden' }}>
        {/* Grid pattern */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>

        {/* Sol */}
        <div style={{ maxWidth: '560px', position: 'relative', zIndex: 1, animation: 'fadeUp 0.6s ease' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '100px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', fontSize: '12px', fontWeight: '500', marginBottom: '28px', backdropFilter: 'blur(10px)' }}>
            <div style={{ width: '6px', height: '6px', background: '#34d399', borderRadius: '50%', animation: 'glow 2s ease-in-out infinite' }}></div>
            Claude AI ile güçlendirildi — Canlı analiz
          </div>

          <h1 style={{ fontSize: '68px', fontWeight: '700', lineHeight: '1', letterSpacing: '-2px', color: 'white', marginBottom: '20px' }}>
            Amazon'da<br />
            <span style={{ background: 'linear-gradient(135deg, #a78bfa, #f472b6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AI avantajı</span><br />
            senin elinde
          </h1>

          <p style={{ fontSize: '17px', color: 'rgba(255,255,255,0.65)', lineHeight: '1.7', marginBottom: '36px', maxWidth: '480px' }}>
            Türk satıcılar için tasarlandı. Helium 10'un 1/5 fiyatına, 5 kat daha akıllı özelliklerle.
          </p>

          <div style={{ display: 'flex', gap: '12px', marginBottom: '40px' }}>
            <button className="hero-btn" onClick={() => navigate('/auth')} style={{ background: 'white', color: '#09090b', border: 'none', padding: '14px 28px', borderRadius: '10px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', transition: 'transform 0.2s' }}>
              7 Gün Ücretsiz Başla →
            </button>
            <button className="hero-btn" onClick={() => navigate('/auth')} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '14px 28px', borderRadius: '10px', fontSize: '15px', cursor: 'pointer', fontFamily: 'inherit', backdropFilter: 'blur(10px)', transition: 'transform 0.2s' }}>
              Demo İzle ▶
            </button>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {['🎯 Niş Skoru AI', '💚 Love/Hate', '🇪🇺 Euro Flips', '🇹🇷 Türk Tedarikçi'].map(chip => (
              <div key={chip} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)', fontSize: '12px', fontWeight: '500' }}>
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
        <span style={{ fontSize: '12px', color: '#71717a', whiteSpace: 'nowrap', fontWeight: '500' }}>Rakiplerimizle karşılaştırın:</span>
        <div style={{ display: 'flex', gap: '32px', alignItems: 'center', flexWrap: 'wrap' }}>
          {[
            { name: 'Helium 10 $97/ay', crossed: true },
            { name: 'Jungle Scout $49/ay', crossed: true },
            { name: 'AMZScout $45/ay', crossed: true },
            { name: '✓ AmazenLens $19/ay', crossed: false },
          ].map(c => (
            <span key={c.name} style={{ fontSize: '13px', color: c.crossed ? '#a1a1aa' : '#6366f1', fontWeight: '600', textDecoration: c.crossed ? 'line-through' : 'none' }}>{c.name}</span>
          ))}
        </div>
      </div>

      {/* FEATURES */}
      <div id="özellikler" style={{ padding: '80px 60px', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '600', color: '#6366f1', background: '#eef2ff', padding: '4px 12px', borderRadius: '100px', marginBottom: '16px' }}>✦ AI Özellikleri</div>
        <h2 style={{ fontSize: '44px', fontWeight: '700', letterSpacing: '-1.5px', marginBottom: '48px' }}>
          Rakiplerde olmayan<br />
          <span style={{ background: 'linear-gradient(135deg, #6366f1, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Türk satıcı zekası</span>
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

      {/* ROADMAP */}
      <div style={{ background: 'linear-gradient(135deg, #1e1b4b, #312e81)', padding: '80px 60px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '600', color: '#a78bfa', background: 'rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: '100px', marginBottom: '16px' }}>Roadmap</div>
          <h2 style={{ fontSize: '44px', fontWeight: '700', letterSpacing: '-1.5px', color: 'white', marginBottom: '8px' }}>Büyük vizyon</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '16px', marginBottom: '48px' }}>Şu an neredeyiz, nereye gidiyoruz</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
            {[
              {
                label: '✅ Faz 1 — Aktif', color: '#34d399', chipBg: 'rgba(52,211,153,0.15)', chipColor: '#34d399', chipText: 'Aktif',
                items: ['Niş Skoru (100pt)', 'Love/Hate AI', 'Euro Flips Arbitraj', 'Pan-EU FBA Hesabı', 'Unavailable Scanner', 'Türk Tedarikçi DB'],
                done: true
              },
              {
                label: '🚀 Faz 2 — Yakında', color: '#818cf8', chipBg: 'rgba(129,140,248,0.15)', chipColor: '#818cf8', chipText: 'Q2-Q3 2025',
                items: ['Chrome Eklentisi', 'Trend Radar', 'WhatsApp Alertleri', 'Business Valuation', 'Product Opp. Gap', 'AI Listing Optimizer'],
                done: false
              },
              {
                label: '🔮 Faz 3 — Gelecek', color: '#f472b6', chipBg: 'rgba(244,114,182,0.15)', chipColor: '#f472b6', chipText: 'Q4 2025+',
                items: ['Mobil Uygulama', 'Barkod Okuyucu', 'API Erişimi', 'Satıcı Segmentasyonu', 'SnapSearch (Görsel)', 'Telegram Alertleri'],
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

      {/* PRICING */}
      <div id="fiyatlar" style={{ padding: '80px 60px', maxWidth: '1000px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '44px', fontWeight: '700', letterSpacing: '-1.5px', textAlign: 'center', marginBottom: '8px' }}>Basit fiyatlandırma</h2>
        <p style={{ textAlign: 'center', color: '#71717a', marginBottom: '48px', fontSize: '16px' }}>7 gün ücretsiz dene. Kart bilgisi gerekmez. İstediğin zaman iptal et.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
          {PLANS.map(plan => (
            <div key={plan.name} className="plan-card" style={{ background: plan.featured ? 'linear-gradient(135deg, #1e1b4b, #312e81)' : 'white', border: plan.featured ? 'none' : '1px solid #e4e4e7', borderRadius: '16px', padding: '24px', position: 'relative', transition: 'transform 0.2s', cursor: 'default' }}>
              {plan.featured && (
                <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #6366f1, #ec4899)', color: 'white', fontSize: '10px', fontWeight: '700', padding: '3px 12px', borderRadius: '100px', whiteSpace: 'nowrap' }}>EN POPÜLER</div>
              )}
              <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: plan.featured ? 'white' : '#09090b' }}>{plan.name}</div>
              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontSize: '40px', fontWeight: '700', letterSpacing: '-1px', color: plan.featured ? '#a78bfa' : '#6366f1' }}>${plan.price}</span>
                <span style={{ fontSize: '13px', color: plan.featured ? 'rgba(255,255,255,0.5)' : '#71717a' }}>/ay</span>
              </div>
              <div style={{ marginBottom: '20px' }}>
                {plan.features.map((f, i) => (
                  <div key={i} style={{ fontSize: '12px', color: plan.featured ? 'rgba(255,255,255,0.7)' : '#71717a', marginBottom: '8px', display: 'flex', gap: '6px' }}>
                    <span style={{ color: '#10b981' }}>✓</span>{f}
                  </div>
                ))}
              </div>
              <button onClick={() => navigate('/auth')} style={{ width: '100%', padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', border: plan.featured ? 'none' : '1px solid #e4e4e7', background: plan.featured ? 'linear-gradient(135deg, #6366f1, #ec4899)' : 'white', color: plan.featured ? 'white' : '#09090b' }}>
                {plan.price === 0 ? 'Başla' : '7 Gün Dene'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* SSS */}
      <div style={{ padding: '0 60px 80px', maxWidth: '700px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '36px', fontWeight: '700', letterSpacing: '-1px', textAlign: 'center', marginBottom: '36px' }}>Sık sorulan sorular</h2>
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
        <h2 style={{ fontSize: '52px', fontWeight: '700', color: 'white', letterSpacing: '-2px', marginBottom: '16px' }}>Başlamaya hazır mısın?</h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '18px', marginBottom: '36px' }}>7 gün boyunca tüm Pro özellikleri ücretsiz. Kart bilgisi gerekmez.</p>
        <button onClick={() => navigate('/auth')} style={{ background: 'white', color: '#09090b', border: 'none', padding: '16px 36px', borderRadius: '12px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
          Hemen Başla — Ücretsiz →
        </button>
      </div>

      {/* FOOTER */}
      <footer style={{ background: '#09090b', padding: '40px 60px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '26px', height: '26px', background: 'linear-gradient(135deg, #6366f1, #ec4899)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>🔍</div>
          <span style={{ fontSize: '15px', fontWeight: '700', color: 'white' }}>AmazenLens</span>
          <span style={{ fontSize: '12px', color: '#52525b', marginLeft: '4px' }}>© 2025</span>
        </div>
        <div style={{ display: 'flex', gap: '24px' }}>
          {['Gizlilik', 'Kullanım Şartları', 'İletişim'].map(item => (
            <a key={item} href="#" style={{ fontSize: '13px', color: '#52525b', textDecoration: 'none' }}>{item}</a>
          ))}
        </div>
      </footer>
    </div>
  )
}
