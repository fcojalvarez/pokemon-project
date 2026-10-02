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

/**
 * dist/version.json: la versión y el build desplegados. Lo lee el workflow que
 * avisa a las apps abiertas (para no avisar antes de que Vercel sirva la
 * nueva) y el aviso de actualización, para decir a cuál se actualiza. Va fuera
 * de la precaché y sin caché en Vercel: tiene que ser siempre el de ahora.
 */
function versionJson() {
  return {
    name: 'pogodex-version-json',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version, build }) });
    }
  };
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
    versionJson(),
    VitePWA({
      // 'prompt': la versión nueva se descarga sola, pero no entra hasta que se
      // pulsa «Actualizar» en el aviso (UpdatePrompt). Con 'autoUpdate' la
      // página se recargaba sin preguntar, a mitad de lo que se estuviera haciendo.
      registerType: 'prompt',
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
        // El service worker nuevo espera: entra cuando se pulsa «Actualizar»
        // (usePwaUpdate le manda SKIP_WAITING) o al cerrar la app del todo. Antes
        // entraba solo y recargaba la página sin preguntar. clientsClaim, para
        // que en cuanto entre tome el control de la pestaña sin otra recarga.
        clientsClaim: true,
        skipWaiting: false,
        // Los avisos en el móvil (F14): qué hacer al llegar uno y al tocarlo.
        importScripts: ['push-sw.js'],
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json}'],
        // El de la versión se pide siempre a la red: es la que manda. Los datos
        // de respaldo, aparte (ver runtimeCaching): no bajan con cada versión.
        globIgnores: ['version.json', 'data/**'],
        // roster.json y pvp.json pasan de 800 KB: sin esto quedan fuera del precache.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: '/index.html',
        // /api va a Vercel (el .ics del calendario): sin esto, con la app instalada,
        // el service worker contestaba con la app y el Calendario no se abría.
        navigateFallbackDenylist: [/^\/api\//],
        // Al activarse una versión nueva, fuera la precaché de las anteriores:
        // que no quede ningún fichero viejo sirviéndose.
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          // Eventos, incursiones, huevos, tareas y Rocket (ScrapedDuck) no pasan
          // por aquí. Antes iban con NetworkFirst: sin red, o si tardaba más de
          // 8 s, se servía una copia de hasta 7 días y la app la tomaba por
          // recién bajada, sin avisar de que era vieja. La app ya guarda la suya
          // (localStorage, pogodex:live), sabe de cuándo es y lo dice.
          {
            // Los JSON de respaldo (public/data): solo se piden si Supabase no
            // responde y el dispositivo no tiene copia. Antes iban en la
            // precaché y cada versión nueva bajaba unos 2,8 MB que casi nunca
            // se usaban. Primero la red; sin ella, lo último que se bajó.
            urlPattern: /\/data\/[\w-]+\.json$/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'datos-respaldo-v1',
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 30 },
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
