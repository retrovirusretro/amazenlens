import { useState, useEffect } from 'react';

export function PopupApp() {
  const [token, setToken] = useState<string | null>(null);
  const [currentASIN, setCurrentASIN] = useState<string | null>(null);

  useEffect(() => {
    // Token kontrol
    chrome.storage.local.get('token', (r) => setToken(r.token || null));

    // Aktif sekmedeki ASIN
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0]?.url || '';
      const match = url.match(/\/dp\/([A-Z0-9]{10})/);
      if (match) setCurrentASIN(match[1]);
    });
  }, []);

  const links = [
    { label: '🔍 Ürün Ara', url: 'https://amazenlens.com/app/search' },
    { label: '🎯 Niş Skoru', url: 'https://amazenlens.com/app/niche' },
    { label: '📈 Trend Radar', url: 'https://amazenlens.com/app/trends' },
    { label: '🏭 Tedarik Bul', url: 'https://amazenlens.com/app/sourcing' },
  ];

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background: '#fff' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0071e3, #0058b3)', padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 22 }}>🎯</span>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>AmazenLens</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>Amazon Araştırma Aracı</div>
          </div>
        </div>
      </div>

      <div style={{ padding: 14 }}>
        {/* Mevcut ASIN */}
        {currentASIN && (
          <div style={{ background: '#f0f9ff', border: '1px solid #bae0ff', borderRadius: 10, padding: '10px 12px', marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: '#0071e3', fontWeight: 500, marginBottom: 4 }}>Sayfadaki Ürün</div>
            <div style={{ fontSize: 12, color: '#1d1d1f', fontFamily: 'monospace', fontWeight: 600 }}>{currentASIN}</div>
            <a
              href={`https://amazenlens.com/app/product/${currentASIN}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'block', marginTop: 8, background: '#0071e3', color: '#fff', textAlign: 'center', padding: '6px', borderRadius: 8, fontSize: 12, textDecoration: 'none', fontWeight: 500 }}
            >
              AmazenLens'te Analiz Et →
            </a>
          </div>
        )}

        {/* Hızlı Linkler */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          {links.map(link => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: '#f5f5f7', borderRadius: 10, padding: '10px 8px',
                textDecoration: 'none', color: '#1d1d1f', fontSize: 12,
                textAlign: 'center', fontWeight: 500, display: 'block',
                border: '1px solid rgba(0,0,0,0.06)',
              }}
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Auth durumu */}
        {!token ? (
          <a
            href="https://amazenlens.com/auth"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'block', textAlign: 'center', background: '#34c759', color: '#fff', padding: '8px', borderRadius: 10, fontSize: 13, textDecoration: 'none', fontWeight: 500 }}
          >
            Giriş Yap / Kayıt Ol
          </a>
        ) : (
          <div style={{ fontSize: 11, color: '#34c759', textAlign: 'center' }}>✅ Bağlı</div>
        )}
      </div>
    </div>
  );
}
