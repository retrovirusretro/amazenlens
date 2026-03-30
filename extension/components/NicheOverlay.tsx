import { useState, useEffect } from 'react';

const API_URL = 'https://amazenlens.com';

interface OverlayData {
  asin: string;
  niche_score: number | null;
  title: string;
  price: number | null;
  bsr: number | null;
  reviews: number | null;
  currency: string;
  mock?: boolean;
}

interface Props {
  asin: string;
}

export function NicheOverlay({ asin }: Props) {
  const [data, setData] = useState<OverlayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    chrome.runtime.sendMessage(
      { type: 'FETCH_NICHE', asin },
      (response) => {
        if (chrome.runtime.lastError) {
          setError('Bağlantı hatası');
          setLoading(false);
          return;
        }
        if (response?.ok) {
          setData(response.data);
        } else {
          setError(response?.error ?? 'Veri alınamadı');
        }
        setLoading(false);
      }
    );
  }, [asin]);

  const score = data?.niche_score;
  const scoreColor = score == null ? '#8e8e93'
    : score >= 70 ? '#34c759'
    : score >= 50 ? '#ff9f0a'
    : '#ff3b30';

  const scoreLabel = score == null ? '—'
    : score >= 70 ? 'Güçlü Fırsat'
    : score >= 50 ? 'Orta Risk'
    : 'Kaçın';

  if (collapsed) {
    return (
      <div
        onClick={() => setCollapsed(false)}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 999999,
          width: 48, height: 48, borderRadius: '50%',
          background: '#0071e3', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,113,227,0.4)',
          fontSize: 20, fontFamily: 'system-ui',
          transition: 'transform 0.2s',
        }}
        title="AmazenLens"
      >
        🎯
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 999999,
      width: 280, borderRadius: 16,
      background: '#fff', border: '1px solid rgba(0,0,0,0.08)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSize: 13, color: '#1d1d1f',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0071e3, #0058b3)',
        padding: '10px 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 16 }}>🎯</span>
          <span style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>AmazenLens</span>
          {data?.mock && (
            <span style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: 10, padding: '1px 6px', borderRadius: 8 }}>
              Demo
            </span>
          )}
        </div>
        <button
          onClick={() => setCollapsed(true)}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0 }}
        >×</button>
      </div>

      {/* Body */}
      <div style={{ padding: '12px 14px' }}>
        {loading ? (
          <div>
            <div style={{ height: 12, background: '#f5f5f7', borderRadius: 6, marginBottom: 8 }} />
            <div style={{ height: 40, background: '#f5f5f7', borderRadius: 6, marginBottom: 8 }} />
            <div style={{ height: 12, background: '#f5f5f7', borderRadius: 6, width: '60%' }} />
          </div>
        ) : error ? (
          <div style={{ color: '#ff3b30', fontSize: 12, textAlign: 'center', padding: '8px 0' }}>
            ⚠️ {error}
          </div>
        ) : data ? (
          <>
            {/* Title */}
            <div style={{ fontSize: 12, color: '#6e6e73', marginBottom: 10, lineHeight: 1.4 }}>
              {(data.title || '').slice(0, 60)}{(data.title || '').length > 60 ? '…' : ''}
            </div>

            {/* Niche Score */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: '#6e6e73' }}>Niş Skoru</span>
                <span style={{ fontSize: 20, fontWeight: 700, color: scoreColor }}>
                  {score != null ? score : '—'}
                </span>
              </div>
              <div style={{ height: 6, background: '#f5f5f7', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${score ?? 0}%`,
                  background: scoreColor, borderRadius: 3,
                  transition: 'width 0.6s ease',
                }} />
              </div>
              <div style={{ fontSize: 11, color: scoreColor, marginTop: 3, fontWeight: 500 }}>
                {scoreLabel}
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              <div style={{ background: '#f5f5f7', borderRadius: 10, padding: '8px 10px' }}>
                <div style={{ fontSize: 11, color: '#6e6e73' }}>Fiyat</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {data.price ? `$${data.price}` : '—'}
                </div>
              </div>
              <div style={{ background: '#f5f5f7', borderRadius: 10, padding: '8px 10px' }}>
                <div style={{ fontSize: 11, color: '#6e6e73' }}>BSR</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {data.bsr ? `#${data.bsr.toLocaleString()}` : '—'}
                </div>
              </div>
            </div>

            {/* CTA */}
            <a
              href={`${API_URL}/app/product/${asin}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block', textAlign: 'center',
                background: '#0071e3', color: '#fff',
                padding: '8px 14px', borderRadius: 10,
                textDecoration: 'none', fontSize: 13, fontWeight: 500,
              }}
            >
              AmazenLens'te Aç →
            </a>
          </>
        ) : null}
      </div>
    </div>
  );
}
