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
    <section class="transition-colors h-100 max-w-[50px] md:max-w-[150px] flex justify-center items-center cursor-pointer border border-gray-400 rounded-xl shadow-md bg-white dark:bg-gray-900" @click="toggleDarkMode">
        <base-icon
            :stroke-width="1.5"
            width="20"
            height="20"
            icon-class="p-0 m-0 md:mb-auto md:mt-2 md:mx-2"
            class-path="stroke-gray-600 dark:stroke-gray-100"
            :d="icon"
        />
        <span class="transition-colors hidden md:block text-sm text-gray-800 dark:text-gray-200">{{ isDarkMode? 'Light' : 'Dark' }} mode</span>
    </section>
</template>
