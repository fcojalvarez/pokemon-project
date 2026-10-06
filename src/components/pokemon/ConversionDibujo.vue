<script setup>
/**
 * Una fusión o un cambio de forma en dibujos: «Necrozma + Lunala → Alas del
 * Alba» o «Zacian → Espada Suprema», cada uno enlazado a su ficha. Lo usan
 * «Dónde conseguirlo», Costes y la línea evolutiva.
 *
 * Sin `conOrigen` no sale el primero: en la línea evolutiva ya está arriba y
 * basta con «+ Lunala → Alas del Alba».
 */
import { computed } from 'vue'
import BaseSprite from '../base/BaseSprite.vue'
import { useGameDataStore } from '../../stores/gameData'
import { useTranslate } from '../../composables/useTranslate'
import { spriteUrl } from '../../utils/sprites'
import { fichaDeFila } from '../../utils/rankingRows'

const props = defineProps({
  /** Una de CONVERSIONES (utils/cambiosForma). */
  conversion: { type: Object, required: true },
  conOrigen: { type: Boolean, default: true },
  /** 'md' con el nombre debajo de cada uno; 'sm', solo el del resultado. */
  tam: { type: String, default: 'md' }
})

const gameData = useGameDataStore()
const { localName } = useTranslate()

const pieza = (id) => {
  const entry = gameData.byId.get(id)
  if (!entry) return null
  return {
    id,
    entry,
    to: fichaDeFila(entry, gameData.fichaBase),
    // Del resultado, solo la forma: «Alas del Alba» y no «Necrozma (Alas del Alba)».
    nombre: localName(entry)
  }
}

const piezas = computed(() => ({
  desde: props.conOrigen ? pieza(props.conversion.desde) : null,
  con: props.conversion.con ? pieza(props.conversion.con) : null,
  a: pieza(props.conversion.a)
}))

/** «Necrozma (Alas del Alba)» → «Alas del Alba»: el resultado, sin la especie. */
const soloForma = (nombre) => /\(([^)]+)\)\s*$/.exec(nombre)?.[1] ?? nombre

const sprite = computed(() => (props.tam === 'md' ? 'w-12 h-12' : 'w-9 h-9'))
</script>

<template>
  <div class="flex items-center justify-center gap-1.5">
    <template v-if="piezas.desde">
      <router-link
        :to="piezas.desde.to"
        class="flex flex-col items-center min-w-0 text-gray-800 dark:text-gray-200 hover:underline"
      >
        <base-sprite :src="spriteUrl(piezas.desde.entry.spriteId)" :class="sprite" />
        <span v-if="tam === 'md'" class="text-mini font-semibold leading-tight text-center">{{
          piezas.desde.nombre
        }}</span>
      </router-link>
    </template>
    <template v-if="piezas.con">
      <span aria-hidden="true" class="text-gray-500 dark:text-gray-400">+</span>
      <router-link
        :to="piezas.con.to"
        class="flex flex-col items-center min-w-0 text-gray-800 dark:text-gray-200 hover:underline"
      >
        <base-sprite :src="spriteUrl(piezas.con.entry.spriteId)" :class="sprite" />
        <span v-if="tam === 'md'" class="text-mini font-semibold leading-tight text-center">{{
          piezas.con.nombre
        }}</span>
      </router-link>
    </template>
    <span aria-hidden="true" class="text-gray-500 dark:text-gray-400">→</span>
    <router-link
      v-if="piezas.a"
      :to="piezas.a.to"
      class="flex flex-col items-center min-w-0 text-gray-800 dark:text-gray-200 hover:underline"
    >
      <base-sprite :src="spriteUrl(piezas.a.entry.spriteId)" :class="sprite" />
      <span class="text-mini font-semibold leading-tight text-center">{{
        soloForma(piezas.a.nombre)
      }}</span>
    </router-link>
  </div>
</template>
