<script setup>
/**
 * Con qué mega rinde más: las megas (y primigenios) que más le suben el daño
 * en una incursión, de más a menos. Con una mega de otro jugador activa, los
 * ataques de sus tipos pegan ×1,3 y el resto ×1,1.
 *
 * Es su propia sección, y no un bloque de «Mejores ataques»: allí ocupaba
 * tanto como los conjuntos. Así se pliega o se ordena como las demás.
 * Solo salen las que le dan más que cualquier mega; si ninguna, no sale.
 */
import { computed } from 'vue'
import FichaSeccion from '../FichaSeccion.vue'
import BaseSprite from '../../base/BaseSprite.vue'
import { spriteUrl } from '../../../utils/sprites'
import { fichaDeFila } from '../../../utils/rankingRows'
import { useTranslate } from '../../../composables/useTranslate'
import { useGameDataStore } from '../../../stores/gameData'

const props = defineProps({
  /** La forma que se ve (la `entrada` de useFichaDatos). */
  entrada: { type: Object, required: true }
})

const { t, localName } = useTranslate()
const gameData = useGameDataStore()

const filas = computed(() => gameData.potenciadores(props.entrada))
const porcentaje = (ganancia) => `+${Math.round(ganancia * 100)} %`

/** Plegada: la mejor y cuántas más, con su porcentaje. */
const resumen = computed(() => {
  const [primera, ...resto] = filas.value
  if (!primera) return ''
  const nombre = localName(primera.entry)
  return resto.length
    ? t('pokemon.potencian.resumen', { nombre, n: resto.length, pct: porcentaje(primera.ganancia) })
    : `${nombre} · ${porcentaje(primera.ganancia)}`
})
</script>

<template>
  <ficha-seccion
    v-if="filas.length"
    id="potencian"
    :title="$t('pokemon.potencian.titulo')"
    :summary="resumen"
    :ayuda="$t('pokemon.potencian.nota')"
  >
    <ul class="mt-2 flex flex-col gap-1.5">
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
  </ficha-seccion>
</template>
