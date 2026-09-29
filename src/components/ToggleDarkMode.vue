<script setup>
import { computed } from 'vue';
import { useMainStore } from '../stores/main';
import { storeToRefs } from 'pinia';
import { darkIcon, lightIcon } from '../utils/Settings';
import BaseIcon from './base/BaseIcon.vue';

// El tema de arranque lo pone main.js (useMainStore().iniciarTema()).
const mainStore = useMainStore();
const { isDarkMode } = storeToRefs(mainStore);

const icon = computed(() => (isDarkMode.value ? lightIcon : darkIcon));

const toggleDarkMode = () => mainStore.setDarkMode(!isDarkMode.value);
</script>

<template>
    <!-- Solo el icono en gris y sin caja, como los ajustes del móvil (ver
         SettingsMenu). Nombre fijo y el estado en aria-pressed. -->
    <button
        type="button"
        :aria-pressed="isDarkMode"
        :aria-label="$t('a11y.darkModeToggle')"
        class="flex justify-center items-center w-11 rounded-xl text-gray-500 dark:text-gray-300 hover:bg-gray-200 hover:dark:bg-gray-800 transition-colors"
        @click="toggleDarkMode"
    >
        <base-icon
            :stroke-width="1.5"
            height="24"
            width="24"
            color="currentColor"
            :d="icon"
        />
    </button>
</template>
