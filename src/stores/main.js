import { ref, computed } from 'vue';
import { defineStore } from 'pinia';

export const useMainStore = defineStore('main', () => {
    const darkMode = ref(false);

    const isDarkMode = computed(() => darkMode.value );

    const setDarkMode = (isDarkMode, { persist = true } = {}) => {
        darkMode.value = isDarkMode;
        if (persist) localStorage.setItem('isDarkMode', isDarkMode);
    }
  
    return {
        isDarkMode,
        setDarkMode
    }
  })