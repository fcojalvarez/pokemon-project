<script setup>
import { useId } from 'vue'

/**
 * Bandera de un idioma, para el selector del menú.
 *
 * En SVG y no con emoji: Windows no pinta las banderas emoji, enseña las dos
 * letras del país. Es decorativa: el nombre del idioma va siempre al lado o
 * en el aria-label del botón. El tamaño lo pone quien la usa; con `slice`,
 * cada bandera se recorta a esa caja sin deformarse.
 */
defineProps({
  locale: { type: String, required: true }
})

// La inglesa necesita un clipPath, y los id de un SVG en línea son globales
// al documento: con dos iguales, la segunda usaría el de la primera y, al
// desmontarse esa, se quedaría sin recorte.
const id = `bandera-${useId()}`
</script>

<template>
  <svg
    v-if="locale === 'es'"
    aria-hidden="true"
    focusable="false"
    viewBox="0 0 60 40"
    preserveAspectRatio="xMidYMid slice"
    class="shrink-0 rounded-[3px] ring-1 ring-black/15 dark:ring-white/25"
  >
    <rect width="60" height="40" fill="#AA151B" />
    <rect y="10" width="60" height="20" fill="#F1BF00" />
  </svg>

  <svg
    v-else-if="locale === 'en'"
    aria-hidden="true"
    focusable="false"
    viewBox="0 0 60 30"
    preserveAspectRatio="xMidYMid slice"
    class="shrink-0 rounded-[3px] ring-1 ring-black/15 dark:ring-white/25"
  >
    <defs>
      <clipPath :id="id">
        <path d="M30 15h30v15zv15H0zH0V0zV0h30z" />
      </clipPath>
    </defs>
    <rect width="60" height="30" fill="#012169" />
    <path d="M0 0l60 30M60 0L0 30" stroke="#fff" stroke-width="6" />
    <path d="M0 0l60 30M60 0L0 30" :clip-path="`url(#${id})`" stroke="#C8102E" stroke-width="4" />
    <path d="M30 0v30M0 15h60" stroke="#fff" stroke-width="10" />
    <path d="M30 0v30M0 15h60" stroke="#C8102E" stroke-width="6" />
  </svg>
</template>
