import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function ContactPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    // Simple mailto fallback — replace with API call when email service is set up
    await new Promise(r => setTimeout(r, 800))
    setSent(true)
    setLoading(false)
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: '#fafafa', minHeight: '100vh' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        .contact-input { width: 100%; padding: 12px 16px; border-radius: 10px; border: 1px solid #e4e4e7; font-size: 14px; font-family: inherit; outline: none; background: white; box-sizing: border-box; transition: border 0.15s; }
        .contact-input:focus { border-color: #6366f1; }
      `}</style>

      <nav style={{ padding: '18px 60px', background: 'white', borderBottom: '1px solid #e4e4e7', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <div style={{ width: '30px', height: '30px', background: 'linear-gradient(135deg, #6366f1, #ec4899)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>🔍</div>
          <span style={{ fontSize: '16px', fontWeight: '700', color: '#09090b' }}>AmazenLens</span>
        </div>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: '1px solid #e4e4e7', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>← Back</button>
      </nav>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '60px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <h1 style={{ fontSize: '44px', fontWeight: '700', letterSpacing: '-1.5px', color: '#09090b', marginBottom: '12px' }}>Get in Touch</h1>
          <p style={{ fontSize: '17px', color: '#71717a' }}>We'd love to hear from you. Our team usually responds within 24 hours.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '48px', alignItems: 'start' }}>

          {/* Sol — İletişim Bilgileri */}
          <div>
            {[
              { icon: '✉️', title: 'Email', desc: 'hello@amazenlens.com', link: 'mailto:hello@amazenlens.com' },
              { icon: '🐛', title: 'Bug Reports', desc: 'bugs@amazenlens.com', link: 'mailto:bugs@amazenlens.com' },
              { icon: '💼', title: 'Business & Partnerships', desc: 'partners@amazenlens.com', link: 'mailto:partners@amazenlens.com' },
              { icon: '🔒', title: 'Privacy', desc: 'privacy@amazenlens.com', link: 'mailto:privacy@amazenlens.com' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: '16px', marginBottom: '28px', padding: '20px', background: 'white', borderRadius: '14px', border: '1px solid #e4e4e7' }}>
                <div style={{ fontSize: '24px', flexShrink: 0 }}>{item.icon}</div>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '14px', color: '#09090b', marginBottom: '4px' }}>{item.title}</div>
                  <a href={item.link} style={{ fontSize: '13px', color: '#6366f1', textDecoration: 'none' }}>{item.desc}</a>
                </div>
              </div>
            ))}

            <div style={{ padding: '20px', background: 'linear-gradient(135deg, #1e1b4b, #312e81)', borderRadius: '14px', color: 'white' }}>
              <div style={{ fontWeight: '600', marginBottom: '8px' }}>📍 Location</div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.6' }}>Istanbul, Turkey<br />Remote-first team</div>
            </div>
          </div>

          {/* Sağ — Form */}
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e4e4e7', padding: '36px' }}>
            {sent ? (
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
                <div style={{ fontSize: '20px', fontWeight: '600', color: '#09090b', marginBottom: '8px' }}>Message Sent!</div>
                <div style={{ color: '#71717a', fontSize: '14px' }}>We'll get back to you within 24 hours.</div>
                <button onClick={() => { setSent(false); setForm({ name: '', email: '', subject: '', message: '' }) }}
                  style={{ marginTop: '24px', padding: '10px 24px', background: 'linear-gradient(135deg, #6366f1, #ec4899)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Send Another
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Name</label>
                    <input className="contact-input" type="text" placeholder="Your name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Email</label>
                    <input className="contact-input" type="email" placeholder="your@email.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                  </div>
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Subject</label>
                  <select className="contact-input" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} required>
                    <option value="">Select a topic...</option>
                    <option value="general">General Question</option>
                    <option value="bug">Bug Report</option>
                    <option value="feature">Feature Request</option>
                    <option value="billing">Billing & Subscription</option>
                    <option value="partnership">Partnership</option>
                    <option value="press">Press & Media</option>
                  </select>
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Message</label>
                  <textarea className="contact-input" rows={6} placeholder="Tell us how we can help..." value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} required style={{ resize: 'vertical' }} />
                </div>
                <button type="submit" disabled={loading}
                  style={{ width: '100%', padding: '13px', background: loading ? '#a5b4fc' : 'linear-gradient(135deg, #6366f1, #ec4899)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                  {loading ? 'Sending...' : 'Send Message →'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      <footer style={{ background: '#09090b', padding: '32px 60px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '60px' }}>
        <span style={{ color: '#52525b', fontSize: '13px' }}>AmazenLens © 2026</span>
        <div style={{ display: 'flex', gap: '20px' }}>
          <a href="/privacy" style={{ color: '#52525b', fontSize: '13px', textDecoration: 'none' }}>Privacy</a>
          <a href="/terms" style={{ color: '#52525b', fontSize: '13px', textDecoration: 'none' }}>Terms</a>
          <a href="/contact" style={{ color: '#52525b', fontSize: '13px', textDecoration: 'none' }}>Contact</a>
        </div>
      </footer>
    </div>
  )
}
