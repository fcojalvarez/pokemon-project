import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueI18n from '@intlify/vite-plugin-vue-i18n';
import { resolve, dirname } from 'node:path';

export default defineConfig({
  plugins: [
    vue(),
    vueI18n({
      include: resolve(dirname(fileURLToPath(import.meta.url)), '../locales'),
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    rollupOptions: {
      external: 'NonExistingPath'
    }
  },
})