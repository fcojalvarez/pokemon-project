<script setup>
import { ref, computed } from 'vue';
const isDarkModeLS = localStorage.getItem('isDarkMode');
const isDarkMode = ref(JSON.parse(isDarkModeLS) || false);

const srcIcon = computed({
    get() {
        const icon = isDarkMode.value? 'lightbulb' : 'moon';  
        const iconUrl = new URL(`../assets/icons/${icon}-icon.svg`, import.meta.url).href
        return iconUrl
    }
})

const toggleDarkMode = () => {
    isDarkMode.value = !isDarkMode.value;
    localStorage.setItem('isDarkMode', isDarkMode.value);
    document.documentElement.classList.toggle('dark');
}
</script>

<template>
    <section class="max-w-[50px] md:max-w-[150px] flex justify-center items-center cursor-pointer border border-gray-400 rounded-xl shadow-md bg-white dark:bg-gray-900" @click="toggleDarkMode">
        <img id="darkmode-toggle" :src="srcIcon"  class="w-100 h-6 w-6 mb-auto mt-2 mx-2">
        <span class="hidden md:block text-sm text-gray-800 dark:text-gray-200">{{ isDarkMode? 'Light' : 'Dark' }} mode</span>
    </section>
</template>