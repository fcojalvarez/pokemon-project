<script setup>
/** Efectos de los ataques en PvP: subir o bajar ataque y defensa. */
import { computed } from 'vue'
import FichaSeccion from '../FichaSeccion.vue'
import MoveTag from '../MoveTag.vue'
import { useTranslate } from '../../../composables/useTranslate'

const props = defineProps({
  /** moveEffects de useFichaDatos. */
  efectos: { type: Array, required: true }
})

const { localName } = useTranslate()

/** Plegada: el primero y cuántos más hay. */
const resumen = computed(() => {
  const [primero, ...resto] = props.efectos
  if (!primero) return ''
  return `${localName(primero)}: ${primero.text}${resto.length ? ` · +${resto.length}` : ''}`
})
</script>

<template>
  <ficha-seccion id="efectos" :title="$t('moves.effectsTitle')" :summary="resumen">
    <ul class="mt-2 flex flex-col gap-1.5">
      <li
        v-for="move in efectos"
        :key="move.id"
        class="flex flex-wrap items-center gap-x-3 gap-y-1 p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs"
      >
        <move-tag
          :name="localName(move)"
          :type="move.type"
          size="11"
          :elite="move.elite"
          :legacy="move.legacy"
          :mega="move.mega"
        />
        <span class="text-gray-600 dark:text-gray-300">{{ move.text }}</span>
        <span v-if="move.chance" class="ml-auto text-mini text-gray-600 dark:text-gray-300">
          {{ move.chance }}
        </span>
      </li>
    </ul>
  </ficha-seccion>
</template>
