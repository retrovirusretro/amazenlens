import { useNavigate } from 'react-router-dom'

const TEAM = [
  {
    name: 'Gökhan Ustaosmanoğlu',
    role: 'Founder & CEO',
    bio: 'Amazon FBA satıcısı & e-ticaret girişimcisi. AmazenLens\'i kendi satıcı deneyiminden doğan ihtiyaçlardan geliştirdi.',
    avatar: '👨‍💻',
    color: '#0071e3',
  },
]

const ALGORITHMS = [
  {
    icon: '📊',
    title: 'BSR Power-Law Modeli',
    desc: 'Amazon Best Seller Rank\'i gerçek satış hacmine dönüştüren üstel regresyon modeli. 10M+ ürün verisiyle kalibre edildi.',
    source: 'Akademik Referans: Brynjolfsson et al. (2011)',
    color: '#0071e3',
    bg: '#e8f0fe',
  },
  {
    icon: '🔬',
    title: 'Review Velocity Index (RVI)',
    desc: 'Aylık yorum kazanım hızını ölçen metrik. Pazarın doygunluğunu ve giriş fırsatını matematiksel olarak hesaplar.',
    source: 'Metodoloji: Chevalier & Mayzlin (2006)',
    color: '#34c759',
    bg: '#e8f9ee',
  },
  {
    icon: '🧮',
    title: '4-Boyutlu Niş Skoru',
    desc: 'Hacim, Lojistik, Rekabet ve Karlılık boyutlarını 100 puanlık tek bir skora indirgeyen ağırlıklı skor sistemi.',
    source: 'Dan Rodgers 3-Prong + AmazenLens proprietary',
    color: '#ff9f0a',
    bg: '#fff4e0',
  },
  {
    icon: '🤖',
    title: 'Claude AI Love/Hate Analizi',
    desc: 'Müşteri yorumlarından ürün geliştirme fırsatlarını çıkaran NLP pipeline. Anthropic\'in Claude modeli ile güçlendirildi.',
    source: 'Powered by Anthropic Claude API',
    color: '#af52de',
    bg: '#f3e8ff',
  },
  {
    icon: '🌍',
    title: 'Euro Flips Arbitraj Motoru',
    desc: '15+ platformda gerçek zamanlı kur dönüşümü ve VAT hesabıyla net arbitraj karını hesaplayan motor.',
    source: 'ECB exchange rates + platform fee databases',
    color: '#ff3b30',
    bg: '#fff1f0',
  },
  {
    icon: '📈',
    title: 'Unmet Demand Detector',
    desc: 'Yüksek satış + düşük yorum + düşük rating kombinasyonunu tespit ederek karşılanmamış talebi otomatik işaretler.',
    source: 'AmazenLens proprietary signal model',
    color: '#0071e3',
    bg: '#e8f0fe',
  },
]

const MILESTONES = [
  { year: '2024', label: 'Fikir', desc: 'Amazon FBA satıcısı olarak araçların yetersizliğini fark ettik' },
  { year: 'Q1 2025', label: 'Geliştirme', desc: 'Faz 1 özellikleri ve MVP hazırlandı' },
  { year: 'Q2 2025', label: 'ITÜ Çekirdek', desc: 'ITÜ Çekirdek Girişim programına kabul' },
  { year: 'Q1 2026', label: 'Beta', desc: 'amazenlens.com canlıya alındı, ilk kullanıcılar' },
  { year: '2026', label: 'Büyüme', desc: 'TÜBİTAK BiGG, KOSGEB ve global yatırım hedefleri' },
]

