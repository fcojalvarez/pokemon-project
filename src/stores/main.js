import { ref, computed } from 'vue';
import { defineStore } from 'pinia';

/** El fondo de la app (gray-100 y gray-700): la barra del navegador, igual. */
const FONDO = { claro: '#f3f4f6', oscuro: '#374151' };

/**
 * Pinta la barra superior del navegador en móvil del color del fondo. Se deja
 * una sola etiqueta sin `media`: si el tema elegido no es el del sistema, las
 * de index.html (una por esquema) pondrían el color que no toca.
 */
function colorDeLaBarra(oscuro) {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => meta.remove());
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = oscuro ? FONDO.oscuro : FONDO.claro;
    document.head.appendChild(meta);
}

export const useMainStore = defineStore('main', () => {
    const darkMode = ref(false);

    const isDarkMode = computed(() => darkMode.value );

    const setDarkMode = (isDarkMode, { persist = true } = {}) => {
        darkMode.value = isDarkMode;
        colorDeLaBarra(isDarkMode);
        if (persist) localStorage.setItem('isDarkMode', isDarkMode);
    }
  
    return {
        isDarkMode,
        setDarkMode
    }
  })