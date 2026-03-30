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

async function fetchNicheScore(asin: string) {
  // Token al
  const { token } = await chrome.storage.local.get('token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // Niche score
  const nicheRes = await fetch(`${API}/api/niche/score?asin=${asin}`, { headers });
  const nicheData = nicheRes.ok ? await nicheRes.json() : null;

  // Product info (easyparser)
  const prodRes = await fetch(`${API}/api/amazon/product/${asin}`, { headers });
  const prodData = prodRes.ok ? await prodRes.json() : null;

  return {
    asin,
    niche_score: nicheData?.score ?? nicheData?.niche_score ?? null,
    title: prodData?.title ?? prodData?.product?.title ?? `ASIN: ${asin}`,
    price: prodData?.price ?? prodData?.product?.price ?? null,
    bsr: prodData?.bsr ?? prodData?.product?.bsr ?? null,
    reviews: prodData?.reviews ?? prodData?.product?.reviews ?? null,
    currency: prodData?.currency ?? 'USD',
    mock: nicheData?.mock ?? true,
  };
}
