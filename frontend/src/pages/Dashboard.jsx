function Dashboard() {
  return (
    <div>
      <h1 style={{fontSize: '24px', fontWeight: '700', marginBottom: '24px'}}>
        📊 Dashboard
      </h1>
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px'}}>
        <div style={{background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}}>
          <p style={{color: '#64748b', fontSize: '14px'}}>Toplam Arama</p>
          <h2 style={{fontSize: '32px', fontWeight: '700', color: '#3b82f6'}}>0</h2>
        </div>
        <div style={{background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}}>
          <p style={{color: '#64748b', fontSize: '14px'}}>Analiz Edilen Ürün</p>
          <h2 style={{fontSize: '32px', fontWeight: '700', color: '#10b981'}}>0</h2>
        </div>
        <div style={{background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}}>
          <p style={{color: '#64748b', fontSize: '14px'}}>Bulunan Fırsat</p>
          <h2 style={{fontSize: '32px', fontWeight: '700', color: '#f59e0b'}}>0</h2>
        </div>
      </div>
      <div style={{background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}}>
        <h3 style={{marginBottom: '16px', fontWeight: '600'}}>🚀 Hızlı Başlangıç</h3>
        <p style={{color: '#64748b', lineHeight: '1.6'}}>
          Sol menüden <strong>Ürün Ara</strong> ile başla — keyword gir, ürünleri listele, niş skorunu gör.
        </p>
      </div>
    </div>
  )
}

export default Dashboard