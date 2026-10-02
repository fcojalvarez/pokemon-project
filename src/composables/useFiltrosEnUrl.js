import { watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

/**
 * Guarda los filtros de una página en la URL y los lee de ella al entrar.
 *
 * Así, al ir a una ficha y volver atrás, la página sale con la misma
 * selección; y un enlace copiado o una recarga también la conservan.
 *
 * Se escribe con `replace`: cambiar un filtro no añade entradas al historial,
 * y «atrás» sigue llevando a la página anterior, no al filtro anterior.
 *
 * Los valores por defecto no se escriben, para que la URL sin filtros siga
 * siendo la de siempre (/top, no /top?mode=pve&kind=all…).
 *
 * @param {Record<string, {
 *   valor: import('vue').Ref,        ref (o computed escribible) con el filtro
 *   defecto: any,                    valor que no se escribe en la URL
 *   leer?: (texto: string) => any,   de la URL al valor; undefined si no vale
 *   escribir?: (valor: any) => string
 * }>} campos  clave de la query → campo
 * @param {{ quitar?: string[] }} opciones  claves de un solo uso que se borran
 *   al escribir (el ?dex= con el que se llega a «Ahora en juego»).
 * @returns {{ habiaFiltros: boolean }}  si la URL traía alguno al entrar
 */
export function useFiltrosEnUrl(campos, { quitar = [] } = {}) {
  const route = useRoute()
  const router = useRouter()
  const texto = (campo, valor) => (campo.escribir ? campo.escribir(valor) : String(valor))

  let habiaFiltros = false
  for (const [clave, campo] of Object.entries(campos)) {
    const bruto = route.query[clave]
    if (bruto === undefined || bruto === null) continue
    const valor = campo.leer ? campo.leer(String(bruto)) : String(bruto)
    if (valor === undefined) continue
    campo.valor.value = valor
    habiaFiltros = true
  }

  watch(
    () => Object.values(campos).map((campo) => texto(campo, campo.valor.value)),
    () => {
      const query = { ...route.query }
      for (const clave of quitar) delete query[clave]
      for (const [clave, campo] of Object.entries(campos)) {
        const actual = texto(campo, campo.valor.value)
        if (actual === texto(campo, campo.defecto) || actual === '') delete query[clave]
        else query[clave] = actual
      }
      router.replace({ query })
    }
  )

  return { habiaFiltros }
}

/** Lee un valor solo si está entre los permitidos. */
export const entre = (permitidos) => (texto) => permitidos.includes(texto) ? texto : undefined

/** Listas en la URL como «a,b,c», filtradas a los valores permitidos. */
export const lista = (permitidos = null) => ({
  leer: (texto) => texto.split(',').filter((x) => x && (!permitidos || permitidos.includes(x))),
  escribir: (valores) => [...valores].sort().join(',')
})
