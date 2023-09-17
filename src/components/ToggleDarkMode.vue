<script setup>
import { computed, onBeforeMount } from 'vue';
import { useMainStore } from '../stores/main';
import { storeToRefs } from 'pinia';
import { darkIcon, lightIcon } from '../utils/Settings';
import { BaseIcon } from '.';

const mainStore = useMainStore();
const { isDarkMode } = storeToRefs(mainStore);
const { setDarkMode } = mainStore;

const icon = computed({
    get() {
        return isDarkMode.value? lightIcon : darkIcon;
    }
})

const toggleDarkMode = () => {
    setDarkMode(!isDarkMode.value);
    document.documentElement.classList.toggle('dark');
}

onBeforeMount(() => {
    const isDarkModeLS = JSON.parse(localStorage.getItem('isDarkMode'));
    if( isDarkModeLS === null ) {
        setDarkMode(false);
    } else {
        setDarkMode(isDarkModeLS);
    }
    document.documentElement.classList.toggle('dark', isDarkMode.value);
})
</script>

<template>
    <section class="relative transition-colors h-100 max-w-[50px] md:max-w-[160px] flex justify-center items-center cursor-pointer border border-gray-400 rounded-xl shadow-md bg-white dark:bg-gray-900 w-40 md:w-auto hover:bg-gray-150 hover:dark:bg-gray-800" @click="toggleDarkMode">
        <base-icon
            :stroke-width="1.5"
            height="24"
            width="24"
            icon-class="m-auto md:mx-2 absolute md:left-1"
            class-path="stroke-gray-600 dark:stroke-gray-100"
            :d="icon"
        />
        <span class="transition-colors hidden md:block text-sm text-gray-800 dark:text-gray-200 w-72 ml-8">{{ isDarkMode? $t('lightMode') : $t('darkMode') }}</span>
    </section>
</template>
