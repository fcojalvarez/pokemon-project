import { fileURLToPath, URL } from 'node:url';
import { readFileSync } from 'node:fs';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';

// La versión vive solo en package.json; el footer la lee de aquí.
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(version)
  },
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'PogoDex',
        short_name: 'PogoDex',
        description:
          'Pokédex de Pokémon GO: evoluciones, PC de un 100 %, eventos, incursiones y los mejores en PvE y PvP.',
        lang: 'es',
        theme_color: '#f3f4f6',
        background_color: '#f3f4f6',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json}'],
        // roster.json y pvp.json pasan de 800 KB: sin esto quedan fuera del precache.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // Eventos, incursiones, huevos y tareas: primero la red y, si no hay
            // cobertura, lo último que se descargó.
            urlPattern: /^https:\/\/raw\.githubusercontent\.com\/bigfoott\/ScrapedDuck\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'scrapedduck',
              networkTimeoutSeconds: 8,
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            // Los sprites de PokeAPI no cambian: caché primero.
            urlPattern: /^https:\/\/raw\.githubusercontent\.com\/PokeAPI\/sprites\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'pokeapi-sprites',
              expiration: { maxEntries: 800, maxAgeSeconds: 60 * 60 * 24 * 60 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /^https:\/\/cdn\.leekduck\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'leekduck-img',
              expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      },
      devOptions: { enabled: false }
    })
  ],
  server: {
    // No vigilar la salida del build: evita reinicios/crashes (EBUSY) al ejecutar `pnpm build` con el dev server abierto
    watch: { ignored: ['**/dist/**'] }
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.spec.js']
  }
})
