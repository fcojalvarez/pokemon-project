<script setup>
/**
 * Las megas (y primigenios) que más le suben el daño en una incursión, de más
 * a menos: con una mega de otro jugador activa, los ataques de sus tipos pegan
 * ×1,3 y el resto ×1,1. Así se ve con quién conviene ir.
 *
 * Solo salen las que le dan más que cualquier mega; si ninguna, no sale nada.
 */
import { computed } from 'vue'
import BaseSprite from '../../base/BaseSprite.vue'
import { spriteUrl } from '../../../utils/sprites'
import { fichaDeFila } from '../../../utils/rankingRows'
import { useTranslate } from '../../../composables/useTranslate'
import { useGameDataStore } from '../../../stores/gameData'

const props = defineProps({
  /** La forma que se ve (la `entrada` de useFichaDatos). */
  entrada: { type: Object, required: true }
})

const { localName } = useTranslate()
const gameData = useGameDataStore()

const filas = computed(() => gameData.potenciadores(props.entrada))
const porcentaje = (ganancia) => `+${Math.round(ganancia * 100)} %`
</script>

<template>
  <div v-if="filas.length">
    <h3 class="rotulo mb-1.5">{{ $t('pokemon.potencian.titulo') }}</h3>
    <ul class="flex flex-col gap-1.5">
      <li v-for="fila in filas" :key="fila.entry.id">
        <component
          :is="fichaDeFila(fila.entry, gameData.fichaBase) ? 'router-link' : 'div'"
          :to="fichaDeFila(fila.entry, gameData.fichaBase) ?? undefined"
          class="flex items-center gap-2 p-1.5 pr-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-150 hover:dark:bg-gray-700 text-xs"
        >
          <base-sprite
            :src="spriteUrl(fila.entry.spriteId)"
            class="w-7 h-7 shrink-0"
            img-class="drop-shadow-contorno dark:drop-shadow-none"
          />
          <span class="flex-1 min-w-0 truncate font-semibold">{{ localName(fila.entry) }}</span>
          <span
            class="shrink-0 px-2 rounded-full bg-gray-200 dark:bg-gray-700 font-bold tabular-nums"
            >{{ porcentaje(fila.ganancia) }}</span
          >
        </component>
      </li>
    </ul>
    <p class="mt-1.5 text-mini text-gray-600 dark:text-gray-300">
      {{ $t('pokemon.potencian.nota') }}
    </p>
  </div>
</template>
