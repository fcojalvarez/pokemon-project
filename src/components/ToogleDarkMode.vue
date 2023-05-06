<script setup>
import { ref, computed } from 'vue';

const isDarkMode = ref(true);
const srcIcon = computed({
    get() {
        const icon = isDarkMode.value? 'lightbulb' : 'moon';  
        const iconUrl = new URL(`../assets/icons/${icon}-icon.svg`, import.meta.url).href
        return iconUrl
    }
})
</script>

<template>
    <img :src="srcIcon" @click="isDarkMode = !isDarkMode" class="w-100 h-6 w-6 mb-auto mt-3 mx-2" :alt="$t('light')">
</template>

<style scoped>
</style>