export default function AboutPage() {
  const navigate = useNavigate()

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", maxWidth: '960px', color: '#1d1d1f' }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .about-card { animation: fadeIn 0.4s ease both; }
      `}</style>

      {/* Hero */}
      <div className="about-card" style={{ background: 'linear-gradient(135deg, #1d1d1f 0%, #2d2d2f 100%)', borderRadius: '16px', padding: '40px', marginBottom: '16px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: '240px', height: '240px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,113,227,0.15) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: -40, left: -40, width: '160px', height: '160px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(52,170,220,0.1) 0%, transparent 70%)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{ width: '44px', height: '44px', background: '#0071e3', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" fill="none" stroke="white" strokeWidth="1.5" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: 'white', letterSpacing: '-0.4px' }}>AmazenLens</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.5px' }}>AMAZON SELLER RESEARCH PLATFORM</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
            <div style={{ fontSize: '11px', padding: '4px 12px', borderRadius: '20px', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', border: '0.5px solid rgba(255,255,255,0.12)' }}>
              🎓 ITÜ Çekirdek
            </div>
            <div style={{ fontSize: '11px', padding: '4px 12px', borderRadius: '20px', background: 'rgba(0,113,227,0.2)', color: '#34aadc', border: '0.5px solid rgba(0,113,227,0.3)' }}>
              Claude AI
            </div>
          </div>
        </div>

        <div style={{ fontSize: '28px', fontWeight: '700', color: 'white', letterSpacing: '-0.6px', lineHeight: '1.25', marginBottom: '14px', maxWidth: '600px' }}>
          Amazon satıcıları için<br />
          <span style={{ color: '#34aadc' }}>akademik temelli</span> AI araştırma platformu
        </div>
        <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.7', maxWidth: '540px' }}>
          Helium 10'un 1/5 fiyatına, dünya genelinde kanıtlanmış algoritmalar ve Anthropic'in Claude AI'ı ile güçlendirilmiş 5 kat daha akıllı özellikler. Global Amazon satıcıları için tasarlandı.
        </div>
      </div>

      {/* Misyon + İletişim */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '12px', marginBottom: '16px' }}>
        <div className="about-card" style={{ background: 'white', borderRadius: '14px', border: '0.5px solid #e5e5ea', padding: '24px', animationDelay: '0.1s' }}>
          <div style={{ fontSize: '11px', color: '#0071e3', fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px' }}>Misyonumuz</div>
          <div style={{ fontSize: '16px', fontWeight: '600', color: '#1d1d1f', lineHeight: '1.4', marginBottom: '12px' }}>
            Amazon araştırmasını demokratikleştirmek
          </div>
          <div style={{ fontSize: '13px', color: '#8e8e93', lineHeight: '1.8' }}>
            Büyük Amazon araştırma araçları yüzlerce dolar aylık ücret alırken, aynı kalitede — hatta daha iyi — analizi herkes için erişilebilir kılmak istiyoruz. Türkiye'den başlayıp global ölçeğe ulaşmak hedefimiz.
          </div>
          <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['Niş Skoru', 'Love/Hate AI', 'Euro Flips', 'Pan-EU FBA', 'Unavailable Scanner'].map(f => (
              <span key={f} style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '20px', background: '#f0f7ff', color: '#0071e3', fontWeight: '500' }}>{f}</span>
            ))}
          </div>
        </div>

        <div className="about-card" style={{ background: 'white', borderRadius: '14px', border: '0.5px solid #e5e5ea', padding: '24px', animationDelay: '0.15s' }}>
          <div style={{ fontSize: '11px', color: '#34c759', fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px' }}>İletişim</div>
          <div style={{ fontSize: '16px', fontWeight: '600', color: '#1d1d1f', marginBottom: '16px' }}>Bize Ulaşın</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { icon: '✉️', label: 'Destek', value: 'support@amazenlens.com', href: 'mailto:support@amazenlens.com' },
              { icon: '🌐', label: 'Website', value: 'amazenlens.com', href: 'https://amazenlens.com' },
              { icon: '🎓', label: 'Kuluçka', value: 'ITÜ Çekirdek Girişim Programı', href: null },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f5f5f7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', flexShrink: 0 }}>{item.icon}</div>
                <div>
                  <div style={{ fontSize: '10px', color: '#aeaeb2', marginBottom: '1px' }}>{item.label}</div>
                  {item.href ? (
                    <a href={item.href} style={{ fontSize: '13px', color: '#0071e3', textDecoration: 'none', fontWeight: '500' }}>{item.value}</a>
                  ) : (
                    <div style={{ fontSize: '13px', color: '#1d1d1f', fontWeight: '500' }}>{item.value}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '16px', padding: '12px', background: '#f0fff4', borderRadius: '10px', border: '0.5px solid #b7f0c8' }}>
            <div style={{ fontSize: '11px', color: '#1a7f37', fontWeight: '500' }}>💬 Feedback & Destek</div>
            <div style={{ fontSize: '11px', color: '#8e8e93', marginTop: '3px' }}>24 saat içinde yanıt veriyoruz</div>
          </div>
        </div>
      </div>

      {/* Algoritmalar */}
      <div className="about-card" style={{ background: 'white', borderRadius: '14px', border: '0.5px solid #e5e5ea', padding: '24px', marginBottom: '16px', animationDelay: '0.2s' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#ff9f0a', fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Lens Team Teknolojisi</div>
            <div style={{ fontSize: '17px', fontWeight: '600', color: '#1d1d1f', letterSpacing: '-0.3px' }}>
              Akademik temelli algoritmalar
            </div>
          </div>
          <div style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '20px', background: '#fff4e0', color: '#b45309', fontWeight: '500' }}>
            6 proprietary model
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          {ALGORITHMS.map((alg, i) => (
            <div key={alg.title} className="about-card" style={{ background: alg.bg, borderRadius: '10px', padding: '14px', animationDelay: `${0.25 + i * 0.05}s` }}>
              <div style={{ fontSize: '22px', marginBottom: '8px' }}>{alg.icon}</div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: alg.color, marginBottom: '6px' }}>{alg.title}</div>
              <div style={{ fontSize: '11px', color: '#3c3c43', lineHeight: '1.6', marginBottom: '8px' }}>{alg.desc}</div>
              <div style={{ fontSize: '10px', color: '#aeaeb2', fontStyle: 'italic' }}>{alg.source}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Takım */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        <div className="about-card" style={{ background: 'white', borderRadius: '14px', border: '0.5px solid #e5e5ea', padding: '24px', animationDelay: '0.55s' }}>
          <div style={{ fontSize: '11px', color: '#af52de', fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '14px' }}>Lens Team</div>
          {TEAM.map(member => (
            <div key={member.name} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: member.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>
                {member.avatar}
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#1d1d1f', marginBottom: '2px' }}>{member.name}</div>
                <div style={{ fontSize: '12px', color: member.color, fontWeight: '500', marginBottom: '8px' }}>{member.role}</div>
                <div style={{ fontSize: '12px', color: '#8e8e93', lineHeight: '1.6' }}>{member.bio}</div>
              </div>
            </div>
          ))}
          <div style={{ marginTop: '16px', padding: '12px 14px', background: '#f5f5f7', borderRadius: '10px' }}>
            <div style={{ fontSize: '12px', fontWeight: '500', color: '#1d1d1f', marginBottom: '4px' }}>🎓 ITÜ Çekirdek Girişimi</div>
            <div style={{ fontSize: '11px', color: '#8e8e93' }}>Türkiye'nin önde gelen teknoloji kuluçka programında yer alan AmazenLens, global ölçeklenme için desteklenmektedir.</div>
          </div>
        </div>

        {/* Yolculuk */}
        <div className="about-card" style={{ background: 'white', borderRadius: '14px', border: '0.5px solid #e5e5ea', padding: '24px', animationDelay: '0.6s' }}>
          <div style={{ fontSize: '11px', color: '#0071e3', fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '14px' }}>Yolculuğumuz</div>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: '11px', top: '8px', bottom: '8px', width: '1px', background: 'linear-gradient(to bottom, #0071e3, #34c759)', opacity: 0.3 }} />
            {MILESTONES.map((m, i) => (
              <div key={m.year} style={{ display: 'flex', gap: '14px', marginBottom: i < MILESTONES.length - 1 ? '16px' : 0, alignItems: 'flex-start' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: i === MILESTONES.length - 1 ? '#0071e3' : 'white', border: `2px solid ${i === MILESTONES.length - 1 ? '#0071e3' : '#d2d2d7'}`, flexShrink: 0, marginTop: '1px', zIndex: 1 }} />
                <div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '2px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '600', color: '#0071e3' }}>{m.year}</span>
                    <span style={{ fontSize: '11px', padding: '1px 8px', borderRadius: '10px', background: '#f0f7ff', color: '#0071e3', fontWeight: '500' }}>{m.label}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#8e8e93', lineHeight: '1.5' }}>{m.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rakip karşılaştırma */}
      <div className="about-card" style={{ background: 'white', borderRadius: '14px', border: '0.5px solid #e5e5ea', padding: '24px', marginBottom: '16px', animationDelay: '0.65s' }}>
        <div style={{ fontSize: '11px', color: '#34c759', fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '14px' }}>Neden AmazenLens?</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid #e5e5ea' }}>
                {['Özellik', 'AmazenLens', 'Helium 10', 'Jungle Scout', 'AMZScout'].map((h, i) => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: i === 0 ? 'left' : 'center', color: i === 1 ? '#0071e3' : '#8e8e93', fontWeight: i === 1 ? '600' : '500', background: i === 1 ? '#f0f7ff' : 'transparent', borderRadius: i === 1 ? '6px 6px 0 0' : 0 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['Fiyat', '$19/ay', '$97/ay', '$49/ay', '$49/ay'],
                ['Niş Skoru (4 boyut)', '✅ 100pt', '⚠️ Sınırlı', '⚠️ Orta', '⚠️ 7/10'],
                ['Love/Hate AI Analizi', '✅ Claude AI', '⚠️ Zayıf', '⚠️ Zayıf', '⚠️ Zayıf'],
                ['Euro Flips Arbitraj', '✅', '❌', '❌', '❌'],
                ['Unmet Demand Tespiti', '✅', '❌', '❌', '❌'],
                ['Türkçe Arayüz', '✅', '❌', '❌', '❌'],
                ['5 Dil Desteği', '✅ TR/EN/DE/FR/ES', '❌', '❌', '❌'],
                ['Pan-EU FBA Hesabı', '✅', '⚠️ Ücretli', '❌', '❌'],
              ].map((row, i) => (
                <tr key={row[0]} style={{ borderBottom: '0.5px solid #f5f5f7', background: i % 2 === 0 ? '#fafafa' : 'white' }}>
                  {row.map((cell, j) => (
                    <td key={j} style={{ padding: '9px 12px', textAlign: j === 0 ? 'left' : 'center', color: j === 1 ? '#0071e3' : j === 0 ? '#1d1d1f' : '#8e8e93', fontWeight: j === 1 ? '600' : j === 0 ? '500' : '400', background: j === 1 ? 'rgba(0,113,227,0.03)' : 'transparent' }}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CTA */}
      <div className="about-card" style={{ background: 'linear-gradient(135deg, #0071e3, #34aadc)', borderRadius: '14px', padding: '28px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', animationDelay: '0.7s' }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: '600', color: 'white', letterSpacing: '-0.3px', marginBottom: '6px' }}>
            Hadi birlikte büyüyelim 🚀
          </div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
            Geri bildiriminiz AmazenLens'i şekillendiriyor. Lens puanı kazanın, roadmap'i etkileyin.
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
          <button onClick={() => navigate('/app/feedback')}
            style={{ padding: '10px 20px', background: 'white', color: '#0071e3', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
            Geri Bildirim Ver
          </button>
          <button onClick={() => navigate('/app/pricing')}
            style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.15)', color: 'white', border: '0.5px solid rgba(255,255,255,0.3)', borderRadius: '10px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit' }}>
            Planları Gör
          </button>
        </div>
      </div>
    </div>
  )
}
