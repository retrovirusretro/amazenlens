import { defineConfig } from 'wxt';

export default defineConfig({
  extensionEntrypoints: {},
  manifest: {
    name: 'AmazenLens',
    description: 'Amazon ürün sayfasında niş skoru, fiyat analizi ve Trendyol karşılaştırması',
    version: '1.0.0',
    permissions: ['activeTab', 'storage'],
    host_permissions: [
      '*://*.amazon.com/*',
      '*://*.amazon.co.uk/*',
      '*://*.amazon.de/*',
      '*://*.amazon.fr/*',
      '*://*.amazon.es/*',
      '*://*.amazon.com.tr/*',
      'https://amazenlens-production.up.railway.app/*'
    ],
    action: {
      default_title: 'AmazenLens',
      default_popup: 'popup/index.html'
    }
  }
});
