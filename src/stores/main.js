import { ref, computed } from 'vue';
import { defineStore } from 'pinia';

export const useMainStore = defineStore('main', () => {
    const darkMode = ref(false);

    const isDarkMode = computed(() => darkMode.value );

    const setDarkMode = (isDarkMode) => {
        darkMode.value = isDarkMode;
        localStorage.setItem('isDarkMode', isDarkMode);
    }
  
    return {
        isDarkMode,
        setDarkMode
    }
  })