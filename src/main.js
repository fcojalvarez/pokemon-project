import { createApp, watch } from 'vue';
import { createPinia } from 'pinia';

import App from './App.vue';
import router from './router';

import i18n from './plugins/i18n';

import './assets/main.css';
import './index.css';

import { usePwaUpdate } from './composables/usePwaUpdate';

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(i18n);

// El idioma del documento sigue al de la app: con lang="en" los lectores de
// pantalla leían el español con pronunciación inglesa.
document.documentElement.lang = i18n.global.locale;

// Título de pestaña por página. La ficha lo pone ella misma cuando sabe qué
// Pokémon es, así que aquí se deja en paz.
const ponerTitulo = (to) => {
    if (to.name === 'PokemonPage') return;
    const key = to.meta?.titleKey;
    document.title = key ? `${i18n.global.t(key)} · PogoDex` : 'PogoDex';
};
router.afterEach(ponerTitulo);

// Al cambiar de idioma desde el menú, el título de la pestaña también.
watch(() => i18n.global.locale, () => ponerTitulo(router.currentRoute.value));

app.mount('#app');

/**
 * Tras un despliegue, una pestaña abierta con la versión anterior pide trozos
 * de código (las páginas que se cargan aparte) que ya no existen, y la
 * navegación falla. En vez de dejarla rota, se recarga para traer la versión
 * nueva. Una sola vez por pestaña y cada cinco minutos como mucho: si el fallo
 * fuera otro, no hay que entrar en bucle.
 */
window.addEventListener('vite:preloadError', (evento) => {
  try {
    const antes = Number(sessionStorage.getItem('recarga-version') ?? 0);
    if (Date.now() - antes < 5 * 60 * 1000) return;
    sessionStorage.setItem('recarga-version', String(Date.now()));
  } catch {
    /* sin sessionStorage se recarga igual */
  }
  evento.preventDefault();
  window.location.reload();
});

// Se engancha después de montar: no bloquea el primer pintado.
usePwaUpdate();
