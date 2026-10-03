<script setup>
/**
 * Los bonus de un evento en el detalle, en su propio bloque como «Pokémon
 * del evento»: antes eran una lista de texto dentro de la cabecera.
 *
 * El más jugoso (el de shiny, si lo hay) va destacado en una tarjeta dorada;
 * el resto, en lista con el icono de su tipo (caramelo, cebo, huevo…), que
 * hace de viñeta. El texto va entero: resumirlo bien no se puede sin saber
 * cada tipo de bonus de antemano.
 */
import { computed } from 'vue'
import IconoMascara from '../base/IconoMascara.vue'
import { iconoDeBonus, indiceEstrella } from '../../utils/iconoBonus'
import iconoCaramelo from '../../assets/icons/candy_icon.png'
import iconoCarameloXl from '../../assets/icons/candy_xl.png'
import iconoCebo from '../../assets/icons/lure_icon.png'
import iconoHuevo from '../../assets/icons/egg.png'
import iconoIntercambio from '../../assets/icons/ic_trade_ball.png'
import iconoIncursion from '../../assets/icons/raid.png'
import iconoMision from '../../assets/icons/research.png'
import iconoCompanero from '../../assets/icons/walkWithYourBuddy.png'

const props = defineProps({
  /** Los textos de los bonus, ya traducidos. */
  bonus: { type: Array, default: () => [] }
})

/** Iconos a color, tal cual. */
const IMAGENES = {
  candy: iconoCaramelo,
  candyXl: iconoCarameloXl,
  lure: iconoCebo,
  egg: iconoHuevo,
  trade: iconoIntercambio
}
/** Iconos blancos del juego: se pintan del color del texto, como en «PC 100 %». */
const MASCARAS = { raid: iconoIncursion, research: iconoMision, buddy: iconoCompanero }
/** Sin icono propio en la app: un signo. */
const SIGNOS = { shiny: '✦', stardust: '✧', xp: 'PX' }

const conIcono = (texto) => ({ texto, icono: iconoDeBonus(texto) })

const estrella = computed(() => {
  const i = indiceEstrella(props.bonus)
  return i >= 0 ? conIcono(props.bonus[i]) : null
})
const resto = computed(() => {
  const i = indiceEstrella(props.bonus)
  return props.bonus.filter((_, j) => j !== i).map(conIcono)
})
</script>

<template>
  <section v-if="estrella" class="mb-4 pt-3 border-t border-gray-300 dark:border-gray-700">
    <h3 class="text-mini uppercase tracking-wider text-gray-600 dark:text-gray-300">
      {{ $t('events.eventBonus') }}
    </h3>

    <div
      class="mt-2 flex items-center gap-3 p-2.5 rounded-xl border border-amber-500/60 bg-amber-500/10 text-sm font-semibold text-gray-900 dark:text-gray-50"
    >
      <span
        class="shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-gray-900"
        aria-hidden="true"
      >
        <img
          v-if="IMAGENES[estrella.icono]"
          :src="IMAGENES[estrella.icono]"
          alt=""
          class="w-7 h-7 object-contain"
        />
        <icono-mascara
          v-else-if="MASCARAS[estrella.icono]"
          :src="MASCARAS[estrella.icono]"
          class="w-6 h-6 text-gray-700 dark:text-gray-200"
        />
        <span v-else class="text-lg font-bold text-amber-600 dark:text-amber-400">{{
          SIGNOS[estrella.icono] ?? '•'
        }}</span>
      </span>
      <span>{{ estrella.texto }}</span>
    </div>

    <ul v-if="resto.length" class="mt-2 flex flex-col gap-1.5">
      <li v-for="uno in resto" :key="uno.texto" class="flex items-center gap-2.5 text-sm">
        <span
          class="shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-gray-150 dark:bg-gray-700"
          aria-hidden="true"
        >
          <img
            v-if="IMAGENES[uno.icono]"
            :src="IMAGENES[uno.icono]"
            alt=""
            class="w-5 h-5 object-contain"
          />
          <icono-mascara
            v-else-if="MASCARAS[uno.icono]"
            :src="MASCARAS[uno.icono]"
            class="w-4 h-4 text-gray-700 dark:text-gray-200"
          />
          <span v-else class="text-xs font-bold text-gray-700 dark:text-gray-200">{{
            SIGNOS[uno.icono] ?? '•'
          }}</span>
        </span>
        <span class="min-w-0">{{ uno.texto }}</span>
      </li>
    </ul>
  </section>
</template>
