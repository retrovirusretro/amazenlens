import { useState, useEffect } from 'react';

const APP_URL = 'https://amazenlens.com';

interface ProductScore {
  asin: string;
  title: string;
  price: number | null;
  bsr: number | null;
  niche_score: number | null;
  loading: boolean;
}

interface Props {
  asins: string[];
}

export function SearchSidebar({ asins }: Props) {
  const [items, setItems] = useState<ProductScore[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!asins.length) return;

    // Başlangıçta loading state ile doldur
    const initial: ProductScore[] = asins.map(asin => ({
      asin, title: asin, price: null, bsr: null, niche_score: null, loading: true,
    }));
    setItems(initial);

    // Her ASIN için arka planda skor çek (staggered — sunucuyu yüklemez)
    asins.forEach((asin, idx) => {
      setTimeout(() => chrome.runtime.sendMessage({ type: 'FETCH_NICHE', asin }, (response) => {
        if (chrome.runtime.lastError || !response?.ok) return;
        const d = response.data;
        setItems(prev => {
          const updated = [...prev];
          updated[idx] = {
            asin,
            title: d.title || asin,
            price: d.price,
            bsr: d.bsr,
            niche_score: d.niche_score,
            loading: false,
          };
          return [...updated].sort((a, b) => {
            if (a.loading) return 1;
            if (b.loading) return -1;
            return (b.niche_score ?? 0) - (a.niche_score ?? 0);
          });
        });
      }), idx * 300); // her ürün 300ms arayla — skeleton görünür + sunucu yükü azalır
    });
  }, [asins.join(',')]);

  const scoreColor = (s: number | null) =>
    s == null ? '#8e8e93' : s >= 70 ? '#34c759' : s >= 50 ? '#ff9f0a' : '#ff3b30';

  if (collapsed) {
    return (
      <div
        onClick={() => setCollapsed(false)}
        style={{
          position: 'fixed', top: '50%', right: 0, transform: 'translateY(-50%)',
          zIndex: 999999, background: '#0071e3', color: '#fff',
          padding: '12px 6px', borderRadius: '10px 0 0 10px',
          cursor: 'pointer', writingMode: 'vertical-rl',
          fontSize: 12, fontWeight: 600, fontFamily: 'system-ui',
          boxShadow: '-4px 0 16px rgba(0,113,227,0.3)',
          userSelect: 'none',
        }}
        title="AmazenLens Skor Sıralaması"
      >
        🎯 AmazenLens
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', top: 80, right: 0, bottom: 20,
      zIndex: 999999, width: 220,
      background: '#fff', borderRadius: '12px 0 0 12px',
      border: '1px solid rgba(0,0,0,0.1)', borderRight: 'none',
      boxShadow: '-4px 0 24px rgba(0,0,0,0.1)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0071e3, #0058b3)',
        padding: '10px 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14 }}>🎯</span>
          <span style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>Niş Sıralaması</span>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: 16, padding: 0, lineHeight: 1 }}
        >×</button>
      </div>

      {/* Subtitle */}
      <div style={{ padding: '6px 12px', fontSize: 11, color: '#8e8e93', background: '#f5f5f7', flexShrink: 0 }}>
        {items.filter(i => !i.loading).length}/{items.length} analiz edildi · Yüksekten düşüğe
      </div>

      {/* List */}
      <div style={{ overflowY: 'auto', flex: 1, padding: '6px 8px' }}>
        {items.map((item, idx) => (
          <a
            key={item.asin}
            href={`${APP_URL}/app/product/${item.asin}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 6px', borderRadius: 8, marginBottom: 4,
              textDecoration: 'none', color: 'inherit',
              background: idx === 0 && !item.loading ? 'rgba(52,199,89,0.08)' : 'transparent',
              border: idx === 0 && !item.loading ? '1px solid rgba(52,199,89,0.2)' : '1px solid transparent',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f7')}
            onMouseLeave={e => (e.currentTarget.style.background = idx === 0 && !item.loading ? 'rgba(52,199,89,0.08)' : 'transparent')}
          >
            {/* Rank */}
            <div style={{
              width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
              background: idx === 0 ? '#0071e3' : '#f5f5f7',
              color: idx === 0 ? '#fff' : '#6e6e73',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700,
            }}>
              {idx + 1}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: '#1d1d1f', lineHeight: 1.3, marginBottom: 2,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.loading ? (
                  <div style={{ height: 10, background: '#e5e5ea', borderRadius: 4, width: '80%' }} />
                ) : (item.title || item.asin).slice(0, 30) + ((item.title || '').length > 30 ? '…' : '')}
              </div>
              {!item.loading && (
                <div style={{ fontSize: 10, color: '#8e8e93' }}>
                  {item.price ? `$${item.price}` : ''}
                  {item.bsr ? ` · #${item.bsr.toLocaleString()}` : ''}
                </div>
              )}
            </div>

            {/* Score */}
            <div style={{
              fontSize: 13, fontWeight: 700, flexShrink: 0,
              color: item.loading ? '#e5e5ea' : scoreColor(item.niche_score),
              minWidth: 28, textAlign: 'right',
            }}>
              {item.loading ? '…' : (item.niche_score ?? '—')}
            </div>
          </a>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        padding: '8px 12px', borderTop: '1px solid #f5f5f7',
        flexShrink: 0,
      }}>
        <a
          href={`${APP_URL}/app/search`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block', textAlign: 'center',
            background: '#0071e3', color: '#fff',
            padding: '7px', borderRadius: 8,
            textDecoration: 'none', fontSize: 12, fontWeight: 500,
          }}
        >
          AmazenLens'te Ara →
        </a>
      </div>
    </div>
  );
}
