import { useState, useEffect } from 'react'
import axios from 'axios'
import { useTranslation } from 'react-i18next'

const API = import.meta.env.VITE_API_URL || ''

const ENDPOINTS = [
  {
    method: 'GET',
    path: '/v1/niche/score',
    title: 'Niche Score',
    desc: 'Returns a 0–100 niche opportunity score for any Amazon product. Combines BSR trend, Review Velocity Index, Gini coefficient, and profitability signals.',
    params: [
      { name: 'asin', type: 'string', required: true, desc: 'Amazon ASIN (e.g. B07QK955LS)' },
      { name: 'marketplace', type: 'string', required: false, desc: 'US · DE · UK · FR · ES · IT (default: US)' },
      { name: 'use_keepa', type: 'boolean', required: false, desc: 'Enhanced accuracy via Keepa BSR history (default: true)' },
    ],
    example: `curl -X GET "https://api.amazenlens.com/v1/niche/score?asin=B07QK955LS&marketplace=US" \\
  -H "X-API-Key: al_your_key_here"`,
    response: `{
  "asin": "B07QK955LS",
  "marketplace": "US",
  "title": "Silicone Spatula Set 6-Piece",
  "price": 24.99,
  "niche_score": {
    "total": 87,
    "verdict": "🟢 Excellent — Enter now",
    "dimensions": {
      "volume": 22, "logistics": 23, "competition": 21, "profit": 21
    },
    "rvi": 4.2,
    "gini": 0.28,
    "unmet_demand": true,
    "red_flags": []
  },
  "response_ms": 412
}`,
    color: '#34c759',
  },
  {
    method: 'GET',
    path: '/v1/keyword/analyze',
    title: 'Keyword Intelligence',
    desc: 'Analyzes a seed keyword and returns volume score, buyer intent classification, IQ score, long-tail suggestions, and competition level.',
    params: [
      { name: 'keyword', type: 'string', required: true, desc: 'Seed keyword to analyze' },
      { name: 'marketplace', type: 'string', required: false, desc: 'US · DE · UK · FR · ES (default: US)' },
    ],
    example: `curl -X GET "https://api.amazenlens.com/v1/keyword/analyze?keyword=yoga+mat&marketplace=US" \\
  -H "X-API-Key: al_your_key_here"`,
    response: `{
  "keyword": "yoga mat",
  "marketplace": "US",
  "volume_score": 92,
  "buyer_intent": "high",
  "iq_score": 78,
  "competition": "medium",
  "long_tail": ["yoga mat thick", "yoga mat non slip", "yoga mat for beginners"],
  "monthly_searches_est": 180000,
  "response_ms": 230
}`,
    color: '#0071e3',
  },
  {
    method: 'GET',
    path: '/v1/review/sentiment',
    title: 'Review Sentiment (ABSA)',
    desc: '5-dimensional Aspect-Based Sentiment Analysis on Amazon product reviews. Dimensions: Quality, Price, Delivery, Features, Customer Service.',
    params: [
      { name: 'asin', type: 'string', required: true, desc: 'Amazon ASIN' },
      { name: 'marketplace', type: 'string', required: false, desc: 'US · DE · UK · FR · ES (default: US)' },
    ],
    example: `curl -X GET "https://api.amazenlens.com/v1/review/sentiment?asin=B07QK955LS" \\
  -H "X-API-Key: al_your_key_here"`,
    response: `{
  "asin": "B07QK955LS",
  "total_reviews": 284,
  "overall_sentiment": "positive",
  "dimensions": {
    "quality": { "score": 4.6, "sentiment": "positive", "mentions": 89 },
    "price": { "score": 4.2, "sentiment": "positive", "mentions": 61 },
    "delivery": { "score": 4.8, "sentiment": "very_positive", "mentions": 34 },
    "features": { "score": 4.1, "sentiment": "positive", "mentions": 72 },
    "customer_service": { "score": 3.9, "sentiment": "neutral", "mentions": 28 }
  },
  "top_pain_points": ["silicone smell initially", "handle grip"],
  "response_ms": 1840
}`,
    color: '#ff9f0a',
  },
  {
    method: 'GET',
    path: '/v1/product/detail',
    title: 'Product Detail',
    desc: 'Full product data: title, price, BSR, review count, rating, images, bullet points, and variants.',
    params: [
      { name: 'asin', type: 'string', required: true, desc: 'Amazon ASIN' },
      { name: 'marketplace', type: 'string', required: false, desc: 'US · DE · UK · FR · ES · IT (default: US)' },
    ],
    example: `curl -X GET "https://api.amazenlens.com/v1/product/detail?asin=B07QK955LS&marketplace=US" \\
  -H "X-API-Key: al_your_key_here"`,
    response: `{
  "asin": "B07QK955LS",
  "title": "Silicone Spatula Set 6-Piece Non-Stick",
  "price": 24.99,
  "bsr": 2340,
  "bsr_category": "Kitchen & Dining",
  "review_count": 284,
  "rating": 4.5,
  "fba": true,
  "seller_count": 3,
  "monthly_sales_est": 890,
  "response_ms": 380
}`,
    color: '#af52de',
  },
]

