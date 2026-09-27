import { describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { entre, lista, useFiltrosEnUrl } from '../src/composables/useFiltrosEnUrl'

/**
 * Los filtros de las páginas, en la URL: se leen al entrar y se escriben al
 * cambiar, sin los valores por defecto y sin añadir entradas al historial.
 */
async function montar(url, opciones) {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p*', component: { render: () => null } }] })
  await router.push('/antes')
  await router.push(url)
  const modo = ref('pve')
  const quitados = ref([])
  let resultado
  const Pagina = defineComponent({
    setup() {
      resultado = useFiltrosEnUrl({
        mode: { valor: modo, defecto: 'pve', leer: entre(['pve', 'pvp']) },
        without: { valor: quitados, defecto: [], ...lista(['mega', 'legacy']) }
      }, opciones)
      return () => h('div')
    }
  })
  mount(Pagina, { global: { plugins: [router] } })
  return { router, modo, quitados, resultado }
}

describe('filtros en la URL', () => {
  it('lee lo que trae la URL al entrar', async () => {
    const { modo, quitados, resultado } = await montar('/top?mode=pvp&without=legacy,mega')
    expect(modo.value).toBe('pvp')
    expect(quitados.value).toEqual(['legacy', 'mega'])
    expect(resultado.habiaFiltros).toBe(true)
  })

  it('ignora valores que no existen', async () => {
    const { modo, quitados, resultado } = await montar('/top?mode=hackeo&without=legacy,nada')
    expect(modo.value).toBe('pve')
    expect(quitados.value).toEqual(['legacy'])
    expect(resultado.habiaFiltros).toBe(true)
  })

  it('escribe los cambios sin los valores por defecto', async () => {
    const { router, modo, quitados } = await montar('/top')
    modo.value = 'pvp'
    quitados.value = ['mega']
    await nextTick(); await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/top?mode=pvp&without=mega')

    modo.value = 'pve'
    quitados.value = []
    await nextTick(); await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/top')
  })

  it('no añade entradas al historial: «atrás» va a la página anterior', async () => {
    const { router, modo } = await montar('/top')
    modo.value = 'pvp'
    await nextTick(); await flushPromises()
    router.back()
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/antes')
  })

  it('las claves de un solo uso se quitan al escribir', async () => {
    const { router, modo } = await montar('/live?dex=113', { quitar: ['dex'] })
    modo.value = 'pvp'
    await nextTick(); await flushPromises()
    expect(router.currentRoute.value.query).toEqual({ mode: 'pvp' })
  })
})
