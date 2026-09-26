import { defineConfig, devices } from '@playwright/test'

/**
 * Tests e2e en los tres tamaños que usa la gente: móvil, tablet y escritorio.
 *
 * Lo que se comprueba aquí es lo que no puede ver un test unitario: que la
 * página no desborde a lo ancho, que los listados que dependen de Supabase y
 * de los datos generados rendericen de verdad, y que la navegación funcione.
 *
 * El servidor lo levanta Playwright solo. `reuseExistingServer` evita pelearse
 * con el que ya tengas abierto mientras desarrollas.
 */
export default defineConfig({
  testDir: './e2e',
  // Los datos vienen de Supabase y de GitHub: hay que darles aire.
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : [['list']],

  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5175',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },

  /**
   * Los tres van sobre Chromium a propósito: aquí se comprueba el diseño, no
   * el motor. El perfil de tablet lleva el viewport de un iPad y táctil, pero
   * sin arrastrar WebKit, que son 100 MB más de descarga. Si algún día hace
   * falta cubrir Safari de verdad: `npx playwright install webkit`.
   */
  projects: [
    { name: 'movil', use: { ...devices['Pixel 7'] } },
    {
      name: 'tablet',
      use: { ...devices['Desktop Chrome'], viewport: { width: 820, height: 1180 }, hasTouch: true }
    },
    {
      name: 'escritorio',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } }
    }
  ],

  // Puerto propio y estricto: así no se cuela el servidor de desarrollo que
  // puedas tener abierto en el 5173 y los tests siempre miran este código.
  webServer: {
    command: 'pnpm dev --port 5175 --strictPort',
    url: 'http://localhost:5175',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
})
