import { fileURLToPath, URL } from 'node:url';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';

// La versión vive solo en package.json; el footer la lee de aquí.
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

/**
 * Identificador del build.
 *
 * La versión de package.json solo cambia cuando alguien se acuerda de subirla,
 * así que no sirve para saber qué hay desplegado. Esto cambia en cada build:
 * en Vercel, el commit; en local, el commit de git; y si no hay git, la fecha.
 */
function buildId() {
  const deVercel = process.env.VERCEL_GIT_COMMIT_SHA;
  if (deVercel) return deVercel.slice(0, 7);
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
  }
}

const build = buildId();

/**
 * Las cabeceras de seguridad que pone Vercel (CSP incluida), para `pnpm preview`.
 *
 * Así una CSP que rompa algo se ve en local antes de desplegar. En `pnpm dev`
 * no se aplican: el recargado en caliente de Vite necesita cosas que la CSP
 * de producción no deja.
 */
function cabecerasDeVercel() {
  const { headers = [] } = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf8'));
  const todas = headers.find((regla) => regla.source === '/(.*)')?.headers ?? [];
  return Object.fromEntries(todas.map(({ key, value }) => [key, value]));
}

export default defineConfig({
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(version),
    'import.meta.env.VITE_APP_BUILD': JSON.stringify(build),
    // vue-i18n compila cada traducción con `new Function` si no se le dice lo
    // contrario, y la CSP (vercel.json) no deja evaluar código: la app se
    // quedaba en blanco. Con esto interpreta los mensajes sin generar código.
    __INTLIFY_JIT_COMPILATION__: true
  },
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'PoGoDex',
        short_name: 'PoGoDex',
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
        // Con un `workbox` propio hay que pedir estos dos a mano: sin ellos el
        // service worker nuevo se queda esperando a que se cierren todas las
        // pestañas, y en una app instalada eso no pasa nunca. Era el motivo de
        // tener que desinstalarla para ver los cambios.
        clientsClaim: true,
        skipWaiting: true,
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json}'],
        // roster.json y pvp.json pasan de 800 KB: sin esto quedan fuera del precache.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: '/index.html',
        // Al activarse una versión nueva, fuera la precaché de las anteriores:
        // que no quede ningún fichero viejo sirviéndose.
        cleanupOutdatedCaches: true,
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
              cacheableResponse: { statuses: [200] }
            }
          },
          // Imágenes: caché primero, para no volver a bajarlas en cada visita.
          //
          // Las cachés llevan versión (-v2): las de antes guardaban respuestas
          // opacas, y servidas a una petición con crossorigin el navegador las
          // rechaza. En producción no cargaba ni una imagen a quien ya había
          // entrado. Con otro nombre, el service worker nuevo no lee nada viejo;
          // las antiguas se borran al arrancar (ver main.js).
          //
          // Solo se guarda lo que llega bien (200): las imágenes se piden con
          // crossorigin, así que no hay respuestas opacas, que podían esconder
          // un 404 y dejar una imagen rota en la caché aunque se arreglara en
          // origen. Y caducan en un mes (una semana los carteles), para que una
          // imagen corregida acabe llegando.
          {
            // Miniaturas WebP propias (scripts/build-sprites.mjs): se sirven
            // desde nuestra web y son las que usa la app para los sprites. No
            // van en la precaché (son 2.400): se guardan según se ven.
            urlPattern: /\/sprites\/(shiny\/)?\d+\.webp$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'miniaturas-v1',
              expiration: { maxEntries: 2500, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [200] }
            }
          },
          {
            // La fuente (src/assets/fonts). Lleva el hash en el nombre, así que
            // una versión nueva es otra URL y nunca se sirve una vieja. No va
            // en la precaché: latin-ext solo lo necesita quien lo usa.
            urlPattern: /\/assets\/source-code-pro-.*\.woff2$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fuentes-v1',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [200] }
            }
          },
          {
            // Sprites de PokeAPI (el PNG original, si falta la miniatura).
            urlPattern: /^https:\/\/raw\.githubusercontent\.com\/PokeAPI\/sprites\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'pokeapi-sprites-v2',
              expiration: { maxEntries: 2000, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [200] }
            }
          },
          {
            // Iconos de formas y disfraces (pokemon-go-api).
            urlPattern: /^https:\/\/raw\.githubusercontent\.com\/pokemon-go-api\/assets\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'formas-v2',
              expiration: { maxEntries: 1500, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [200] }
            }
          },
          {
            // Carteles de evento (cambian con cada evento) e iconos de LeekDuck.
            urlPattern: /^https:\/\/cdn\.leekduck\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'leekduck-img-v2',
              expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [200] }
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
  preview: {
    headers: cabecerasDeVercel()
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
