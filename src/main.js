import { createApp } from 'vue';
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

app.mount('#app');

// Se engancha después de montar: no bloquea el primer pintado.
usePwaUpdate();
