<script setup>
/**
 * Un icono del juego (PNG blanco) pintado del color del texto.
 *
 * Como en BaseCandyIcon: el PNG va de máscara sobre un fondo `currentColor`,
 * así que se tiñe con las clases de color de siempre y cambia con el modo
 * oscuro. El tamaño, con las clases (w-4 h-4…).
 */
import { computed } from 'vue'

const props = defineProps({
  src: { type: String, required: true }
})

const estilo = computed(() => ({
  backgroundColor: 'currentColor',
  maskImage: `url(${props.src})`,
  WebkitMaskImage: `url(${props.src})`,
  maskSize: 'contain',
  WebkitMaskSize: 'contain',
  maskRepeat: 'no-repeat',
  WebkitMaskRepeat: 'no-repeat',
  maskPosition: 'center',
  WebkitMaskPosition: 'center'
}))
</script>

<template>
  <span class="inline-block shrink-0" :style="estilo" aria-hidden="true"></span>
</template>
