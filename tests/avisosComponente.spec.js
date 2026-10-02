import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import i18n from '../src/plugins/i18n'

/**
 * El botón de avisos de Eventos: sin clave VAPID no sale; con ella, activa
 * los avisos (permiso, suscripción del navegador y alta en Supabase) y los
 * quita (baja en Supabase, que la marca y no borra, y fuera la suscripción).
 */
const rpc = vi.fn(async () => ({ error: null }))
vi.mock('../src/lib/supabaseClient', () => ({
  supabase: {},
  supabaseCompleto: async () => ({ rpc })
}))

const ModalFalso = {
  props: ['open', 'title'],
  template: '<div v-if="open" role="dialog"><slot /></div>'
}

const montar = async () => {
  const { default: AvisosEventos } = await import('../src/components/events/AvisosEventos.vue')
  const w = mount(AvisosEventos, {
    global: { plugins: [i18n], stubs: { BaseModal: ModalFalso } }
  })
  await flushPromises()
  return w
}

describe('avisos de eventos', () => {
  let suscripcion
  beforeEach(() => {
    vi.resetModules()
    rpc.mockClear()
    localStorage.clear()
    suscripcion = null
    const pushManager = {
      getSubscription: vi.fn(async () => suscripcion),
      subscribe: vi.fn(async () => {
        suscripcion = {
          endpoint: 'https://push.example/abc',
          toJSON: () => ({
            endpoint: 'https://push.example/abc',
            keys: { p256dh: 'p', auth: 'a' }
          }),
          unsubscribe: vi.fn(async () => {
            suscripcion = null
            return true
          })
        }
        return suscripcion
      })
    }
    const registro = { pushManager }
    vi.stubGlobal('navigator', {
      ...navigator,
      serviceWorker: { ready: Promise.resolve(registro), getRegistration: async () => registro }
    })
    vi.stubGlobal('PushManager', function PushManager() {})
    vi.stubGlobal('Notification', {
      permission: 'default',
      requestPermission: async () => 'granted'
    })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('sin clave VAPID no pinta nada', async () => {
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', '')
    const w = await montar()
    expect(w.find('button').exists()).toBe(false)
  })

  it('activa con las categorías marcadas y luego los quita', async () => {
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', 'AQID')
    const w = await montar()
    await w.find('button').trigger('click')
    expect(w.find('[role="dialog"]').exists()).toBe(true)

    // Por defecto, Días de la Comunidad y las horas. Se añade «Eventos».
    const casilla = w.findAll('[role="dialog"] button').find((b) => b.text().includes('GO Tour'))
    await casilla.trigger('click')
    const activar = w.findAll('button').find((b) => b.text() === 'Activar avisos')
    await activar.trigger('click')
    await flushPromises()

    expect(rpc).toHaveBeenCalledWith(
      'push_alta',
      expect.objectContaining({
        p_endpoint: 'https://push.example/abc',
        p_p256dh: 'p',
        p_auth: 'a',
        p_idioma: 'es',
        p_categorias: ['community', 'hours', 'events']
      })
    )
    expect(w.text()).toContain('Listo: te avisaremos.')
    expect(JSON.parse(localStorage.getItem('pogodex:avisos'))).toEqual([
      'community',
      'hours',
      'events'
    ])

    const quitar = w.findAll('button').find((b) => b.text() === 'Quitar los avisos')
    await quitar.trigger('click')
    await flushPromises()
    expect(rpc).toHaveBeenLastCalledWith('push_baja', { p_endpoint: 'https://push.example/abc' })
    expect(suscripcion).toBeNull()
    expect(w.text()).toContain('Ya no te avisaremos.')
  })

  it('con el permiso denegado lo dice y no ofrece activar', async () => {
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', 'AQID')
    vi.stubGlobal('Notification', { permission: 'denied', requestPermission: async () => 'denied' })
    const w = await montar()
    await w.find('button').trigger('click')
    expect(w.text()).toContain('bloqueados')
    expect(w.findAll('button').some((b) => b.text() === 'Activar avisos')).toBe(false)
  })
})
