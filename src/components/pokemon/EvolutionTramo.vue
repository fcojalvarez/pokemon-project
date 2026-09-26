<script setup>
/**
 * Un tramo de la cadena: los Pokémon que van en línea, uno detrás de otro, y
 * al final, si de alguno salen varias formas, el grupo con todas ellas.
 *
 * La regla: cuando de un Pokémon salen varias (las megas X e Y de Charizard,
 * las ocho evoluciones de Eevee), van juntas en un contenedor con su título.
 * Al contenedor llega una sola flecha, con lo que piden todas por igual, y
 * dentro no hay flechas entre ellas: así no puede parecer que una sale de la
 * otra. Lo que pide cada una va debajo de ella.
 *
 * Cada celda del grupo es a su vez un tramo (Wurmple: Silcoon → Beautifly), de
 * ahí que el componente se use a sí mismo.
 *
 * En la fila principal, en móvil, lo que va al final (el grupo, o una mega
 * suelta) baja a la línea siguiente con una flecha vertical que sale del
 * último Pokémon: en horizontal no cabe. Desde lg todo va en una línea.
 */
import { computed, inject } from 'vue'
import { useTranslate } from '../../composables/useTranslate'
import { repartirRequisitos } from '../../utils/evolutionTree'
import EvolutionMon from './EvolutionMon.vue'
import EvolutionArrow from './EvolutionArrow.vue'
import EvolutionRequirements from './EvolutionRequirements.vue'

defineOptions({ name: 'EvolutionTramo' })

const props = defineProps({
  nodo: { type: Object, required: true },
  principal: Boolean,
  /** Dentro de la celda de un grupo: sin número, que no cabe. */
  enGrupo: Boolean
})

const { t } = useTranslate()
const cadena = inject('cadenaEvolutiva')

const tipoDe = (nodo) => nodo.mon.types?.[0] ?? null

const tramo = computed(() => {
  const pasos = [{ tipo: 'mon', nodo: props.nodo }]
  let final = null
  let actual = props.nodo
  while (actual.ramas.length === 1) {
    const rama = actual.ramas[0]
    pasos.push({ tipo: 'flecha', req: rama.req, caramelo: tipoDe(actual) })
    pasos.push({ tipo: 'mon', nodo: rama.destino })
    actual = rama.destino
  }
  if (actual.ramas.length > 1) {
    const { comunes, propios } = repartirRequisitos(actual.ramas)
    const celdas = actual.ramas.map((rama, i) => ({ destino: rama.destino, propios: propios[i] }))
    const todasMega = actual.ramas.every((rama) => rama.destino.mega)
    const unPaso = celdas.every((celda) => celda.destino.ramas.length === 0)
    const n = celdas.length
    final = {
      tipo: 'grupo',
      req: comunes,
      caramelo: tipoDe(actual),
      celdas,
      etiqueta: todasMega ? t('evolutions.megaEvolutions') : t('evolutions.count', { n }),
      pocos: n <= 2 && unPaso,
      // Columnas: las celdas de un solo Pokémon en rejilla; las que son un
      // tramo entero (Silcoon → Beautifly), una debajo de otra.
      colsMovil: unPaso ? (n <= 3 ? n : 4) : 1,
      colsEscritorio: unPaso ? Math.min(n, 4) : 1
    }
  } else if (props.principal && pasos.length >= 3 && pasos[pasos.length - 1].nodo.mega) {
    // Una mega suelta al final (Venusaur, Gyarados…) también baja en móvil.
    const mon = pasos.pop()
    const flecha = pasos.pop()
    final = { tipo: 'mega', req: flecha.req, caramelo: flecha.caramelo, nodo: mon.nodo }
  }

  // Cada flecha va pegada al Pokémon al que lleva: si la fila no cabe y salta
  // de línea, no se queda una flecha huérfana al final.
  const unidades = []
  for (let i = 0; i < pasos.length; i++) {
    if (pasos[i].tipo === 'flecha') {
      unidades.push({ flecha: pasos[i], nodo: pasos[i + 1].nodo })
      i++
    } else {
      unidades.push({ flecha: null, nodo: pasos[i].nodo })
    }
  }
  return { unidades, final }
})

const monProps = (nodo, extra = {}) => ({
  mon: nodo.mon,
  to: nodo.mega ? nodo.mega.to : `/pokemon/${nodo.mon.pokemon_id}`,
  active: nodo.mega ? nodo.mega.id === cadena.formId.value : !cadena.formId.value && nodo.mon.pokemon_id === cadena.activeId.value,
  shiny: cadena.shiny.value,
  sinNumero: Boolean(nodo.mega) || props.enGrupo || Boolean(extra.enGrupo),
  badge: nodo.mega?.superMega ? t('pokemon.superMega') : null,
  ...extra
})
</script>

<template>
  <div
    class="flex items-center justify-center"
    :class="principal ? 'flex-col lg:flex-row' : 'flex-row'"
  >
    <!-- inline-flex: la flecha vertical se alinea con el borde de esta fila -->
    <div class="inline-flex flex-col max-w-full">
      <div class="flex flex-wrap items-center justify-center">
        <div v-for="(unidad, i) in tramo.unidades" :key="i" class="flex items-center">
          <evolution-arrow v-if="unidad.flecha" :req="unidad.flecha.req" :type="unidad.flecha.caramelo" />
          <evolution-mon v-bind="monProps(unidad.nodo)" />
        </div>
      </div>

      <!-- Móvil: lo del final baja, con la flecha saliendo del último Pokémon -->
      <evolution-arrow
        v-if="principal && tramo.final"
        vertical
        class="lg:hidden"
        :class="tramo.unidades.length > 1 ? 'self-end mr-[22px]' : 'self-center'"
        :req="tramo.final.req"
        :type="tramo.final.caramelo"
      />
    </div>

    <template v-if="tramo.final">
      <evolution-arrow
        :class="principal ? 'hidden lg:flex' : ''"
        :req="tramo.final.req"
        :type="tramo.final.caramelo"
      />

      <evolution-mon v-if="tramo.final.tipo === 'mega'" v-bind="monProps(tramo.final.nodo)" />

      <div
        v-else
        role="group"
        :aria-label="tramo.final.etiqueta"
        class="relative mt-2.5 lg:mt-0 rounded-2xl border-[1.5px] border-dashed border-gray-400 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/40 px-2 lg:px-3 pt-5 pb-3"
        :class="principal ? 'w-full lg:w-auto' : ''"
      >
        <!-- Encima del borde, con el fondo de la tarjeta para cortarlo -->
        <span
          class="absolute -top-2.5 left-3 px-2 bg-white dark:bg-gray-900 text-mini font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 whitespace-nowrap"
          aria-hidden="true"
        >{{ tramo.final.etiqueta }}</span>

        <div
          class="grid gap-x-1 gap-y-3 grid-cols-[repeat(var(--cols-m),minmax(0,1fr))] lg:grid-cols-[repeat(var(--cols-d),minmax(0,1fr))]"
          :style="{ '--cols-m': tramo.final.colsMovil, '--cols-d': tramo.final.colsEscritorio }"
        >
          <div
            v-for="(celda, i) in tramo.final.celdas"
            :key="i"
            class="flex flex-col items-center gap-1 min-w-0"
          >
            <evolution-mon
              v-if="celda.destino.ramas.length === 0"
              v-bind="monProps(celda.destino, { enGrupo: true, pocos: tramo.final.pocos })"
            />
            <evolution-tramo v-else :nodo="celda.destino" en-grupo />
            <evolution-requirements :req="celda.propios" :type="tramo.final.caramelo" columna />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
