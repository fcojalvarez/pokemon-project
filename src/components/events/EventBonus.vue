<script setup>
/**
 * Los bonus de un evento en el detalle, en su propio bloque como «Pokémon
 * del evento»: antes eran una lista de texto dentro de la cabecera.
 *
 * El más jugoso (el de shiny, si lo hay) va destacado en una tarjeta dorada;
 * el resto, en lista con el icono de su tipo (BonusIcono), que hace de
 * viñeta. El texto va entero: resumirlo bien no se puede sin saber cada tipo
 * de bonus de antemano.
 */
import { computed } from 'vue'
import BonusIcono from './BonusIcono.vue'
import { indiceEstrella } from '../../utils/iconoBonus'

const props = defineProps({
  /** Los textos de los bonus, ya traducidos. */
  bonus: { type: Array, default: () => [] }
})

const estrella = computed(() => props.bonus[indiceEstrella(props.bonus)] ?? null)
const resto = computed(() => {
  const i = indiceEstrella(props.bonus)
  return props.bonus.filter((_, j) => j !== i)
})
</script>

<template>
  <section v-if="estrella" class="mb-4 pt-3 border-t border-gray-300 dark:border-gray-700">
    <h3 class="text-mini uppercase tracking-wider text-gray-600 dark:text-gray-300">
      {{ $t('events.eventBonus') }}
    </h3>

    <div
      class="mt-2 flex items-center gap-3 p-2.5 rounded-xl border border-amber-500/60 bg-amber-500/10 text-sm font-semibold text-gray-900 dark:text-gray-50"
    >
      <bonus-icono
        :texto="estrella"
        destacado
        circulo="w-10 h-10 bg-white dark:bg-gray-900 text-lg"
        imagen="w-7 h-7"
      />
      <span>{{ estrella }}</span>
    </div>

    <ul v-if="resto.length" class="mt-2 flex flex-col gap-1.5">
      <li v-for="uno in resto" :key="uno" class="flex items-center gap-2.5 text-sm">
        <bonus-icono :texto="uno" class="text-xs" />
        <span class="min-w-0">{{ uno }}</span>
      </li>
    </ul>
  </section>
</template>
