import { ref, computed } from 'vue';
import { defineStore, acceptHMRUpdate } from 'pinia';

/** El fondo de la app (gray-100 y gray-700): la barra del navegador, igual. */
const FONDO = { claro: '#f3f4f6', oscuro: '#374151' };
const CLAVE = 'isDarkMode';

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

/** Lo que eligió el usuario, o null si no eligió (o el guardado no se lee). */
function temaGuardado() {
    try {
        const guardado = JSON.parse(localStorage.getItem(CLAVE));
        return typeof guardado === 'boolean' ? guardado : null;
    } catch {
        return null;
    }
}

export const useMainStore = defineStore('main', () => {
    const darkMode = ref(false);

    const isDarkMode = computed(() => darkMode.value);

    /**
     * El único sitio que cambia el tema: el estado, la clase `dark` del
     * documento y la barra del navegador van siempre a la par.
     */
    const setDarkMode = (oscuro, { persist = true } = {}) => {
        darkMode.value = oscuro;
        document.documentElement.classList.toggle('dark', oscuro);
        colorDeLaBarra(oscuro);
        if (!persist) return;
        try {
            localStorage.setItem(CLAVE, oscuro);
        } catch {
            // Sin almacenamiento (modo privado): vale para esta visita.
        }
    }

    /**
     * El tema al arrancar. Sin preferencia guardada, la del sistema, y no se
     * guarda: si el móvil cambia de tema, la app lo sigue hasta que alguien
     * elija.
     */
    const iniciarTema = () => {
        const guardado = temaGuardado();
        if (guardado !== null) setDarkMode(guardado);
        else setDarkMode(window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false, { persist: false });
    }

    return {
        isDarkMode,
        setDarkMode,
        iniciarTema
    }
})

if (import.meta.hot) import.meta.hot.accept(acceptHMRUpdate(useMainStore, import.meta.hot));
