import { defineBackground } from 'wxt/sandbox';

const API = 'https://amazenlens-production.up.railway.app';

export default defineBackground(() => {
  // Content script'ten mesaj al, API'ye ilet
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'FETCH_NICHE') {
      fetchNicheScore(message.asin)
        .then(data => sendResponse({ ok: true, data }))
        .catch(err => sendResponse({ ok: false, error: err.message }));
      return true; // async response için
    }

    if (message.type === 'FETCH_TRENDS') {
      fetchTrends(message.keyword)
        .then(data => sendResponse({ ok: true, data }))
        .catch(err => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    if (message.type === 'GET_TOKEN') {
      chrome.storage.local.get('token', (result) => {
        sendResponse({ token: result.token || null });
      });
      return true;
    }

    if (message.type === 'SET_TOKEN') {
      chrome.storage.local.set({ token: message.token }, () => {
        sendResponse({ ok: true });
      });
      return true;
    }
  });
});

async function fetchTrends(keyword: string) {
  try {
    const res = await fetch(`${API}/api/trends/keyword?keyword=${encodeURIComponent(keyword)}&market=US&months=3`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchNicheScore(asin: string) {
  const { token } = await chrome.storage.local.get('token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // /api/amazon/product/{asin} hem ürün bilgisini hem niche_score'u döner
  const prodRes = await fetch(`${API}/api/amazon/product/${asin}`, { headers });
  const prodData = prodRes.ok ? await prodRes.json() : null;

  const nicheObj = prodData?.niche_score;
  const score = nicheObj?.total_score ?? nicheObj?.score ?? (typeof nicheObj === 'number' ? nicheObj : null);

  return {
    asin,
    niche_score: score,
    title: prodData?.title ?? prodData?.product?.title ?? `ASIN: ${asin}`,
    price: prodData?.price ?? prodData?.product?.price ?? null,
    bsr: prodData?.bsr ?? prodData?.product?.bsr ?? null,
    reviews: prodData?.reviews ?? prodData?.product?.reviews ?? null,
    currency: prodData?.currency ?? 'USD',
    mock: prodData?.mock ?? false,
  };
}
