<script setup>
/** Debilidades y resistencias, con su multiplicador. */
import { computed } from 'vue'
import FichaSeccion from '../FichaSeccion.vue'
import TypeIcons from '../../base/TypeIcons.vue'
import { useTranslate } from '../../../composables/useTranslate'

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

const grupos = computed(() => [
  { clave: 'weak', lista: props.matchups.weak },
  { clave: 'resist', lista: props.matchups.resist, titulo: 'pokemon.resistances' }
])
</script>

<template>
  <ficha-seccion id="debilidades" :title="$t('pokemon.weaknesses')" :summary="resumen">
    <template v-for="grupo in grupos" :key="grupo.clave">
      <h3 v-if="grupo.titulo" class="text-sm font-bold mt-4">{{ $t(grupo.titulo) }}</h3>
      <div class="flex flex-wrap gap-2 mt-2">
        <span
          v-for="entry in grupo.lista"
          :key="entry.type"
          class="flex items-center gap-1 px-2 py-1 text-mini rounded-xl border border-gray-300 dark:border-gray-600"
        >
          <type-icons :types="[entry.type]" size="13" with-label />
          <span class="text-gray-600 dark:text-gray-300">×{{ entry.mult.toFixed(2) }}</span>
        </span>
      </div>
    </template>
  </ficha-seccion>
</template>
