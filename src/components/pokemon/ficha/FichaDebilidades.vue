<script setup>
/**
 * Debilidades y resistencias, por intensidad: un rótulo por nivel con su
 * multiplicador y debajo los tipos, con su icono y su nombre. Sin caja: antes
 * eran pastillas con borde y parecían los filtros de tipo de la Pokédex, que
 * sí se pulsan. Las resistencias, en columnas con su multiplicador.
 */
import { computed } from 'vue'
import FichaSeccion from '../FichaSeccion.vue'
import TypeIcons from '../../base/TypeIcons.vue'
import { useTranslate, formatDecimal } from '../../../composables/useTranslate'

const props = defineProps({
  /** { weak, resist } de gameData.matchups. */
  matchups: { type: Object, required: true }
})

const { t } = useTranslate()

/** Plegada: las tres peores. */
const resumen = computed(() =>
  props.matchups.weak
    .slice(0, 3)
    .map((entry) => `${t(`types.${entry.type}`)} ×${formatDecimal(entry.mult, 2)}`)
    .join(' · ')
)

/**
 * Las debilidades, un grupo por multiplicador (×2.56 doble, ×1.60 simple):
 * ya vienen de mayor a menor.
 */
const niveles = computed(() => {
  const porMult = new Map()
  for (const entry of props.matchups.weak) {
    const clave = entry.mult.toFixed(2)
    if (!porMult.has(clave)) porMult.set(clave, { mult: entry.mult, lista: [] })
    porMult.get(clave).lista.push(entry)
  }
  return [...porMult.values()].map((nivel) => ({ ...nivel, doble: nivel.mult > 2 }))
})
</script>

<template>
  <ficha-seccion id="debilidades" :title="$t('pokemon.weaknesses')" :summary="resumen">
    <div v-for="nivel in niveles" :key="nivel.mult" class="mt-2 first:mt-0">
      <h3 class="subtitulo">
        {{ $t(nivel.doble ? 'pokemon.weakDouble' : 'pokemon.weakSingle') }}
        <span class="tabular-nums">×{{ formatDecimal(nivel.mult, 2) }}</span>
      </h3>
      <!-- Icono y nombre, sin caja: informan, y la caja con borde es de lo que se pulsa. -->
      <ul class="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
        <li v-for="entry in nivel.lista" :key="entry.type" class="text-xs font-semibold">
          <type-icons :types="[entry.type]" size="14" with-label />
        </li>
      </ul>
    </div>

    <template v-if="matchups.resist.length">
      <h3 class="mt-4 subtitulo">
        {{ $t('pokemon.resistances') }}
      </h3>
      <!-- En columnas, para leerlas de un vistazo. -->
      <ul class="grid grid-cols-2 min-[420px]:grid-cols-3 gap-x-4 gap-y-1 mt-1.5">
        <li v-for="entry in matchups.resist" :key="entry.type" class="flex items-center gap-1.5">
          <type-icons :types="[entry.type]" size="14" with-label />
          <span class="tabular-nums text-mini text-gray-600 dark:text-gray-300"
            >×{{ formatDecimal(entry.mult, 2) }}</span
          >
        </li>
      </ul>
    </template>
  </ficha-seccion>
</template>
