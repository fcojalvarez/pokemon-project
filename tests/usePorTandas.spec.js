import { describe, expect, it } from 'vitest'
import { effectScope, nextTick, ref } from 'vue'
import { usePorTandas } from '../src/composables/usePorTandas'

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

describe('usePorTandas', () => {
  it('empieza por la primera tanda y acaba con la lista entera', async () => {
    const lista = ref(Array.from({ length: 50 }, (_, i) => i))
    const scope = effectScope()
    const filas = scope.run(() => usePorTandas(lista, { primera: 10, paso: 15 }))
    expect(filas.value).toHaveLength(10)
    await esperar(300)
    expect(filas.value).toHaveLength(50)
    scope.stop()
  })

  it('con otra lista vuelve a empezar, y una corta sale entera de primeras', async () => {
    const lista = ref(Array.from({ length: 40 }, (_, i) => i))
    const scope = effectScope()
    const filas = scope.run(() => usePorTandas(lista, { primera: 10 }))
    await esperar(300)
    lista.value = [1, 2, 3]
    await nextTick()
    expect(filas.value).toEqual([1, 2, 3])
    scope.stop()
  })
})
