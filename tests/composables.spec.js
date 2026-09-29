import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'

/**
 * Los composables que usan varias vistas a la vez. Casi todos guardan estado
 * de módulo (la pila de capas, el orden de la ficha): cada test los importa de
 * nuevo para no heredar lo que dejó el anterior.
 */
const fresco = async (ruta) => {
  vi.resetModules()
  return import(ruta)
}

describe('orden de las secciones de la ficha', () => {
  beforeEach(() => localStorage.clear())

  it('un orden guardado se cruza con los bloques que existen', async () => {
    const { ordenValido, BLOQUES_FICHA } = await fresco('../src/composables/useOrdenFicha')
    // Uno que ya no existe se ignora, uno repetido cuenta una vez y los que
    // faltan van al final en su orden de fábrica.
    const orden = ordenValido(['pvp', 'viejo', 'pvp', 'donde'])
    expect(orden.slice(0, 2)).toEqual(['pvp', 'donde'])
    expect([...orden].sort()).toEqual([...BLOQUES_FICHA].sort())
    expect(ordenValido(null)).toEqual(BLOQUES_FICHA)
    expect(ordenValido('roto')).toEqual(BLOQUES_FICHA)
  })

  it('fijar lo guarda para la próxima visita y restablecer lo borra', async () => {
    const { useOrdenFicha, BLOQUES_FICHA } = await fresco('../src/composables/useOrdenFicha')
    const { orden, fijar, restablecer } = useOrdenFicha()
    fijar(['debilidades', ...BLOQUES_FICHA])
    expect(orden.value[0]).toBe('debilidades')
    expect(JSON.parse(localStorage.getItem('pogodex.fichaOrden'))[0]).toBe('debilidades')

    const otraVisita = await fresco('../src/composables/useOrdenFicha')
    expect(otraVisita.useOrdenFicha().orden.value[0]).toBe('debilidades')

    restablecer()
    expect(orden.value).toEqual(BLOQUES_FICHA)
    expect(localStorage.getItem('pogodex.fichaOrden')).toBeNull()
  })

  it('con el guardado roto, el orden de fábrica', async () => {
    localStorage.setItem('pogodex.fichaOrden', '{no es json')
    const { useOrdenFicha, BLOQUES_FICHA } = await fresco('../src/composables/useOrdenFicha')
    expect(useOrdenFicha().orden.value).toEqual(BLOQUES_FICHA)
  })
})

describe('useMedia', () => {
  let oyentes
  beforeEach(() => {
    oyentes = new Set()
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: (_, fn) => oyentes.add(fn),
      removeEventListener: (_, fn) => oyentes.delete(fn)
    })
  })
  afterEach(() => { delete window.matchMedia })

  it('sigue a la media query y suelta el oyente al desmontar', async () => {
    const { useMedia } = await import('../src/composables/useMedia')
    let ancho
    const w = mount(defineComponent({ setup: () => { ancho = useMedia('(min-width: 1280px)'); return () => null } }))
    expect(ancho.value).toBe(false)
    oyentes.forEach((fn) => fn({ matches: true }))
    expect(ancho.value).toBe(true)
    w.unmount()
    expect(oyentes.size).toBe(0)
  })
})

describe('clic fuera', () => {
  it('avisa al pulsar fuera, no dentro, y deja de escuchar al desmontar', async () => {
    const { default: useDetectOutsideClick } = await import('../src/composables/useDetectOutsideClick')
    const fuera = vi.fn()
    const w = mount(
      defineComponent({
        setup() {
          const caja = ref(null)
          useDetectOutsideClick(caja, fuera)
          return () => h('div', { ref: caja }, [h('button', { id: 'dentro' }, 'x')])
        }
      }),
      { attachTo: document.body }
    )
    w.get('#dentro').element.click()
    expect(fuera).not.toHaveBeenCalled()
    document.body.click()
    expect(fuera).toHaveBeenCalledTimes(1)
    w.unmount()
    document.body.click()
    expect(fuera).toHaveBeenCalledTimes(1)
  })
})

