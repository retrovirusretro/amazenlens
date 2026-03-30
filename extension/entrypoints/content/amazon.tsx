import ReactDOM from 'react-dom/client';
import { NicheOverlay } from '../../components/NicheOverlay';

export default defineContentScript({
  matches: [
    '*://*.amazon.com/dp/*',
    '*://*.amazon.com/*/dp/*',
    '*://*.amazon.co.uk/dp/*',
    '*://*.amazon.co.uk/*/dp/*',
    '*://*.amazon.de/dp/*',
    '*://*.amazon.de/*/dp/*',
    '*://*.amazon.fr/dp/*',
    '*://*.amazon.fr/*/dp/*',
    '*://*.amazon.es/dp/*',
    '*://*.amazon.es/*/dp/*',
    '*://*.amazon.com.tr/dp/*',
    '*://*.amazon.com.tr/*/dp/*',
  ],
  main() {
    const asin = extractASIN();
    if (!asin) return;

    // Shadow DOM container
    const host = document.createElement('div');
    host.id = 'amazenlens-root';
    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: 'open' });
    const container = document.createElement('div');
    shadow.appendChild(container);

    const root = ReactDOM.createRoot(container);
    root.render(<NicheOverlay asin={asin} />);

    // SPA navigasyonunu dinle (Amazon SPA)
    let lastUrl = location.href;
    new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        const newAsin = extractASIN();
        if (newAsin && newAsin !== asin) {
          root.render(<NicheOverlay asin={newAsin} />);
        }
      }
    }).observe(document, { subtree: true, childList: true });
  },
});

function extractASIN(): string | null {
  // URL'den çek
  const urlMatch = window.location.pathname.match(/\/dp\/([A-Z0-9]{10})/);
  if (urlMatch) return urlMatch[1];

  // DOM'dan fallback
  const asinInput = document.getElementById('ASIN') as HTMLInputElement | null;
  if (asinInput?.value) return asinInput.value;

  const metaUrl = document.querySelector('meta[property="og:url"]');
  if (metaUrl) {
    const metaMatch = metaUrl.getAttribute('content')?.match(/\/dp\/([A-Z0-9]{10})/);
    if (metaMatch) return metaMatch[1];
  }

  return null;
}
