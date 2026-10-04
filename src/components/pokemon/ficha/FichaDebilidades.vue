<script setup>
/**
 * Debilidades y resistencias, por intensidad: un rótulo por nivel con su
 * multiplicador. La doble debilidad va rellena del color del tipo; la normal,
 * tintada, como los tipos elegidos del filtro; las resistencias, en gris.
 * Antes todas eran la misma pastilla y había que leer cada número para ver
 * que Roca ×2.56 pesaba más que Agua ×1.60.
 */
import { computed } from 'vue'
import FichaSeccion from '../FichaSeccion.vue'
import TypeIcons from '../../base/TypeIcons.vue'
import { useTranslate } from '../../../composables/useTranslate'
import { typesSVG } from '../../../utils/Settings'

const props = defineProps({
  /** { weak, resist } de gameData.matchups. */
  matchups: { type: Object, required: true }
})

const { t } = useTranslate()

/** Plegada: las tres peores. */
const resumen = computed(() =>
  props.matchups.weak
    .slice(0, 3)
    .map((entry) => `${t(`types.${entry.type}`)} ×${entry.mult.toFixed(2)}`)
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

/** Texto oscuro sobre los colores claros (Eléctrico, Roca) y blanco sobre los oscuros. */
const textoSobre = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const luz = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return luz > 0.45 ? '#111827' : '#ffffff'
}

const estiloRelleno = (tipo) => {
  const color = typesSVG[tipo]?.color ?? '#6b7280'
  return { backgroundColor: color, borderColor: color, color: textoSobre(color) }
}
</script>

<template>
  <ficha-seccion id="debilidades" :title="$t('pokemon.weaknesses')" :summary="resumen">
    <div v-for="nivel in niveles" :key="nivel.mult" class="mt-2 first:mt-0">
      <h3 class="subtitulo">
        {{ $t(nivel.doble ? 'pokemon.weakDouble' : 'pokemon.weakSingle') }}
        <span class="tabular-nums">×{{ nivel.mult.toFixed(2) }}</span>
      </h3>
      <div class="flex flex-wrap gap-2 mt-1.5">
        <span
          v-for="entry in nivel.lista"
          :key="entry.type"
          class="flex items-center gap-1 px-2 py-1 text-mini rounded-xl border"
          :class="
            nivel.doble ? 'font-bold' : 'tinte-tipo font-semibold text-gray-900 dark:text-white'
          "
          :style="
            nivel.doble ? estiloRelleno(entry.type) : { '--tipo': typesSVG[entry.type]?.color }
          "
        >
          <!-- Rellena del color del tipo, su icono no se vería: solo el nombre. -->
          <span v-if="nivel.doble" class="uppercase tracking-wide">{{
            $t(`types.${entry.type}`)
          }}</span>
          <type-icons v-else :types="[entry.type]" size="13" with-label />
        </span>
      </div>
    </div>

    <template v-if="matchups.resist.length">
      <h3 class="mt-4 subtitulo">
        {{ $t('pokemon.resistances') }}
      </h3>
      <div class="flex flex-wrap gap-2 mt-1.5">
        <span
          v-for="entry in matchups.resist"
          :key="entry.type"
          class="flex items-center gap-1 px-2 py-1 text-mini rounded-xl border border-gray-300 dark:border-gray-600"
        >
          <type-icons :types="[entry.type]" size="13" with-label />
          <span class="tabular-nums text-gray-600 dark:text-gray-300"
            >×{{ entry.mult.toFixed(2) }}</span
          >
        </span>
      </div>
    </template>
  </ficha-seccion>
</template>
