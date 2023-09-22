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
      external: [
        '../../assets/icons/candy_icon.png',
'../../assets/icons/lure_icon.png',
'../../assets/icons/SunStone.png',
'../../assets/icons/SinnohStone.png',
'../../assets/icons/KingsRock.png',
'../../assets/icons/UnovaStone.png',
'../../assets/icons/DragonScale.png',
'../../assets/icons/Upgrade.png',
'../../assets/icons/MetalCoat.png',
'../../assets/icons/walkWithYourBuddy.png',
'../../assets/icons/ic_moon.png',
'../../assets/icons/ic_sun.png',
'../../assets/icons/ic_female.png',
'../../assets/icons/ic_male.png',
'../../assets/icons/ic_trade_ball.png',
        '/img/aaaSMPTE-color-bars.png',
      ],
    }
  },
})