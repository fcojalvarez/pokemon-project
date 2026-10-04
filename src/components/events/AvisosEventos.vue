<script setup>
/**
 * Avisos en el móvil (F14): el botón de Eventos y el diálogo para elegir de
 * qué avisar. Una hora antes de que empiece, a la hora de cada uno.
 *
 * No sale si el navegador no puede recibir avisos o si aún no están
 * configurados (sin clave VAPID): un botón que no lleva a nada es peor que
 * ninguno. En iPhone solo funcionan con la app instalada en la pantalla de
 * inicio; ahí Safari ni siquiera ofrece PushManager, así que tampoco sale.
 */
import { onMounted, ref } from 'vue'
import BaseModal from '../base/BaseModal.vue'
import BasePillButton from '../base/BasePillButton.vue'
import { useAvisos } from '../../composables/useAvisos'
import { CATEGORIAS_AVISO } from '../../utils/avisos'

const { soportado, estado, categorias, ocupado, error, comprobar, activar, desactivar } =
  useAvisos()

const abierto = ref(false)
const marcadas = ref([])
const hecho = ref('')

const abrir = () => {
  marcadas.value = [...categorias.value]
  hecho.value = ''
  abierto.value = true
}

const alternar = (categoria) => {
  marcadas.value = marcadas.value.includes(categoria)
    ? marcadas.value.filter((c) => c !== categoria)
    : [...marcadas.value, categoria]
}

const guardar = async () => {
  if (!marcadas.value.length) return
  if (await activar(marcadas.value)) hecho.value = 'saved'
}

const quitar = async () => {
  if (await desactivar()) hecho.value = 'removed'
}

onMounted(comprobar)
</script>

<template>
  <template v-if="soportado">
    <button type="button" class="boton" :aria-pressed="estado === 'on'" @click="abrir">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        class="w-4 h-4"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
      {{ estado === 'on' ? $t('events.alerts.on') : $t('events.alerts.button') }}
    </button>

    <base-modal :open="abierto" :title="$t('events.alerts.title')" @close="abierto = false">
      <div class="px-4 pt-3 pb-4 text-sm">
        <p class="text-xs text-gray-600 dark:text-gray-300">{{ $t('events.alerts.intro') }}</p>

        <p
          v-if="estado === 'denied'"
          class="mt-3 text-xs text-amber-700 dark:text-amber-400"
          role="alert"
        >
          {{ $t('events.alerts.denied') }}
        </p>

        <template v-else>
          <fieldset class="mt-3">
            <legend class="text-mini text-gray-600 dark:text-gray-300">
              {{ $t('events.alerts.which') }}
            </legend>
            <div class="mt-1.5 flex flex-wrap gap-2">
              <base-pill-button
                v-for="categoria in Object.keys(CATEGORIAS_AVISO)"
                :key="categoria"
                casilla
                :active="marcadas.includes(categoria)"
                @click="alternar(categoria)"
              >
                {{ $t(`events.alerts.categories.${categoria}`) }}
              </base-pill-button>
            </div>
          </fieldset>

          <p v-if="error" class="mt-3 text-xs text-red-700 dark:text-red-400" role="alert">
            {{ $t('events.alerts.error') }}
          </p>
          <p
            v-else-if="hecho"
            class="mt-3 text-xs text-green-700 dark:text-green-400"
            role="status"
          >
            {{ $t(`events.alerts.${hecho}`) }}
          </p>

          <div class="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              class="px-3 py-1.5 text-xs font-semibold rounded-xl bg-gray-800 text-white dark:bg-gray-100 dark:text-gray-900 disabled:opacity-50"
              :disabled="ocupado || !marcadas.length"
              @click="guardar"
            >
              {{ estado === 'on' ? $t('events.alerts.save') : $t('events.alerts.enable') }}
            </button>
            <button
              v-if="estado === 'on'"
              type="button"
              class="boton"
              :disabled="ocupado"
              @click="quitar"
            >
              {{ $t('events.alerts.disable') }}
            </button>
          </div>
        </template>
      </div>
    </base-modal>
  </template>
</template>
