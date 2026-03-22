import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || ''

const CATEGORIES = ['Başlangıç', 'Ürün Araştırması', 'Arbitraj', 'Tedarik', 'Finansal', 'Araç & Teknoloji']

const emptyForm = {
  title_tr: '', title_en: '', slug: '',
  summary_tr: '', summary_en: '',
  content_tr: '', content_en: '',
  category: 'Başlangıç', tags: '',
  author: 'AmazenLens', published: false,
  featured: false, read_time: 5
}

function BlogAdminPage() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  // Admin kontrolü
  if (!user.is_admin) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
        <div style={{ fontSize: '18px', fontWeight: '600', color: '#1d1d1f', marginBottom: '8px' }}>
          Erişim Yok
        </div>
        <div style={{ fontSize: '13px', color: '#8e8e93', marginBottom: '20px' }}>
          Bu sayfaya erişmek için admin yetkisi gerekiyor.
        </div>
        <button onClick={() => navigate('/app/dashboard')}
          style={{ padding: '10px 20px', background: '#0071e3', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit' }}>
          Dashboard'a Dön
        </button>
      </div>
    )
  }

  const [posts, setPosts] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState(null)
  const [tab, setTab] = useState('list')
  const [message, setMessage] = useState('')
  const [preview, setPreview] = useState(false)

  useEffect(() => { fetchPosts() }, [])

  const fetchPosts = async () => {
    try {
      const res = await axios.get(`${API}/api/blog/posts?limit=50`)
      setPosts(res.data.posts || [])
    } catch (err) {}
  }

  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
      .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-').trim()
  }

  const handleTitleChange = (val) => {
    setForm(f => ({ ...f, title_tr: val, slug: generateSlug(val) }))
  }

  const handleSave = async () => {
    try {
      const data = {
        ...form,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()) : [],
        read_time: parseInt(form.read_time)
      }
      if (editing) {
        await axios.put(`${API}/api/blog/posts/${editing}`, data)
        setMessage('✅ Makale güncellendi!')
      } else {
        await axios.post(`${API}/api/blog/posts`, data)
        setMessage('✅ Makale eklendi!')
      }
      setForm(emptyForm)
      setEditing(null)
      setTab('list')
      fetchPosts()
    } catch (err) {
      setMessage('❌ Hata: ' + (err.response?.data?.detail || err.message))
    }
  }

  const handleEdit = (post) => {
    setForm({ ...post, tags: Array.isArray(post.tags) ? post.tags.join(', ') : '' })
    setEditing(post.slug)
    setTab('editor')
  }

  const handleDelete = async (slug) => {
    if (!window.confirm('Silmek istediğinize emin misiniz?')) return
    try {
      await axios.delete(`${API}/api/blog/posts/${slug}`)
      setMessage('✅ Makale silindi!')
      fetchPosts()
    } catch (err) {
      setMessage('❌ Silinemedi')
    }
  }

  const renderPreview = (content) => {
    if (!content) return <p style={{ color: '#94a3b8' }}>İçerik yok...</p>
    return content.split('\n').map((line, i) => {
      if (line.startsWith('## ')) return <h2 key={i} style={{ fontSize: '22px', fontWeight: '700', margin: '24px 0 12px' }}>{line.replace('## ', '')}</h2>
      if (line.startsWith('### ')) return <h3 key={i} style={{ fontSize: '18px', fontWeight: '700', margin: '16px 0 8px' }}>{line.replace('### ', '')}</h3>
      if (line.startsWith('- ')) return <li key={i} style={{ marginLeft: '20px', lineHeight: '1.8' }}>{line.replace('- ', '')}</li>
      if (line === '') return <br key={i} />
      return <p key={i} style={{ lineHeight: '1.8', marginBottom: '8px' }}>{line}</p>
    })
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700' }}>✍️ Blog Yönetimi</h1>
          <div style={{ fontSize: '12px', color: '#34c759', marginTop: '2px' }}>🔑 Admin: {user.email}</div>
        </div>
        <button onClick={() => { setForm(emptyForm); setEditing(null); setTab('editor') }}
          style={{ padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
          + Yeni Makale
        </button>
      </div>

      {message && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', background: message.includes('✅') ? '#dcfce7' : '#fee2e2', color: message.includes('✅') ? '#16a34a' : '#dc2626' }}>
          {message}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {['list', 'editor'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '8px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', background: tab === t ? '#1e293b' : '#f1f5f9', color: tab === t ? 'white' : '#64748b' }}>
            {t === 'list' ? '📋 Makaleler' : '✍️ Editör'}
          </button>
        ))}
      </div>

      {tab === 'list' && (
        <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          {posts.length === 0 ? (
            <p style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>Henüz makale yok. Yeni makale ekle!</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  {['Başlık', 'Kategori', 'Durum', 'Görüntülenme', 'İşlemler'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b', fontWeight: '600' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {posts.map((post, i) => (
                  <tr key={post.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                    <td style={{ padding: '12px 16px', fontWeight: '600', maxWidth: '300px' }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {post.featured && <span style={{ color: '#f59e0b', marginRight: '6px' }}>⭐</span>}
                        {post.title_tr}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>{post.category}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '12px', background: post.published ? '#dcfce7' : '#fee2e2', color: post.published ? '#16a34a' : '#dc2626' }}>
                        {post.published ? '✅ Yayında' : '⏸ Taslak'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>👁 {post.view_count}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleEdit(post)}
                          style={{ padding: '4px 12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                          Düzenle
                        </button>
                        <button onClick={() => handleDelete(post.slug)}
                          style={{ padding: '4px 12px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                          Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'editor' && (
        <div style={{ display: 'grid', gridTemplateColumns: preview ? '1fr 1fr' : '1fr', gap: '24px' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700' }}>{editing ? 'Makale Düzenle' : 'Yeni Makale'}</h2>
              <button onClick={() => setPreview(!preview)}
                style={{ padding: '6px 14px', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
                {preview ? '👁 Önizlemeyi Kapat' : '👁 Önizle'}
              </button>
            </div>

            {[
              { label: 'Başlık (Türkçe) *', key: 'title_tr', onChange: handleTitleChange },
              { label: 'Slug (URL)', key: 'slug' },
              { label: 'Başlık (İngilizce)', key: 'title_en' },
            ].map(field => (
              <div key={field.key} style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>{field.label}</label>
                <input value={form[field.key] || ''}
                  onChange={e => field.onChange ? field.onChange(e.target.value) : setForm(f => ({ ...f, [field.key]: e.target.value }))}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            ))}

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Özet (Türkçe)</label>
              <textarea value={form.summary_tr || ''} onChange={e => setForm(f => ({ ...f, summary_tr: e.target.value }))} rows={3}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }} />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                İçerik (Markdown) * <span style={{ fontWeight: '400', color: '#94a3b8', marginLeft: '8px' }}>## Başlık, ### Alt Başlık, - Madde</span>
              </label>
              <textarea value={form.content_tr || ''} onChange={e => setForm(f => ({ ...f, content_tr: e.target.value }))} rows={16}
                placeholder="## Giriş&#10;&#10;İçeriğinizi buraya yazın..."
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Kategori</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none' }}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Okuma Süresi (dk)</label>
                <input type="number" value={form.read_time} onChange={e => setForm(f => ({ ...f, read_time: e.target.value }))}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none' }} />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Etiketler (virgülle ayır)</label>
              <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="amazon, fba, türkiye"
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
              {[{ label: '🌐 Yayınla', key: 'published' }, { label: '⭐ Öne Çıkar', key: 'featured' }].map(item => (
                <label key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
                  <input type="checkbox" checked={form[item.key]} onChange={e => setForm(f => ({ ...f, [item.key]: e.target.checked }))} style={{ width: '16px', height: '16px' }} />
                  {item.label}
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={handleSave}
                style={{ flex: 1, padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '15px', cursor: 'pointer' }}>
                💾 {editing ? 'Güncelle' : 'Kaydet'}
              </button>
              <button onClick={() => { setForm(emptyForm); setEditing(null); setTab('list') }}
                style={{ padding: '12px 20px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                İptal
              </button>
            </div>
          </div>

          {preview && (
            <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', maxHeight: '800px', overflowY: 'auto' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#94a3b8', marginBottom: '16px', textTransform: 'uppercase' }}>Önizleme</h3>
              <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#1e293b', marginBottom: '12px' }}>{form.title_tr || 'Başlık...'}</h1>
              <p style={{ color: '#64748b', fontSize: '16px', fontStyle: 'italic', marginBottom: '24px', borderLeft: '4px solid #3b82f6', paddingLeft: '12px' }}>
                {form.summary_tr || 'Özet...'}
              </p>
              <div>{renderPreview(form.content_tr)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default BlogAdminPage
