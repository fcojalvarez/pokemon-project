import { ref, computed } from 'vue';
import { defineStore } from 'pinia';


export const useMainStore = defineStore('main', () => {
    // STATE
    const darkMode = ref(false);

    // GETTERS
    const isDarkMode = computed(() => darkMode.value );

    //ACTIONS


    // MUTATIONS
    const setDarkMode = (isDarkMode) => {
        darkMode.value = isDarkMode;
        localStorage.setItem('isDarkMode', isDarkMode);
    }
  
    return {
        isDarkMode,
        setDarkMode
    }
  })