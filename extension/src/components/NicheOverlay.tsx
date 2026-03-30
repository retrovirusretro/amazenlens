import { useState, useEffect, useRef, useCallback } from 'react';

const APP_URL = 'https://amazenlens.com';

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

interface Props { asin: string; }

function Sparkline({ points, color }: { points: number[]; color: string }) {
  if (!points.length) return null;
  const w = 160, h = 36;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const xs = points.map((_, i) => (i / (points.length - 1)) * w);
  const ys = points.map(v => h - ((v - min) / range) * (h - 4) - 2);
  const d = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
  const fill = `${d} L${w},${h} L0,${h} Z`;
  return (
    <svg width={w} height={h} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={fill} fill="url(#sg)" />
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Son nokta */}
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="3" fill={color} />
    </svg>
  );
}

export function NicheOverlay({ asin }: Props) {
  const [data, setData] = useState<OverlayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trends, setTrends] = useState<number[] | null>(null);

  // Drag state
  const [pos, setPos] = useState({ x: window.innerWidth - 308, y: window.innerHeight - 320 });
  const dragging = useRef(false);
  const dragOffset = useRef({ dx: 0, dy: 0 });
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'FETCH_NICHE', asin }, (response) => {
      if (chrome.runtime.lastError) { setError('Bağlantı hatası'); setLoading(false); return; }
      if (response?.ok) {
        setData(response.data);
        // Trends için title'dan keyword çek
        const kw = (response.data?.title || asin).split(' ').filter((w: string) => w.length > 3).slice(0, 3).join(' ');
        chrome.runtime.sendMessage({ type: 'FETCH_TRENDS', keyword: kw }, (tr) => {
          if (tr?.ok && tr.data?.interest_over_time?.length) {
            setTrends(tr.data.interest_over_time.map((p: any) => p.value ?? p));
          }
        });
      } else {
        setError(response?.error ?? 'Veri alınamadı');
      }
      setLoading(false);
    });
  }, [asin]);

  // Drag handlers
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    dragOffset.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
    e.preventDefault();
  }, [pos]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - 284, e.clientX - dragOffset.current.dx)),
        y: Math.max(0, Math.min(window.innerHeight - 100, e.clientY - dragOffset.current.dy)),
      });
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  const score = data?.niche_score;
  const scoreColor = score == null ? '#8e8e93' : score >= 70 ? '#34c759' : score >= 50 ? '#ff9f0a' : '#ff3b30';
  const scoreLabel = score == null ? '—' : score >= 70 ? 'Güçlü Fırsat' : score >= 50 ? 'Orta Risk' : 'Kaçın';
  const width = expanded ? 300 : 260;

  if (collapsed) {
    return (
      <div
        onClick={() => setCollapsed(false)}
        style={{
          position: 'fixed', left: pos.x + (width - 48) / 2, top: pos.y,
          zIndex: 999999, width: 48, height: 48, borderRadius: '50%',
          background: '#0071e3', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,113,227,0.4)',
          fontSize: 20, fontFamily: 'system-ui',
          transition: 'transform 0.15s',
          userSelect: 'none',
        }}
        title="AmazenLens"
      >🎯</div>
    );
  }

  return (
    <div
      ref={overlayRef}
      style={{
        position: 'fixed', left: pos.x, top: pos.y,
        zIndex: 999999, width,
        borderRadius: 16,
        background: '#fff',
        border: '1px solid rgba(0,0,0,0.08)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontSize: 13, color: '#1d1d1f',
        overflow: 'hidden',
        transition: 'width 0.2s ease',
        userSelect: 'none',
      }}
    >
      {/* Header — draggable */}
      <div
        onMouseDown={onMouseDown}
        style={{
          background: 'linear-gradient(135deg, #0071e3, #0058b3)',
          padding: '10px 12px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'grab',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 15 }}>🎯</span>
          <span style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>AmazenLens</span>
          {data?.mock && (
            <span style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: 10, padding: '1px 6px', borderRadius: 8 }}>Demo</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {/* Büyüt/küçült */}
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={() => setExpanded(v => !v)}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: 6, padding: '2px 6px', fontSize: 11, lineHeight: 1.4 }}
            title={expanded ? 'Küçült' : 'Büyüt'}
          >
            {expanded ? '⊟' : '⊞'}
          </button>
          {/* Kapat */}
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={() => setCollapsed(true)}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0 }}
          >×</button>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '12px 13px' }}>
        {loading ? (
          <>
            <div style={{ height: 10, background: '#f0f0f3', borderRadius: 6, marginBottom: 10, animation: 'pulse 1.4s ease-in-out infinite' }} />
            <div style={{ height: 38, background: '#f0f0f3', borderRadius: 8, marginBottom: 10 }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
              <div style={{ height: 52, background: '#f0f0f3', borderRadius: 10 }} />
              <div style={{ height: 52, background: '#f0f0f3', borderRadius: 10 }} />
            </div>
            {expanded && <div style={{ height: 44, background: '#f0f0f3', borderRadius: 8 }} />}
          </>
        ) : error ? (
          <div style={{ color: '#ff3b30', fontSize: 12, textAlign: 'center', padding: '8px 0' }}>⚠️ {error}</div>
        ) : data ? (
          <>
            {/* Title */}
            <div style={{ fontSize: 11, color: '#6e6e73', marginBottom: 10, lineHeight: 1.4 }}>
              {(data.title || '').slice(0, expanded ? 90 : 55)}{(data.title || '').length > (expanded ? 90 : 55) ? '…' : ''}
            </div>

            {/* Niche Score */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: '#6e6e73' }}>Niş Skoru</span>
                <span style={{ fontSize: 22, fontWeight: 700, color: scoreColor }}>{score ?? '—'}</span>
              </div>
              <div style={{ height: 6, background: '#f0f0f3', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${score ?? 0}%`, background: scoreColor, borderRadius: 3, transition: 'width 0.7s ease' }} />
              </div>
              <div style={{ fontSize: 11, color: scoreColor, marginTop: 3, fontWeight: 500 }}>{scoreLabel}</div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              <div style={{ background: '#f5f5f7', borderRadius: 10, padding: '8px 10px' }}>
                <div style={{ fontSize: 10, color: '#6e6e73' }}>Fiyat</div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{data.price ? `$${data.price}` : '—'}</div>
              </div>
              <div style={{ background: '#f5f5f7', borderRadius: 10, padding: '8px 10px' }}>
                <div style={{ fontSize: 10, color: '#6e6e73' }}>BSR</div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{data.bsr ? `#${data.bsr.toLocaleString()}` : '—'}</div>
              </div>
            </div>

            {/* Trends sparkline — expanded modda veya trends varsa */}
            {(expanded || trends) && trends && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: '#6e6e73', marginBottom: 5, display: 'flex', justifyContent: 'space-between' }}>
                  <span>Google Trends (3 ay)</span>
                  <span style={{ color: trends[trends.length - 1] >= trends[0] ? '#34c759' : '#ff3b30', fontWeight: 600 }}>
                    {trends[trends.length - 1] >= trends[0] ? '▲' : '▼'} {Math.abs(trends[trends.length - 1] - trends[0])}pt
                  </span>
                </div>
                <Sparkline points={trends} color={trends[trends.length - 1] >= trends[0] ? '#34c759' : '#ff3b30'} />
              </div>
            )}

            {/* Expanded: reviews */}
            {expanded && data.reviews && (
              <div style={{ background: '#f5f5f7', borderRadius: 10, padding: '8px 10px', marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: '#6e6e73' }}>Toplam Yorum</div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{data.reviews.toLocaleString()}</div>
              </div>
            )}

            {/* CTA */}
            <a
              href={`${APP_URL}/app/product/${asin}`}
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
