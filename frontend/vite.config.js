import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'logo-icon.svg', 'logo512.svg', 'robots.txt'],
      manifest: {
        name: 'AmazenLens',
        short_name: 'AmazenLens',
        description: 'Amazon satıcıları için araştırma platformu',
        theme_color: '#0071e3',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/app/dashboard',
        icons: [
          { src: '/logo-icon.svg', sizes: 'any', type: 'image/svg+xml' },
          { src: '/logo512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/amazenlens-production\.up\.railway\.app\/api\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'api-cache', expiration: { maxAgeSeconds: 300 } },
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})