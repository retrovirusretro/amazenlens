import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'https://amazenlens-production.up.railway.app'

function BlogPage() {
  const [posts, setPosts] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()
  const isPublic = !location.pathname.startsWith('/app')

  useEffect(() => {
    fetchPosts()
    fetchCategories()
  }, [selectedCategory])

  const fetchPosts = async () => {
    try {
      const url = selectedCategory
        ? `${API}/api/blog/posts?category=${selectedCategory}`
        : `${API}/api/blog/posts`
      const res = await axios.get(url)
      setPosts(res.data.posts || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API}/api/blog/categories`)
      setCategories(res.data.categories || [])
    } catch (err) {}
  }

  const goToPost = (slug) => {
    if (isPublic) {
      navigate(`/blog/${slug}`)
    } else {
      navigate(`/app/blog/${slug}`)
    }
  }

  return (
    <>
      <Helmet>
        <title>Amazon Blog — Türkçe Satıcı Rehberi | AmazenLens</title>
        <meta name="description" content="Amazon FBA, ürün araştırması, arbitraj, niş analizi ve daha fazlası. Türkiye'nin en kapsamlı Amazon satıcı rehberi." />
        <meta property="og:title" content="AmazenLens Blog — Amazon Satıcı Rehberi" />
        <meta property="og:description" content="Amazon FBA, ürün araştırması, arbitraj ve niş analizi hakkında Türkçe içerikler." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://amazenlens.com/blog" />
        <meta property="og:image" content="https://amazenlens.com/logo-light.svg" />
        <link rel="canonical" href="https://amazenlens.com/blog" />
      </Helmet>

      {/* Public navbar */}
      {isPublic && (
        <div style={{ position: 'sticky', top: 0, zIndex: 100, background: 'white', borderBottom: '0.5px solid #e5e5ea', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link to="/" style={{ textDecoration: 'none', fontSize: '17px', fontWeight: '700', color: '#1d1d1f', letterSpacing: '-0.3px' }}>
            AmazenLens
          </Link>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Link to="/auth" style={{ fontSize: '13px', color: '#0071e3', textDecoration: 'none', fontWeight: '500' }}>Giriş Yap</Link>
            <Link to="/auth" style={{ fontSize: '13px', padding: '7px 16px', background: '#0071e3', color: 'white', borderRadius: '8px', textDecoration: 'none', fontWeight: '600' }}>Ücretsiz Dene →</Link>
          </div>
        </div>
      )}

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h1 style={{ fontSize: '36px', fontWeight: '800', color: '#1e293b', marginBottom: '12px' }}>
            📚 AmazenLens Blog
          </h1>
          <p style={{ color: '#64748b', fontSize: '16px', maxWidth: '600px', margin: '0 auto' }}>
            Amazon'da başarılı olmak için bilmeniz gereken her şey. Türkçe, ücretsiz, deneyime dayalı.
          </p>
        </div>

        {/* Kategoriler */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={() => setSelectedCategory(null)}
            style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '600', background: !selectedCategory ? '#3b82f6' : '#f1f5f9', color: !selectedCategory ? 'white' : '#64748b' }}>
            Tümü
          </button>
          {categories.map(cat => (
            <button key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '600', background: selectedCategory === cat ? '#3b82f6' : '#f1f5f9', color: selectedCategory === cat ? 'white' : '#64748b' }}>
              {cat}
            </button>
          ))}
        </div>

        {/* Makaleler */}
        {loading ? (
          <div style={{ textAlign: 'center', color: '#64748b', padding: '48px' }}>Yükleniyor...</div>
        ) : posts.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#64748b', padding: '48px' }}>Henüz makale yok.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
            {posts.map(post => (
              <article key={post.id}
                onClick={() => goToPost(post.slug)}
                style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ height: '160px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px' }}>
                  {post.category === 'Başlangıç' ? '🚀' : post.category === 'Ürün Araştırması' ? '🔍' : post.category === 'Arbitraj' ? '💱' : post.category === 'Tedarik' ? '🏭' : post.category === 'Finansal' ? '💰' : '📝'}
                </div>
                <div style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    {post.category && (
                      <span style={{ fontSize: '12px', fontWeight: '600', color: '#3b82f6', background: '#eff6ff', padding: '2px 8px', borderRadius: '4px' }}>
                        {post.category}
                      </span>
                    )}
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>⏱ {post.read_time} dk okuma</span>
                  </div>
                  <h2 style={{ fontSize: '17px', fontWeight: '700', color: '#1e293b', marginBottom: '8px', lineHeight: '1.4' }}>
                    {post.title_tr}
                  </h2>
                  <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.6', marginBottom: '16px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {post.summary_tr}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>👁 {post.view_count} görüntülenme</span>
                    <span style={{ fontSize: '13px', color: '#3b82f6', fontWeight: '600' }}>Devamını oku →</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

export default BlogPage
