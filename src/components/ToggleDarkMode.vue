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
    <!-- El texto solo cabe en escritorio; en móvil, solo el icono. Nombre fijo y
         el estado en aria-pressed. -->
    <button
        type="button"
        :aria-pressed="isDarkMode"
        :aria-label="$t('a11y.darkModeToggle')"
        class="relative transition-colors max-w-[50px] md:max-w-[160px] flex justify-center items-center cursor-pointer border border-gray-400 rounded-xl shadow-md bg-white dark:bg-gray-900 w-40 md:w-auto hover:bg-gray-150 hover:dark:bg-gray-800"
        @click="toggleDarkMode"
    >
        <base-icon
            :stroke-width="1.5"
            height="24"
            width="24"
            icon-class="m-auto md:mx-2 absolute md:left-1"
            class-path="stroke-gray-600 dark:stroke-gray-100"
            :d="icon"
        />
        <span aria-hidden="true" class="transition-colors hidden md:block text-sm text-gray-800 dark:text-gray-200 w-72 ml-8">{{ isDarkMode? $t('lightMode') : $t('darkMode') }}</span>
    </button>
</template>
