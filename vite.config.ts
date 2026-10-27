import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg', 'icons/badge-96.png', 'push-sw.js'],
      manifest: {
        name: 'IronMind',
        short_name: 'IronMind',
        description: 'Tu rutina, tus pesos y tu progreso.',
        lang: 'es',
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#131417',
        theme_color: '#131417',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // Recibe las notificaciones de fin de descanso (public/push-sw.js).
        importScripts: ['push-sw.js'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // GIFs de demostración: se guardan en caché al verlos una vez.
            urlPattern: ({ url }) => url.hostname === 'cdn.jsdelivr.net',
            handler: 'CacheFirst',
            options: { cacheName: 'demos', expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 90 } }
          }
        ]
      }
    })
  ],
  test: { environment: 'node' }
} as never);
