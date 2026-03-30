import { useNavigate } from 'react-router-dom'

export default function PrivacyPage() {
  const navigate = useNavigate()

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: '#fafafa', minHeight: '100vh' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');`}</style>

      {/* NAV */}
      <nav style={{ padding: '18px 60px', background: 'white', borderBottom: '1px solid #e4e4e7', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <div style={{ width: '30px', height: '30px', background: 'linear-gradient(135deg, #6366f1, #ec4899)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>🔍</div>
          <span style={{ fontSize: '16px', fontWeight: '700', color: '#09090b' }}>AmazenLens</span>
        </div>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: '1px solid #e4e4e7', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>← Back</button>
      </nav>

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '60px 24px' }}>
        <h1 style={{ fontSize: '40px', fontWeight: '700', letterSpacing: '-1.5px', marginBottom: '8px', color: '#09090b' }}>Privacy Policy</h1>
        <p style={{ color: '#71717a', fontSize: '14px', marginBottom: '48px' }}>Last updated: March 2026</p>

        {[
          {
            title: '1. Information We Collect',
            content: `We collect information you provide directly to us when you create an account, such as your name, email address, and payment information. We also collect information automatically when you use our services, including usage data, log data, and cookies.`
          },
          {
            title: '2. How We Use Your Information',
            content: `We use the information we collect to provide, maintain, and improve our services, process transactions, send you technical notices and support messages, and respond to your comments and questions. We may also use your information to send promotional communications, subject to your preferences.`
          },
          {
            title: '3. Data Security',
            content: `We take reasonable measures to help protect information about you from loss, theft, misuse, unauthorized access, disclosure, alteration, and destruction. All data is encrypted in transit using TLS and at rest. We use Supabase (PostgreSQL) with Row Level Security (RLS) to ensure your data is only accessible to you.`
          },
          {
            title: '4. Third-Party Services',
            content: `We use third-party services including Stripe for payment processing, Supabase for database and authentication, and Anthropic Claude API for AI analysis. These services have their own privacy policies and we encourage you to review them. We never share your personal data with third parties for marketing purposes.`
          },
          {
            title: '5. Cookies',
            content: `We use cookies and similar tracking technologies to track activity on our service and hold certain information. Cookies are files with small amounts of data which may include an anonymous unique identifier. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.`
          },
          {
            title: '6. Data Retention',
            content: `We retain your personal information for as long as necessary to provide you with our services and as needed to comply with our legal obligations, resolve disputes, and enforce our agreements. You may request deletion of your account and associated data at any time by contacting us.`
          },
          {
            title: '7. Your Rights',
            content: `You have the right to access, correct, or delete your personal data. You may also object to or restrict certain processing of your data. To exercise these rights, please contact us at privacy@amazenlens.com. We will respond to your request within 30 days.`
          },
          {
            title: '8. Contact Us',
            content: `If you have any questions about this Privacy Policy, please contact us at privacy@amazenlens.com or through our contact form at amazenlens.com/contact.`
          },
        ].map((section, i) => (
          <div key={i} style={{ marginBottom: '36px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#09090b', marginBottom: '12px' }}>{section.title}</h2>
            <p style={{ fontSize: '15px', color: '#52525b', lineHeight: '1.8' }}>{section.content}</p>
          </div>
        ))}

        <div style={{ marginTop: '48px', padding: '24px', background: 'linear-gradient(135deg, #eef2ff, #fce7f3)', borderRadius: '16px' }}>
          <div style={{ fontWeight: '600', marginBottom: '8px', color: '#6366f1' }}>Questions about your privacy?</div>
          <p style={{ fontSize: '14px', color: '#52525b', margin: 0 }}>Contact us at <a href="mailto:privacy@amazenlens.com" style={{ color: '#6366f1' }}>privacy@amazenlens.com</a></p>
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
