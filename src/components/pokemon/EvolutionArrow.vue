<script setup>
/**
 * La flecha entre dos pasos de la cadena, con el coste encima y el resto de
 * requisitos debajo. En vertical (móvil, hacia un grupo o una mega que va
 * debajo) los requisitos van a la izquierda.
 *
 * El trazo es la flecha curva de siempre de la cadena evolutiva. En vertical
 * va girada 90º, hacia abajo. En horizontal va volteada de arriba abajo, con
 * la curva por debajo, sin dejar de apuntar a la derecha.
 */
import EvolutionRequirements from './EvolutionRequirements.vue'

defineProps({
  req: { type: Object, default: () => ({}) },
  type: { type: String, default: null },
  vertical: Boolean
})
</script>

<template>
  <div v-if="vertical" class="flex flex-row-reverse items-center gap-2 py-1">
    <svg
      class="shrink-0 rotate-90 stroke-gray-700 dark:stroke-white"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke-width="1"
      stroke-linecap="round"
      aria-hidden="true"
    >
      <path d="M21 7v6h-6" />
      <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2l3 3" />
    </svg>
    <div class="flex flex-col items-end gap-0.5">
      <evolution-requirements :req="req" :type="type" parte="coste" />
      <evolution-requirements :req="req" :type="type" parte="resto" />
    </div>
  </div>

  <div v-else class="flex flex-col items-center gap-0.5 px-1.5 md:px-3 lg:px-5">
    <evolution-requirements :req="req" :type="type" parte="coste" />
    <svg
      class="shrink-0 -scale-y-100 stroke-gray-700 dark:stroke-white"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke-width="1"
      stroke-linecap="round"
      aria-hidden="true"
    >
      <path d="M21 7v6h-6" />
      <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2l3 3" />
    </svg>
    <evolution-requirements :req="req" :type="type" parte="resto" class="max-w-[7.5rem]" />
  </div>
</template>
