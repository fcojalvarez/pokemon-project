<script setup>
/**
 * Aviso de versión nueva: «Actualizar» la pone ya (recarga la página).
 * Cerrarlo con la ✕, con Escape o pulsando fuera lo calla 24 horas; sin botón
 * de «Más tarde», que hacía lo mismo que la ✕. La lógica está en usePwaUpdate.
 */
import BaseModal from '../base/BaseModal.vue'
import { actualizarAhora, aplazarAviso, avisoVisible, versionNueva } from '../../composables/usePwaUpdate'
</script>

<template>
  <base-modal :open="avisoVisible" :title="$t('update.title')" size="sm:max-w-sm" @close="aplazarAviso">
    <div class="p-4 flex flex-col gap-4">
      <p class="text-sm">
        {{ versionNueva ? $t('update.textVersion', { version: versionNueva }) : $t('update.text') }}
      </p>
      <div class="flex sm:justify-end">
        <button
          type="button"
          class="w-full sm:w-auto px-4 py-2 rounded-xl border border-gray-800 dark:border-gray-100 bg-gray-800 dark:bg-gray-100 text-white dark:text-gray-900 font-semibold text-sm hover:bg-gray-700 hover:dark:bg-white"
          @click="actualizarAhora"
        >
          {{ $t('update.now') }}
        </button>
      </div>
    </div>
  </base-modal>
</template>
