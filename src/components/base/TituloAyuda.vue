<script setup>
/**
 * Un subtítulo con su «?»: la explicación del bloque («STAB: mismo tipo…»,
 * «Total de los tres niveles…») sale debajo solo si se pide. Antes iba siempre
 * a la vista, en gris, y con varias por sección la ficha se saturaba.
 */
import { computed, ref, useId } from 'vue'
import BotonAyuda from './BotonAyuda.vue'

const props = defineProps({
  /** Uno o varios párrafos. */
  texto: { type: [String, Array], required: true },
  /** Texto del título, para el lector de pantalla del «?». */
  tema: { type: String, required: true },
  /** Etiqueta del título. */
  tag: { type: String, default: 'h3' }
})

const abierta = ref(false)
const id = `ayuda-${useId()}`
const parrafos = computed(() => [props.texto].flat().filter(Boolean))
</script>

<template>
  <div>
    <div class="flex items-center gap-2">
      <component :is="tag" class="subtitulo"><slot /></component>
      <boton-ayuda v-model:abierta="abierta" :controla="id" :tema="tema" />
    </div>
    <div
      v-show="abierta"
      :id="id"
      class="mt-1 flex flex-col gap-1 text-mini text-gray-600 dark:text-gray-300"
    >
      <p v-for="(p, i) in parrafos" :key="i">{{ p }}</p>
    </div>
  </div>
</template>
