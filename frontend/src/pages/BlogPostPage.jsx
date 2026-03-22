import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || ''

function BlogPostPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
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
      navigate('/blog')
    } finally {
      setLoading(false)
    }
  }

  const renderContent = (content) => {
    if (!content) return ''
    return content
      .split('\n')
      .map((line, i) => {
        if (line.startsWith('## ')) return <h2 key={i} style={{fontSize: '24px', fontWeight: '700', color: '#1e293b', margin: '32px 0 16px'}}>{line.replace('## ', '')}</h2>
        if (line.startsWith('### ')) return <h3 key={i} style={{fontSize: '20px', fontWeight: '700', color: '#1e293b', margin: '24px 0 12px'}}>{line.replace('### ', '')}</h3>
        if (line.startsWith('- ')) return <li key={i} style={{color: '#374151', lineHeight: '1.8', marginLeft: '20px'}}>{line.replace('- ', '')}</li>
        if (line.match(/^\d+\./)) return <li key={i} style={{color: '#374151', lineHeight: '1.8', marginLeft: '20px'}}>{line.replace(/^\d+\./, '').trim()}</li>
        if (line === '') return <br key={i} />
        return <p key={i} style={{color: '#374151', lineHeight: '1.8', marginBottom: '12px'}}>{line}</p>
      })
  }

  if (loading) return (
    <div style={{textAlign: 'center', padding: '80px', color: '#64748b'}}>
      Yükleniyor...
    </div>
  )

  if (!post) return null

  return (
    <div style={{maxWidth: '800px', margin: '0 auto', padding: '32px 24px'}}>
      {/* Geri butonu */}
      <button onClick={() => navigate('/blog')}
        style={{
          background: 'none', border: 'none', color: '#3b82f6',
          cursor: 'pointer', fontSize: '14px', fontWeight: '600',
          marginBottom: '24px', padding: '0'
        }}>
        ← Blog'a Dön
      </button>

      {/* Kategori & süre */}
      <div style={{display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center'}}>
        {post.category && (
          <span style={{
            fontSize: '13px', fontWeight: '600', color: '#3b82f6',
            background: '#eff6ff', padding: '4px 12px', borderRadius: '20px'
          }}>
            {post.category}
          </span>
        )}
        <span style={{fontSize: '13px', color: '#94a3b8'}}>⏱ {post.read_time} dk okuma</span>
        <span style={{fontSize: '13px', color: '#94a3b8'}}>👁 {post.view_count} görüntülenme</span>
      </div>

      {/* Başlık */}
      <h1 style={{
        fontSize: '36px', fontWeight: '800', color: '#1e293b',
        lineHeight: '1.3', marginBottom: '16px'
      }}>
        {post.title_tr}
      </h1>

      {/* Özet */}
      <p style={{
        fontSize: '18px', color: '#64748b', lineHeight: '1.7',
        marginBottom: '32px', borderLeft: '4px solid #3b82f6',
        paddingLeft: '16px', fontStyle: 'italic'
      }}>
        {post.summary_tr}
      </p>

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '32px'}}>
          {post.tags.map(tag => (
            <span key={tag} style={{
              fontSize: '12px', color: '#64748b',
              background: '#f1f5f9', padding: '4px 10px', borderRadius: '4px'
            }}>
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Ayırıcı */}
      <hr style={{border: 'none', borderTop: '1px solid #e2e8f0', marginBottom: '32px'}} />

      {/* İçerik */}
      <div style={{fontSize: '16px', lineHeight: '1.8'}}>
        {renderContent(post.content_tr)}
      </div>

      {/* CTA */}
      <div style={{
        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
        borderRadius: '16px', padding: '32px', textAlign: 'center',
        marginTop: '48px', color: 'white'
      }}>
        <h3 style={{fontSize: '22px', fontWeight: '700', marginBottom: '8px'}}>
          🔍 AmazenLens ile Ürün Araştırmanı Yap
        </h3>
        <p style={{fontSize: '15px', opacity: '0.9', marginBottom: '20px'}}>
          Türkiye'nin ilk Türkçe Amazon araştırma platformu. $19/ay'dan başlayan fiyatlarla.
        </p>
        <button onClick={() => navigate('/dashboard')}
          style={{
            background: 'white', color: '#3b82f6', border: 'none',
            padding: '12px 32px', borderRadius: '8px', fontWeight: '700',
            fontSize: '15px', cursor: 'pointer'
          }}>
          Hemen Başla →
        </button>
      </div>
    </div>
  )
}

export default BlogPostPage
