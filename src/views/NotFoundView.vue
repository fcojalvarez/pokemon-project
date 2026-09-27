<script setup>
/**
 * Página de «esto no existe», para cualquier ruta desconocida.
 *
 * Antes se mandaba a la Pokédex sin decir nada: con un enlace mal copiado o
 * una ruta vieja, parecía que la app había hecho otra cosa de la pedida. Aquí
 * se dice qué ha pasado, se enseña la dirección y se ofrecen las secciones.
 */
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useTranslate } from '../composables/useTranslate'

const route = useRoute()
const { t } = useTranslate()
// También sale dentro de la ficha (/pokemon/99999), que no pasa por el título del router.
onMounted(() => { document.title = `${t('notFound.title')} · PogoDex` })
const ruta = computed(() => route.fullPath)

const SECCIONES = [
  { to: '/', key: 'nav.pokedex' },
  { to: '/top', key: 'nav.top' },
  { to: '/events', key: 'nav.events' },
  { to: '/live', key: 'nav.raids' }
]
</script>

<template>
  <section class="max-w-md mx-auto my-10 p-6 rounded-xl bg-white dark:bg-gray-900 shadow-md text-center text-gray-800 dark:text-gray-100">
    <p class="text-4xl font-bold text-gray-400 dark:text-gray-500" aria-hidden="true">404</p>
    <h1 class="mt-2 text-xl font-bold">{{ $t('notFound.title') }}</h1>
    <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
      {{ $t('notFound.text') }}
    </p>
    <p class="mt-2 text-mini text-gray-600 dark:text-gray-300 break-all">
      <code>{{ ruta }}</code>
    </p>
    <nav :aria-label="$t('notFound.sections')" class="mt-5 grid grid-cols-2 gap-2">
      <router-link
        v-for="seccion in SECCIONES"
        :key="seccion.to"
        :to="seccion.to"
        class="px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-sm hover:bg-gray-150 hover:dark:bg-gray-800"
      >
        {{ $t(seccion.key) }}
      </router-link>
    </nav>
  </section>
</template>
