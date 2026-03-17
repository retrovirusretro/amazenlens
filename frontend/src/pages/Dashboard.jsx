import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = 'http://127.0.0.1:8000'

const QUICK_SEARCHES = [
  'yoga mat', 'silikon mutfak seti', 'led masa lambası',
  'resistance bands', 'bambu kesme tahtası', 'bluetooth kulaklık'
]

function StatCard({ label, value, sub, subColor, icon, iconBg }) {
  return (
    <div style={{
      background: 'white', borderRadius: '11px', padding: '14px 16px',
      border: '0.5px solid #e5e5ea'
    }}>
      <div style={{
        width: '32px', height: '32px', borderRadius: '8px', background: iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px'
      }}>
        {icon}
      </div>
      <div style={{ fontSize: '11px', color: '#8e8e93', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '22px', fontWeight: '600', color: '#1d1d1f', letterSpacing: '-0.5px' }}>{value}</div>
      {sub && <div style={{ fontSize: '11px', color: subColor || '#8e8e93', marginTop: '3px' }}>{sub}</div>}
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const firstName = user.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'Kullanıcı'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Günaydın' : hour < 18 ? 'İyi günler' : 'İyi akşamlar'

  const [recentPosts, setRecentPosts] = useState([])

  useEffect(() => {
    axios.get(`${API}/api/blog/posts?limit=3`).then(r => setRecentPosts(r.data.posts || [])).catch(() => {})
  }, [])

  const opportunities = [
    { title: 'Silikon Spatula Seti 6 Parça', price: '$24.99', bsr: '#2,340', score: 87, color: '#34c759' },
    { title: 'LED Masa Lambası USB Dokunmatik', price: '$22.99', bsr: '#3,102', score: 91, color: '#0071e3' },
    { title: 'Bambu Kesme Tahtası 3\'lü', price: '$29.99', bsr: '#890', score: 78, color: '#af52de' },
    { title: 'Resistance Bands 5 Seviye', price: '$18.99', bsr: '#2,450', score: 74, color: '#ff9f0a' },
  ]

  const activities = [
    { text: 'yoga mat araması — 48 sonuç', time: '2 dk önce', color: '#0071e3' },
    { text: 'B07YX93GFC niş skoru — 82/100', time: '15 dk önce', color: '#34c759' },
    { text: 'Alibaba tedarikçi — silikon spatula', time: '1 saat önce', color: '#ff9f0a' },
    { text: '15 ASIN toplu analiz tamamlandı', time: '3 saat önce', color: '#af52de' },
    { text: 'Trendyol arbitraj — yoga mat $8.91', time: 'Dün 22:14', color: '#0071e3' },
  ]

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", maxWidth: '1100px' }}>

      {/* Üst plan barı */}
      <div style={{
        background: 'white', borderRadius: '11px', border: '0.5px solid #e5e5ea',
        padding: '12px 18px', marginBottom: '18px',
        display: 'flex', alignItems: 'center', gap: '16px'
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '13px', fontWeight: '500', color: '#1d1d1f' }}>
            Pro Plan — 210/500 arama kullanıldı
          </div>
          <div style={{ height: '4px', background: '#f0f0f5', borderRadius: '2px', marginTop: '8px' }}>
            <div style={{ height: '100%', width: '42%', background: '#0071e3', borderRadius: '2px' }}></div>
          </div>
        </div>
        <button onClick={() => navigate('/pricing')} style={{
          background: '#0071e3', color: 'white', border: 'none',
          padding: '7px 16px', borderRadius: '8px', fontSize: '12px',
          fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap'
        }}>
          Agency'ye Yükselt
        </button>
      </div>

      {/* Selamlama */}
      <div style={{ marginBottom: '18px' }}>
        <div style={{ fontSize: '22px', fontWeight: '600', color: '#1d1d1f', letterSpacing: '-0.4px' }}>
          {greeting}, {firstName} 👋
        </div>
        <div style={{ fontSize: '13px', color: '#8e8e93', marginTop: '3px' }}>
          Bugün 3 yeni fırsat tespit edildi — araştırmaya başla.
        </div>
      </div>

      {/* Metrikler */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '16px' }}>
        <StatCard
          label="Toplam Arama" value="248" sub="+12 bu ay" subColor="#34c759"
          iconBg="#e8f0fe"
          icon={<svg width="16" height="16" fill="none" stroke="#0071e3" strokeWidth="1.5" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>}
        />
        <StatCard
          label="Niş >70 Fırsat" value="34" sub="+5 yeni bugün" subColor="#34c759"
          iconBg="#e8f9ee"
          icon={<svg width="16" height="16" fill="none" stroke="#34c759" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>}
        />
        <StatCard
          label="Alibaba Tedarikçi" value="12" sub="Analiz edildi"
          iconBg="#fff4e0"
          icon={<svg width="16" height="16" fill="none" stroke="#ff9f0a" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>}
        />
        <StatCard
          label="Ort. Kar Marjı" value="%64" sub="−2% geçen ay" subColor="#ff3b30"
          iconBg="#f3e8ff"
          icon={<svg width="16" height="16" fill="none" stroke="#af52de" strokeWidth="1.5" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>}
        />
      </div>

      {/* İki kolon */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px', marginBottom: '12px' }}>
        {/* Bugünün Fırsatları */}
        <div style={{ background: 'white', borderRadius: '11px', border: '0.5px solid #e5e5ea' }}>
          <div style={{
            padding: '13px 16px 10px', borderBottom: '0.5px solid #f5f5f7',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f' }}>🔥 Bugünün Fırsatları</div>
            <div onClick={() => navigate('/search')} style={{ fontSize: '12px', color: '#0071e3', cursor: 'pointer' }}>
              Tümünü gör →
            </div>
          </div>
          <div style={{ padding: '8px 16px' }}>
            {opportunities.map((op, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '9px 0', borderBottom: i < opportunities.length - 1 ? '0.5px solid #f5f5f7' : 'none'
              }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0,
                  background: `linear-gradient(135deg, ${op.color}22, ${op.color}44)`
                }}></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12.5px', fontWeight: '500', color: '#1d1d1f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {op.title}
                  </div>
                  <div style={{ fontSize: '11px', color: '#8e8e93', marginTop: '2px' }}>
                    {op.price} · BSR {op.bsr}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: op.color }}>{op.score}</div>
                  <div style={{ width: '48px', height: '3px', background: '#f0f0f5', borderRadius: '2px', marginTop: '4px' }}>
                    <div style={{ height: '100%', width: `${op.score}%`, background: op.color, borderRadius: '2px' }}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Son Aktivite */}
        <div style={{ background: 'white', borderRadius: '11px', border: '0.5px solid #e5e5ea' }}>
          <div style={{
            padding: '13px 16px 10px', borderBottom: '0.5px solid #f5f5f7',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f' }}>📋 Son Aktivite</div>
          </div>
          <div style={{ padding: '8px 16px' }}>
            {activities.map((a, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: '10px',
                padding: '8px 0', borderBottom: i < activities.length - 1 ? '0.5px solid #f5f5f7' : 'none'
              }}>
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: a.color, flexShrink: 0, marginTop: '4px'
                }}></div>
                <div>
                  <div style={{ fontSize: '12px', color: '#3c3c43', lineHeight: '1.5' }}>{a.text}</div>
                  <div style={{ fontSize: '11px', color: '#aeaeb2', marginTop: '1px' }}>{a.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hızlı Aramalar + Araçlar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
        {/* Hızlı Aramalar */}
        <div style={{ background: 'white', borderRadius: '11px', border: '0.5px solid #e5e5ea', padding: '14px 16px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f', marginBottom: '12px' }}>
            ⚡ Hızlı Aramalar
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {QUICK_SEARCHES.map(q => (
              <div key={q} onClick={() => navigate(`/search?q=${q.replace(/ /g, '+')}`)}
                style={{
                  fontSize: '12px', padding: '5px 12px', borderRadius: '20px',
                  border: '0.5px solid #d2d2d7', background: '#f5f5f7',
                  color: '#3c3c43', cursor: 'pointer'
                }}>
                {q}
              </div>
            ))}
          </div>
        </div>

        {/* Hızlı Araçlar */}
        <div style={{ background: 'white', borderRadius: '11px', border: '0.5px solid #e5e5ea', padding: '14px 16px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f', marginBottom: '12px' }}>
            🛠️ Hızlı Araçlar
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {[
              { label: 'Ürün Ara', desc: 'Keyword / ASIN', to: '/search', color: '#0071e3', bg: '#e8f0fe' },
              { label: 'Niş Skoru', desc: 'ASIN analiz et', to: '/niche', color: '#34c759', bg: '#e8f9ee' },
              { label: 'Tedarik', desc: 'Alibaba + arbitraj', to: '/sourcing', color: '#ff9f0a', bg: '#fff4e0' },
              { label: 'Toplu Import', desc: 'CSV / Excel', to: '/bulk', color: '#af52de', bg: '#f3e8ff' },
            ].map(tool => (
              <div key={tool.to} onClick={() => navigate(tool.to)} style={{
                background: tool.bg, borderRadius: '9px', padding: '12px',
                cursor: 'pointer', transition: 'opacity 0.15s'
              }}>
                <div style={{ fontSize: '13px', fontWeight: '500', color: tool.color, marginBottom: '2px' }}>{tool.label}</div>
                <div style={{ fontSize: '11px', color: '#8e8e93' }}>{tool.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Son Blog Yazıları */}
      {recentPosts.length > 0 && (
        <div style={{ background: 'white', borderRadius: '11px', border: '0.5px solid #e5e5ea' }}>
          <div style={{
            padding: '13px 16px 10px', borderBottom: '0.5px solid #f5f5f7',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f' }}>📚 Son Blog Yazıları</div>
            <div onClick={() => navigate('/blog')} style={{ fontSize: '12px', color: '#0071e3', cursor: 'pointer' }}>
              Tümünü gör →
            </div>
          </div>
          <div style={{ padding: '8px 16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {recentPosts.map(post => (
              <div key={post.id} onClick={() => navigate(`/blog/${post.slug}`)} style={{ cursor: 'pointer', padding: '8px 0' }}>
                <div style={{ fontSize: '11px', color: '#0071e3', marginBottom: '4px', fontWeight: '500' }}>{post.category}</div>
                <div style={{ fontSize: '13px', fontWeight: '500', color: '#1d1d1f', lineHeight: '1.4', marginBottom: '4px' }}>{post.title_tr}</div>
                <div style={{ fontSize: '11px', color: '#8e8e93' }}>⏱ {post.read_time} dk · 👁 {post.view_count}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
