<script setup>
import { computed } from 'vue'
import BaseIcon from './BaseIcon.vue'
import { typesSVG } from '../../utils/Settings'

const props = defineProps({
  types: { type: Array, default: () => [] },
  size: { type: String, default: '14' },
  withLabel: Boolean
})

/** Los iconos vienen en minúscula; se ignora cualquier tipo desconocido. */
const known = computed(() => props.types.filter((type) => typesSVG[type]))
</script>

<template>
  <span class="flex items-center gap-2">
    <span v-for="type in known" :key="type" class="flex items-center gap-1">
      <base-icon
        view-box="0 0 512 512"
        :width="size"
        :height="size"
        icon-class="drop-shadow-svg"
        :fill-path="typesSVG[type].color"
        :d="typesSVG[type].icon"
        :role="withLabel ? undefined : 'img'"
        :aria-label="withLabel ? undefined : $t(`types.${type}`)"
      />
      <span v-if="withLabel" class="text-mini uppercase tracking-wide">{{ $t(`types.${type}`) }}</span>
    </span>
  </span>
</template>
