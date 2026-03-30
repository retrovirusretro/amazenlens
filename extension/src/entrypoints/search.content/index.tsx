import ReactDOM from 'react-dom/client';
import { SearchSidebar } from '../../components/SearchSidebar';

export default defineContentScript({
  matches: [
    '*://*.amazon.com/s*',
    '*://*.amazon.co.uk/s*',
    '*://*.amazon.de/s*',
    '*://*.amazon.fr/s*',
    '*://*.amazon.es/s*',
    '*://*.amazon.com.tr/s*',
  ],
  main() {
    // Amazon arama sonuçları dinamik yükleniyor — DOM hazır olana kadar bekle
    waitForASINs().then(asins => {
      if (!asins.length) return;

      const host = document.createElement('div');
      host.id = 'amazenlens-search-root';
      document.body.appendChild(host);

      const shadow = host.attachShadow({ mode: 'open' });
      const container = document.createElement('div');
      shadow.appendChild(container);

      ReactDOM.createRoot(container).render(<SearchSidebar asins={asins} />);
    });
  },
});

function extractASINsFromPage(): string[] {
  const seen = new Set<string>();
  const asins: string[] = [];
  document.querySelectorAll('[data-asin]').forEach(el => {
    const asin = el.getAttribute('data-asin');
    if (asin && /^[A-Z0-9]{10}$/.test(asin) && !seen.has(asin)) {
      seen.add(asin);
      asins.push(asin);
    }
  });
  return asins.slice(0, 20);
}

function waitForASINs(maxWait = 8000): Promise<string[]> {
  return new Promise(resolve => {
    const start = Date.now();
    const check = () => {
      const asins = extractASINsFromPage();
      if (asins.length >= 3) {
        resolve(asins);
        return;
      }
      if (Date.now() - start > maxWait) {
        resolve(asins); // ne varsa al
        return;
      }
      setTimeout(check, 400);
    };
    check();
  });
}
