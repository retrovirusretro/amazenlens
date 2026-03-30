import { useNavigate } from 'react-router-dom'

export default function TermsPage() {
  const navigate = useNavigate()

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: '#fafafa', minHeight: '100vh' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');`}</style>

      <nav style={{ padding: '18px 60px', background: 'white', borderBottom: '1px solid #e4e4e7', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <div style={{ width: '30px', height: '30px', background: 'linear-gradient(135deg, #6366f1, #ec4899)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>🔍</div>
          <span style={{ fontSize: '16px', fontWeight: '700', color: '#09090b' }}>AmazenLens</span>
        </div>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: '1px solid #e4e4e7', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>← Back</button>
      </nav>

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '60px 24px' }}>
        <h1 style={{ fontSize: '40px', fontWeight: '700', letterSpacing: '-1.5px', marginBottom: '8px', color: '#09090b' }}>Terms of Service</h1>
        <p style={{ color: '#71717a', fontSize: '14px', marginBottom: '48px' }}>Last updated: March 2026</p>

        {[
          {
            title: '1. Acceptance of Terms',
            content: `By accessing or using AmazenLens ("Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service. We reserve the right to update these terms at any time, and your continued use of the Service constitutes acceptance of any changes.`
          },
          {
            title: '2. Description of Service',
            content: `AmazenLens is a SaaS platform providing Amazon product research tools including niche scoring, keyword analysis, review intelligence, sourcing assistance, and AI-powered market insights. The Service is provided "as is" and we reserve the right to modify, suspend, or discontinue it at any time.`
          },
          {
            title: '3. Account Registration',
            content: `You must register for an account to use most features of the Service. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must be at least 18 years old to create an account.`
          },
          {
            title: '4. Subscription & Payment',
            content: `Paid plans are billed on a monthly basis. You may cancel at any time and your access will continue until the end of the current billing period. We do not offer refunds for partial months. Prices are in USD and may be subject to taxes depending on your location. We use Stripe for secure payment processing.`
          },
          {
            title: '5. Free Trial',
            content: `New users receive a 7-day free trial of Pro features. No credit card is required to start the trial. After the trial period, you will be moved to the Free plan unless you subscribe to a paid plan.`
          },
          {
            title: '6. Acceptable Use',
            content: `You agree not to misuse the Service. Prohibited activities include: scraping or automated access beyond normal use, reselling or redistributing our data without permission, attempting to circumvent rate limits or access controls, using the Service for illegal purposes, or impersonating other users or AmazenLens staff.`
          },
          {
            title: '7. Intellectual Property',
            content: `The Service and its original content, features, and functionality are owned by AmazenLens and are protected by international copyright, trademark, and other intellectual property laws. Amazon product data is the property of Amazon. Our AI-generated insights are provided for informational purposes only.`
          },
          {
            title: '8. Limitation of Liability',
            content: `AmazenLens shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the Service. Our liability is limited to the amount you paid for the Service in the three months preceding the claim.`
          },
          {
            title: '9. Termination',
            content: `We may terminate or suspend your account immediately, without prior notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties, or for any other reason at our sole discretion.`
          },
          {
            title: '10. Contact',
            content: `Questions about these Terms should be sent to legal@amazenlens.com.`
          },
        ].map((section, i) => (
          <div key={i} style={{ marginBottom: '36px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#09090b', marginBottom: '12px' }}>{section.title}</h2>
            <p style={{ fontSize: '15px', color: '#52525b', lineHeight: '1.8' }}>{section.content}</p>
          </div>
        ))}
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