const PLANS = [
  { name: 'Free', price: '$0', queries: '100 / mo', color: '#8e8e93', bg: '#f5f5f7', badge: '' },
  { name: 'Developer', price: '$49', queries: '5,000 / mo', color: '#0071e3', bg: '#e8f0fe', badge: '' },
  { name: 'Startup', price: '$149', queries: '25,000 / mo', color: '#34c759', bg: '#e8f9ee', badge: '🔥 Popular' },
  { name: 'Growth', price: '$399', queries: '100,000 / mo', color: '#ff9f0a', bg: '#fff4e0', badge: '' },
  { name: 'Business', price: '$999', queries: '500,000 / mo', color: '#af52de', bg: '#f3e8ff', badge: '' },
]

export default function ApiDocsPage() {
  const { t } = useTranslation()
  const [activeEndpoint, setActiveEndpoint] = useState(0)
  const [apiKeys, setApiKeys] = useState([])
  const [newKeyName, setNewKeyName] = useState('')
  const [creating, setCreating] = useState(false)
  const [newKeyValue, setNewKeyValue] = useState(null)
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState('curl')

  const token = localStorage.getItem('token')

  useEffect(() => {
    if (token) fetchKeys()
  }, [token])

  const fetchKeys = async () => {
    try {
      const res = await axios.get(`${API}/v1/keys`, { headers: { Authorization: `Bearer ${token}` } })
      setApiKeys(res.data.keys || [])
    } catch {}
  }

  const createKey = async () => {
    if (!token) return
    setCreating(true)
    try {
      const res = await axios.post(`${API}/v1/keys`, { name: newKeyName || 'My Key' }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setNewKeyValue(res.data.key)
      setNewKeyName('')
      fetchKeys()
    } catch (e) {
      alert(e?.response?.data?.detail || 'Error creating key')
    }
    setCreating(false)
  }

  const deleteKey = async (id) => {
    if (!confirm('Delete this API key? This action cannot be undone.')) return
    try {
      await axios.delete(`${API}/v1/keys/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      fetchKeys()
    } catch {}
  }

  const copyText = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const ep = ENDPOINTS[activeEndpoint]

  const pythonExample = (ep) => `import requests

url = "https://api.amazenlens.com${ep.path}"
headers = {"X-API-Key": "al_your_key_here"}
params = {${ep.params.filter(p => p.required).map(p => `"${p.name}": "example"`).join(', ')}}

response = requests.get(url, headers=headers, params=params)
print(response.json())`

  const nodeExample = (ep) => `const axios = require('axios');

const res = await axios.get('https://api.amazenlens.com${ep.path}', {
  headers: { 'X-API-Key': 'al_your_key_here' },
  params: { ${ep.params.filter(p => p.required).map(p => `${p.name}: 'example'`).join(', ')} }
});
console.log(res.data);`

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <style>{`
        .api-code { background: #1d1d1f; color: #f5f5f7; padding: 16px 20px; borderRadius: 10px; fontSize: 12px; fontFamily: 'SF Mono', 'Fira Code', monospace; lineHeight: 1.7; overflowX: auto; whiteSpace: pre; margin: 0; }
        .ep-btn { display: flex; align-items: center; gap: 8px; padding: '8px 12px'; borderRadius: 8px; cursor: pointer; border: 0.5px solid transparent; marginBottom: 4px; }
        .tab-btn { padding: 5px 14px; borderRadius: 6px; fontSize: 12px; fontWeight: 500; border: none; cursor: pointer; fontFamily: inherit; }
        .plan-card { border-radius: 12px; padding: 20px; text-align: center; border: 0.5px solid #e5e5ea; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <div style={{ fontSize: '11px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px', background: '#e8f0fe', color: '#0071e3' }}>API v1</div>
          <div style={{ fontSize: '11px', color: '#8e8e93' }}>RapidAPI · Direct Access · B2B</div>
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1d1d1f', marginBottom: '6px' }}>{t('api_docs.title')}</h1>
        <p style={{ fontSize: '14px', color: '#8e8e93', maxWidth: '600px' }}>
          {t('api_docs.subtitle')}
        </p>
      </div>

      {/* Quick Start */}
      <div style={{ background: '#1d1d1f', borderRadius: '12px', padding: '20px 24px', marginBottom: '28px' }}>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{t('api_docs.quick_start')}</div>
        <pre className="api-code">{`curl -X GET "https://api.amazenlens.com/v1/niche/score?asin=B07QK955LS" \\
  -H "X-API-Key: al_your_key_here"`}</pre>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '16px', marginBottom: '28px' }}>
        {/* Endpoint List */}
        <div>
          <div style={{ fontSize: '11px', color: '#8e8e93', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('api_docs.endpoints')}</div>
          {ENDPOINTS.map((e, i) => (
            <div key={i} onClick={() => setActiveEndpoint(i)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 12px', borderRadius: '8px', cursor: 'pointer', marginBottom: '3px',
                background: activeEndpoint === i ? 'white' : 'transparent',
                border: activeEndpoint === i ? '0.5px solid #e5e5ea' : '0.5px solid transparent' }}>
              <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', background: e.color + '18', color: e.color }}>GET</span>
              <span style={{ fontSize: '12px', color: activeEndpoint === i ? '#1d1d1f' : '#6e6e73', fontFamily: 'monospace' }}>{e.path.split('/').pop()}</span>
            </div>
          ))}
          <div style={{ marginTop: '12px', fontSize: '11px', color: '#8e8e93', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('api_docs.auth_label')}</div>
          <div style={{ padding: '9px 12px', borderRadius: '8px', background: '#f5f5f7', fontSize: '11px', color: '#3c3c43' }}>
            Header: <code style={{ fontFamily: 'monospace', color: '#0071e3' }}>X-API-Key</code>
          </div>
          <div style={{ marginTop: '8px', padding: '9px 12px', borderRadius: '8px', background: '#f5f5f7', fontSize: '11px', color: '#3c3c43' }}>
            Base URL:<br />
            <code style={{ fontFamily: 'monospace', fontSize: '10px', color: '#6e6e73', wordBreak: 'break-all' }}>api.amazenlens.com</code>
          </div>
        </div>

        {/* Endpoint Detail */}
        <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', overflow: 'hidden' }}>
          {/* Title */}
          <div style={{ padding: '16px 20px', borderBottom: '0.5px solid #f5f5f7' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', background: ep.color + '18', color: ep.color }}>GET</span>
              <code style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f' }}>{ep.path}</code>
            </div>
            <p style={{ fontSize: '13px', color: '#6e6e73', margin: 0 }}>{ep.desc}</p>
          </div>

          {/* Parameters */}
          <div style={{ padding: '16px 20px', borderBottom: '0.5px solid #f5f5f7' }}>
            <div style={{ fontSize: '11px', color: '#8e8e93', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('api_docs.params')}</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ color: '#8e8e93' }}>
                  <th style={{ textAlign: 'left', paddingBottom: '6px', fontWeight: '500' }}>{t('api_docs.col_name')}</th>
                  <th style={{ textAlign: 'left', paddingBottom: '6px', fontWeight: '500' }}>{t('api_docs.col_type')}</th>
                  <th style={{ textAlign: 'left', paddingBottom: '6px', fontWeight: '500' }}>{t('api_docs.col_required')}</th>
                  <th style={{ textAlign: 'left', paddingBottom: '6px', fontWeight: '500' }}>{t('api_docs.col_desc')}</th>
                </tr>
              </thead>
              <tbody>
                {ep.params.map((p, i) => (
                  <tr key={i} style={{ borderTop: '0.5px solid #f5f5f7' }}>
                    <td style={{ padding: '7px 0' }}><code style={{ color: '#0071e3', fontFamily: 'monospace' }}>{p.name}</code></td>
                    <td style={{ padding: '7px 8px', color: '#8e8e93' }}>{p.type}</td>
                    <td style={{ padding: '7px 8px' }}>
                      <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: p.required ? '#fee2e2' : '#f5f5f7', color: p.required ? '#dc2626' : '#8e8e93' }}>
                        {p.required ? t('api_docs.tag_required') : t('api_docs.tag_optional')}
                      </span>
                    </td>
                    <td style={{ padding: '7px 0', color: '#3c3c43' }}>{p.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Code Examples */}
          <div style={{ padding: '16px 20px', borderBottom: '0.5px solid #f5f5f7' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ fontSize: '11px', color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('api_docs.request')}</div>
              <div style={{ display: 'flex', gap: '4px' }}>
                {['curl', 'python', 'node'].map(tab => (
                  <button key={tab} className="tab-btn" onClick={() => setActiveTab(tab)}
                    style={{ background: activeTab === tab ? '#1d1d1f' : '#f5f5f7', color: activeTab === tab ? 'white' : '#6e6e73' }}>
                    {tab}
                  </button>
                ))}
                <button className="tab-btn" onClick={() => copyText(activeTab === 'curl' ? ep.example : activeTab === 'python' ? pythonExample(ep) : nodeExample(ep))}
                  style={{ background: '#f5f5f7', color: copied ? '#34c759' : '#6e6e73' }}>
                  {copied ? '✓' : t('api_docs.copy')}
                </button>
              </div>
            </div>
            <pre className="api-code">
              {activeTab === 'curl' ? ep.example : activeTab === 'python' ? pythonExample(ep) : nodeExample(ep)}
            </pre>
          </div>

          {/* Response */}
          <div style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: '11px', color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>{t('api_docs.response_200')}</div>
            <pre className="api-code">{ep.response}</pre>
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '24px', marginBottom: '28px' }}>
        <div style={{ fontSize: '15px', fontWeight: '600', color: '#1d1d1f', marginBottom: '4px' }}>{t('api_docs.pricing_title')}</div>
        <div style={{ fontSize: '13px', color: '#8e8e93', marginBottom: '20px' }}>{t('api_docs.pricing_desc')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
          {PLANS.map((p, i) => (
            <div key={i} className="plan-card" style={{ background: p.bg }}>
              {p.badge && <div style={{ fontSize: '10px', fontWeight: '700', color: p.color, marginBottom: '4px' }}>{p.badge}</div>}
              <div style={{ fontSize: '13px', fontWeight: '600', color: p.color, marginBottom: '4px' }}>{p.name}</div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#1d1d1f' }}>{p.price}</div>
              <div style={{ fontSize: '10px', color: '#8e8e93', marginTop: '2px' }}>{t('api_docs.per_month')}</div>
              <div style={{ fontSize: '11px', color: '#3c3c43', marginTop: '8px', fontWeight: '500' }}>{p.queries}</div>
              <div style={{ fontSize: '10px', color: '#8e8e93' }}>{t('api_docs.queries')}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: '11px', color: '#8e8e93', marginTop: '12px', textAlign: 'center' }}>
          {t('api_docs.contact_note')} <a href="mailto:api@amazenlens.com" style={{ color: '#0071e3', textDecoration: 'none' }}>{t('api_docs.contact_link')}</a> {t('api_docs.contact_suffix')}
        </div>
      </div>

      {/* API Key Management */}
      <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '24px' }}>
        <div style={{ fontSize: '15px', fontWeight: '600', color: '#1d1d1f', marginBottom: '4px' }}>{t('api_docs.keys_title')}</div>
        <div style={{ fontSize: '13px', color: '#8e8e93', marginBottom: '20px' }}>{t('api_docs.keys_desc')}</div>

        {!token ? (
          <div style={{ textAlign: 'center', padding: '24px', background: '#f5f5f7', borderRadius: '10px' }}>
            <div style={{ fontSize: '13px', color: '#6e6e73', marginBottom: '12px' }}>{t('api_docs.sign_in_prompt')}</div>
            <a href="/auth" style={{ display: 'inline-block', padding: '8px 20px', borderRadius: '8px', background: '#0071e3', color: 'white', textDecoration: 'none', fontSize: '13px', fontWeight: '500' }}>
              {t('api_docs.sign_in')} →
            </a>
          </div>
        ) : (
          <>
            {/* New key revealed */}
            {newKeyValue && (
              <div style={{ background: '#e8f9ee', border: '0.5px solid #34c759', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: '#1a7f37', fontWeight: '600', marginBottom: '6px' }}>✅ {t('api_docs.key_created')}</div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <code style={{ flex: 1, fontSize: '12px', fontFamily: 'monospace', color: '#1d1d1f', background: 'white', padding: '8px 12px', borderRadius: '6px', border: '0.5px solid #d2d2d7', wordBreak: 'break-all' }}>
                    {newKeyValue}
                  </code>
                  <button onClick={() => copyText(newKeyValue)}
                    style={{ padding: '8px 14px', borderRadius: '6px', background: copied ? '#34c759' : '#0071e3', color: 'white', border: 'none', cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit', flexShrink: 0 }}>
                    {copied ? `✓ ${t('api_docs.copied')}` : t('api_docs.copy')}
                  </button>
                </div>
              </div>
            )}

            {/* Existing keys */}
            {apiKeys.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                {apiKeys.map((k, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '10px', border: '0.5px solid #e5e5ea', marginBottom: '6px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: '#1d1d1f' }}>{k.name}</div>
                      <div style={{ fontSize: '11px', color: '#8e8e93', marginTop: '1px' }}>
                        {k.plan} plan · {k.usage_count?.toLocaleString()} / {k.monthly_limit?.toLocaleString()} queries used · Created {new Date(k.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ width: '80px', height: '4px', borderRadius: '2px', background: '#f5f5f7', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: '2px', background: k.usage_count / k.monthly_limit > 0.8 ? '#ff3b30' : '#34c759', width: `${Math.min(100, (k.usage_count / k.monthly_limit) * 100)}%` }} />
                    </div>
                    <button onClick={() => deleteKey(k.id)}
                      style={{ fontSize: '11px', color: '#ff3b30', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '4px 8px' }}>
                      {t('api_docs.delete_key')}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Create new */}
            {apiKeys.length < 3 && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  value={newKeyName}
                  onChange={e => setNewKeyName(e.target.value)}
                  placeholder={t('api_docs.key_name_placeholder')}
                  style={{ flex: 1, padding: '9px 14px', borderRadius: '8px', border: '0.5px solid #d2d2d7', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }}
                  onKeyDown={e => e.key === 'Enter' && createKey()}
                />
                <button onClick={createKey} disabled={creating}
                  style={{ padding: '9px 20px', borderRadius: '8px', background: creating ? '#e5e5ea' : '#0071e3', color: creating ? '#8e8e93' : 'white', border: 'none', cursor: creating ? 'default' : 'pointer', fontSize: '13px', fontFamily: 'inherit', fontWeight: '500', whiteSpace: 'nowrap' }}>
                  {creating ? t('api_docs.creating') : t('api_docs.generate_key')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
