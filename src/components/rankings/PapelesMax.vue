<script setup>
/**
 * Las tres letras de una fila del Top Max, una encima de otra: atacante (su
 * puesto en la lista), tanque y sanador (de gameData.papelesDeMax). Cada una
 * con su icono: espadas, escudo (Maxibarrera) y cruz (Maxivigor). Así se ve
 * de un vistazo para qué sirve cada uno sin cambiar de lista.
 */
import BaseNivel from '../base/BaseNivel.vue'
import IconoPapel from '../base/IconoPapel.vue'

defineProps({
  /** Puesto como atacante: el de la fila. */
  rank: { type: Number, required: true },
  /** { tanque, sanador } */
  papeles: { type: Object, required: true }
})
</script>

<template>
  <span class="flex flex-col items-end gap-1">
    <span
      v-for="[papel, puesto] in [
        ['atacante', rank],
        ['tanque', papeles.tanque],
        ['sanador', papeles.sanador]
      ]"
      :key="papel"
      class="flex items-center gap-1"
    >
      <icono-papel :papel="papel" class="w-3 h-3 text-gray-500 dark:text-gray-400" />
      <span class="sr-only">{{ $t(`max.roles.${papel}`) }}:</span>
      <base-nivel :rank="puesto" pequena />
    </span>
  </span>
</template>
