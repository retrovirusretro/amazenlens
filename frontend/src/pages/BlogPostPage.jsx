import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || ''
const SITE = 'https://amazenlens.com'

function BlogPostPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const isPublic = !location.pathname.startsWith('/app')
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPost()
  }, [slug])

  const fetchPost = async () => {
    try {
      const res = await axios.get(`${API}/api/blog/posts/${slug}`)
      setPost(res.data)
    } catch (err) {
      navigate(isPublic ? '/blog' : '/app/blog')
    } finally {
      setLoading(false)
    }
  }

  const renderContent = (content) => {
    if (!content) return ''
    return content.split('\n').map((line, i) => {
      if (line.startsWith('## ')) return <h2 key={i} style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', margin: '32px 0 16px' }}>{line.replace('## ', '')}</h2>
      if (line.startsWith('### ')) return <h3 key={i} style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', margin: '24px 0 12px' }}>{line.replace('### ', '')}</h3>
      if (line.startsWith('- ')) return <li key={i} style={{ color: '#374151', lineHeight: '1.8', marginLeft: '20px' }}>{line.replace('- ', '')}</li>
      if (line.match(/^\d+\./)) return <li key={i} style={{ color: '#374151', lineHeight: '1.8', marginLeft: '20px' }}>{line.replace(/^\d+\./, '').trim()}</li>
      if (line === '') return <br key={i} />
      return <p key={i} style={{ color: '#374151', lineHeight: '1.8', marginBottom: '12px' }}>{line}</p>
    })
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '80px', color: '#64748b' }}>Yükleniyor...</div>
  if (!post) return null

  const canonicalUrl = `${SITE}/blog/${slug}`
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title_tr,
    description: post.summary_tr,
    author: { '@type': 'Organization', name: post.author || 'AmazenLens' },
    publisher: {
      '@type': 'Organization',
      name: 'AmazenLens',
      logo: { '@type': 'ImageObject', url: `${SITE}/logo-light.svg` }
    },
    datePublished: post.created_at,
    dateModified: post.updated_at || post.created_at,
    url: canonicalUrl,
    keywords: post.tags?.join(', ') || '',
    image: post.cover_image || `${SITE}/logo-light.svg`,
  }

  return (
    <>
      <Helmet>
        <title>{post.title_tr} | AmazenLens Blog</title>
        <meta name="description" content={post.summary_tr || ''} />
        <meta name="keywords" content={post.tags?.join(', ') || 'amazon, fba, satıcı'} />
        <meta property="og:title" content={post.title_tr} />
        <meta property="og:description" content={post.summary_tr || ''} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content={post.cover_image || `${SITE}/logo-light.svg`} />
        <meta property="article:published_time" content={post.created_at} />
        <meta property="article:section" content={post.category || 'Amazon'} />
        {post.tags?.map(tag => <meta key={tag} property="article:tag" content={tag} />)}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title_tr} />
        <meta name="twitter:description" content={post.summary_tr || ''} />
        <link rel="canonical" href={canonicalUrl} />
        <script type="application/ld+json">{JSON.stringify(articleSchema)}</script>
      </Helmet>

      {/* Public navbar */}
      {isPublic && (
        <div style={{ position: 'sticky', top: 0, zIndex: 100, background: 'white', borderBottom: '0.5px solid #e5e5ea', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link to="/" style={{ textDecoration: 'none', fontSize: '17px', fontWeight: '700', color: '#1d1d1f', letterSpacing: '-0.3px' }}>
            AmazenLens
          </Link>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Link to="/blog" style={{ fontSize: '13px', color: '#3c3c43', textDecoration: 'none' }}>← Blog</Link>
            <Link to="/auth" style={{ fontSize: '13px', padding: '7px 16px', background: '#0071e3', color: 'white', borderRadius: '8px', textDecoration: 'none', fontWeight: '600' }}>Ücretsiz Dene →</Link>
          </div>
        </div>
      )}

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 24px' }}>
        {!isPublic && (
          <button onClick={() => navigate('/app/blog')}
            style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '14px', fontWeight: '600', marginBottom: '24px', padding: '0' }}>
            ← Blog'a Dön
          </button>
        )}

        {/* Kategori & süre */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
          {post.category && (
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#3b82f6', background: '#eff6ff', padding: '4px 12px', borderRadius: '20px' }}>
              {post.category}
            </span>
          )}
          <span style={{ fontSize: '13px', color: '#94a3b8' }}>⏱ {post.read_time} dk okuma</span>
          <span style={{ fontSize: '13px', color: '#94a3b8' }}>👁 {post.view_count} görüntülenme</span>
        </div>

        <h1 style={{ fontSize: '36px', fontWeight: '800', color: '#1e293b', lineHeight: '1.3', marginBottom: '16px' }}>
          {post.title_tr}
        </h1>

        <p style={{ fontSize: '18px', color: '#64748b', lineHeight: '1.7', marginBottom: '32px', borderLeft: '4px solid #3b82f6', paddingLeft: '16px', fontStyle: 'italic' }}>
          {post.summary_tr}
        </p>

        {post.tags && post.tags.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '32px' }}>
            {post.tags.map(tag => (
              <span key={tag} style={{ fontSize: '12px', color: '#64748b', background: '#f1f5f9', padding: '4px 10px', borderRadius: '4px' }}>
                #{tag}
              </span>
            ))}
          </div>
        )}

        <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', marginBottom: '32px' }} />

        <div style={{ fontSize: '16px', lineHeight: '1.8' }}>
          {renderContent(post.content_tr)}
        </div>

        {/* CTA */}
        <div style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', borderRadius: '16px', padding: '32px', textAlign: 'center', marginTop: '48px', color: 'white' }}>
          <h3 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '8px' }}>
            🔍 AmazenLens ile Ürün Araştırmanı Yap
          </h3>
          <p style={{ fontSize: '15px', opacity: '0.9', marginBottom: '20px' }}>
            Türkiye'nin ilk Türkçe Amazon araştırma platformu. $19/ay'dan başlayan fiyatlarla.
          </p>
          <button onClick={() => navigate('/auth')}
            style={{ background: 'white', color: '#3b82f6', border: 'none', padding: '12px 32px', borderRadius: '8px', fontWeight: '700', fontSize: '15px', cursor: 'pointer' }}>
            Hemen Başla →
          </button>
        </div>
      </div>
    </>
  )
}

export default BlogPostPage
