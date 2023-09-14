<script setup>
import { computed, onBeforeMount } from 'vue';
import { useMainStore } from '../stores/main';
import { storeToRefs } from 'pinia';

const mainStore = useMainStore();
const { isDarkMode } = storeToRefs(mainStore);
const { setDarkMode } = mainStore;

const srcIcon = computed({
    get() {
        const icon = isDarkMode.value? 'lightbulb' : 'moon';  
        const iconUrl = new URL(`../assets/icons/${icon}-icon.svg`, import.meta.url).href
        return iconUrl
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
        <img id="darkmode-toggle" :src="srcIcon"  class="w-100 h-6 w-6 mb-auto mt-2 mx-2">
        <span class="transition-colors hidden md:block text-sm text-gray-800 dark:text-gray-200">{{ isDarkMode? 'Light' : 'Dark' }} mode</span>
    </section>
</template>
