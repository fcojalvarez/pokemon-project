<script setup>
/**
 * La insignia «STAB» (Same Type Attack Bonus): el ataque es del mismo tipo que
 * el Pokémon y hace un 20 % más. Lleva la explicación en el title; donde sale,
 * se explica también en una línea debajo de la lista.
 */
</script>

<template>
  <span
    class="shrink-0 px-1 rounded text-[10px] font-semibold leading-tight bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
    :title="$t('max.stabTitle')"
    >STAB</span
  >
</template>