describe('cerrar con «atrás»', () => {
  let useCerrarConAtras
  beforeEach(async () => {
    ;({ useCerrarConAtras } = await fresco('../src/composables/useCerrarConAtras'))
  })

  it('abrir añade una entrada al historial y cerrar a mano la retira', () => {
    const back = vi.spyOn(history, 'back').mockImplementation(() => {})
    const antes = history.length
    const capa = useCerrarConAtras(vi.fn())
    capa.alAbrir()
    expect(history.length).toBe(antes + 1)
    expect(history.state.pogodexCapa).toBe(1)
    capa.alCerrar()
    expect(back).toHaveBeenCalledTimes(1)
    back.mockRestore()
  })

  it('«atrás» cierra la de más arriba, y esa ya no toca el historial', () => {
    const back = vi.spyOn(history, 'back').mockImplementation(() => {})
    const cerrarMenu = vi.fn()
    const cerrarModal = vi.fn()
    const menu = useCerrarConAtras(cerrarMenu)
    const modal = useCerrarConAtras(cerrarModal)
    menu.alAbrir()
    modal.alAbrir()

    window.dispatchEvent(new PopStateEvent('popstate'))
    expect(cerrarModal).toHaveBeenCalledTimes(1)
    expect(cerrarMenu).not.toHaveBeenCalled()
    // La ventana, al cerrarse, llama a alCerrar: su entrada ya no está.
    modal.alCerrar()
    expect(back).not.toHaveBeenCalled()
    back.mockRestore()
  })

  it('el popstate del propio cierre no cierra otra ventana', () => {
    vi.spyOn(history, 'back').mockImplementation(() => {})
    const cerrarMenu = vi.fn()
    const menu = useCerrarConAtras(cerrarMenu)
    const modal = useCerrarConAtras(vi.fn())
    menu.alAbrir()
    modal.alAbrir()
    modal.alCerrar()
    // Llega el popstate del history.back() que ha hecho el cierre.
    window.dispatchEvent(new PopStateEvent('popstate'))
    expect(cerrarMenu).not.toHaveBeenCalled()
    vi.restoreAllMocks()
  })

  it('al cerrar porque se navega no se toca el historial', () => {
    const back = vi.spyOn(history, 'back').mockImplementation(() => {})
    const capa = useCerrarConAtras(vi.fn())
    capa.alAbrir()
    capa.alNavegar()
    expect(back).not.toHaveBeenCalled()
    back.mockRestore()
  })
})

describe('useCapa', () => {
  let useCapa
  let router
  const Vista = { render: () => null }

  beforeEach(async () => {
    vi.spyOn(history, 'back').mockImplementation(() => {})
    document.body.innerHTML = '<div id="app"></div>'
    document.body.style.overflow = ''
    ;({ useCapa } = await fresco('../src/composables/useCapa'))
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: Vista },
        { path: '/top', component: Vista }
      ]
    })
  })
  afterEach(() => vi.restoreAllMocks())

  const montar = (opciones) => {
    let capa
    const cerrar = vi.fn((args) => capa.alCerrar(args))
    const w = mount(
      defineComponent({ setup: () => { capa = useCapa(cerrar, opciones); return () => null } }),
      { global: { plugins: [router] } }
    )
    return { w, capa: () => capa, cerrar }
  }
  const app = () => document.getElementById('app')

  it('abierta, la app queda inerte y sin scroll; al cerrar, todo vuelve', async () => {
    await router.push('/')
    const { capa } = montar()
    capa().alAbrir()
    expect(app().hasAttribute('inert')).toBe(true)
    expect(document.body.style.overflow).toBe('hidden')
    capa().alCerrar()
    expect(app().hasAttribute('inert')).toBe(false)
    expect(document.body.style.overflow).toBe('')
  })

  it('sin bloquear el scroll, si se pide', async () => {
    await router.push('/')
    const { capa } = montar({ bloquearScroll: false })
    capa().alAbrir()
    expect(document.body.style.overflow).toBe('')
  })

  it('si se desmonta abierta, no deja la app bloqueada', async () => {
    await router.push('/')
    const { w, capa } = montar()
    capa().alAbrir()
    w.unmount()
    expect(app().hasAttribute('inert')).toBe(false)
    expect(document.body.style.overflow).toBe('')
  })

  it('se cierra al cambiar de página, sin tocar el historial', async () => {
    await router.push('/')
    const { capa, cerrar } = montar()
    capa().alAbrir()
    await router.push('/top')
    await nextTick()
    expect(cerrar).toHaveBeenCalledWith({ restoreFocus: false, navegando: true })
    expect(history.back).not.toHaveBeenCalled()
    expect(app().hasAttribute('inert')).toBe(false)
  })

  it('la primera navegación, la del arranque, no la cierra', async () => {
    // Montada antes de que el router llegue a la primera ruta, como en la app
    // (la de arranque tiene path «/», así que se entra por otra: /pokemon/6).
    const { capa, cerrar } = montar()
    capa().alAbrir()
    await router.push('/top')
    await nextTick()
    expect(cerrar).not.toHaveBeenCalled()
    expect(app().hasAttribute('inert')).toBe(true)
  })
})
