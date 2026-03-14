import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getProduct } from '../lib/api'

function ProductPage() {
  const { asin } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await getProduct(asin)
        setProduct(res.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchProduct()
  }, [asin])

  if (loading) return <div style={{padding:'32px'}}>Yükleniyor...</div>
  if (!product) return <div style={{padding:'32px'}}>Ürün bulunamadı.</div>

  const niche = product.niche_score
  const getColor = (c) => ({green:'#16a34a',yellow:'#ca8a04',orange:'#ea580c'}[c] || '#dc2626')
  const getBg = (c) => ({green:'#dcfce7',yellow:'#fef9c3',orange:'#ffedd5'}[c] || '#fee2e2')

  return (
    <div>
      <button onClick={() => navigate(-1)}
        style={{marginBottom:'24px',background:'none',border:'1px solid #e2e8f0',
        padding:'8px 16px',borderRadius:'8px',cursor:'pointer'}}>
        Geri
      </button>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'24px'}}>
        <div style={{background:'white',borderRadius:'12px',padding:'24px',
          boxShadow:'0 1px 3px rgba(0,0,0,0.1)'}}>
          <img src={product.image} alt={product.title}
            style={{width:'100%',height:'200px',objectFit:'contain',marginBottom:'16px'}} />
          <h1 style={{fontSize:'18px',fontWeight:'700',marginBottom:'16px',lineHeight:'1.4'}}>
            {product.title}
          </h1>
          <p style={{fontSize:'24px',fontWeight:'700',color:'#3b82f6',marginBottom:'8px'}}>
            ${product.price}
          </p>
          <p style={{color:'#64748b',fontSize:'14px',marginBottom:'8px'}}>
            Rating: {product.rating} - {product.reviews} yorum
          </p>
          <p style={{color:'#64748b',fontSize:'14px',marginBottom:'16px'}}>
            BSR: #{product.bsr}
          </p>
          <a href={product.url} target="_blank" rel="noopener noreferrer"
            style={{display:'block',textAlign:'center',padding:'12px',
            background:'#f59e0b',color:'white',borderRadius:'8px',
            textDecoration:'none',fontWeight:'600'}}>
            Amazon da Gor
          </a>
        </div>
        {niche && (
          <div style={{background:'white',borderRadius:'12px',padding:'24px',
            boxShadow:'0 1px 3px rgba(0,0,0,0.1)'}}>
            <h2 style={{fontSize:'18px',fontWeight:'700',marginBottom:'16px'}}>Nis Skoru</h2>
            <div style={{textAlign:'center',padding:'24px',borderRadius:'12px',
              marginBottom:'24px',background:getBg(niche.color)}}>
              <div style={{fontSize:'48px',fontWeight:'800',color:getColor(niche.color)}}>
                {niche.total_score}
              </div>
              <div style={{fontSize:'14px',color:'#64748b'}}>/ 100</div>
              <div style={{fontSize:'18px',fontWeight:'700',marginTop:'8px'}}>
                {niche.verdict}
              </div>
              <div style={{fontSize:'14px',color:'#64748b',marginTop:'4px'}}>
                {niche.recommendation}
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'16px'}}>
              {[
                {label:'Depolama',value:niche.details.storage},
                {label:'Lojistik',value:niche.details.logistics},
                {label:'Rekabet',value:niche.details.competition},
                {label:'Karlilik',value:niche.details.profit},
              ].map((item) => (
                <div key={item.label} style={{background:'#f8fafc',padding:'12px',borderRadius:'8px'}}>
                  <p style={{fontSize:'12px',color:'#64748b',marginBottom:'4px'}}>{item.label}</p>
                  <p style={{fontSize:'20px',fontWeight:'700'}}>
                    {item.value}<span style={{fontSize:'12px',color:'#64748b'}}>/25</span>
                  </p>
                </div>
              ))}
            </div>
            <div style={{background:'#f0fdf4',padding:'12px',borderRadius:'8px'}}>
              <p style={{fontSize:'14px',color:'#16a34a',fontWeight:'600'}}>
                Tahmini Kar Marji: %{niche.estimated_margin}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProductPage