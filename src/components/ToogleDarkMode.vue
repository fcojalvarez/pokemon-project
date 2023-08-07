<script setup>
import { ref, computed } from 'vue';

const isDarkMode = ref(true);
const srcIcon = computed({
    get() {
        const icon = isDarkMode.value? 'moon' : 'lightbulb';  
        const iconUrl = new URL(`../assets/icons/${icon}-icon.svg`, import.meta.url).href
        return iconUrl
    }
})

const toggleDarkMode = () => {
    isDarkMode.value = !isDarkMode.value;
    document.documentElement.classList.toggle('dark');
}
</script>

<template>
    <section class="max-w-[50px] md:max-w-[150px] flex justify-center items-center cursor-pointer border border-gray-400 rounded-xl shadow-md" @click="toggleDarkMode">
        <img id="darkmode-toggle" :src="srcIcon"  class="w-100 h-6 w-6 mb-auto mt-2 mx-2" :alt="$t('light')">
        <span class="hidden md:block text-sm text-gray-800 dark:text-gray-200">{{ isDarkMode? 'Dark' : 'Light' }} mode</span>
    </section>
</template>