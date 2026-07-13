import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // Deployed on GitHub Pages under a sub-path
  base: '/Argos/',
  plugins: [
    react(),
    tailwindcss(),
    // Offline support (SPEC section 3): the app shell is precached so the
    // app opens without network; Supabase reads fall back to the last
    // successful response; writes are queued in IndexedDB (offlineQueue.ts).
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Argos',
        short_name: 'Argos',
        description: 'Gestion clients, tickets et facturation',
        lang: 'fr',
        start_url: '/Argos/',
        scope: '/Argos/',
        display: 'standalone',
        background_color: '#272d3a',
        theme_color: '#272d3a',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        navigateFallback: '/Argos/index.html',
        runtimeCaching: [
          {
            urlPattern: ({ url, request }) =>
              url.hostname.endsWith('.supabase.co') && request.method === 'GET',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-reads',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
