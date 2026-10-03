<script setup>
/**
 * El icono de un bonus de evento en su círculo: el del juego cuando la app lo
 * tiene (caramelo, cebo, huevo…), uno blanco pintado del color del texto
 * (incursión, investigación, compañero) o un signo (✦ shiny, ✧ polvo, PX).
 * Lo usan el bloque de bonus del detalle y las tarjetas de la lista, donde
 * hace de viñeta.
 */
import { computed } from 'vue'
import IconoMascara from '../base/IconoMascara.vue'
import { iconoDeBonus } from '../../utils/iconoBonus'
import iconoCaramelo from '../../assets/icons/candy_icon.png'
import iconoCarameloXl from '../../assets/icons/candy_xl.png'
import iconoCebo from '../../assets/icons/lure_icon.png'
import iconoHuevo from '../../assets/icons/egg.png'
import iconoIntercambio from '../../assets/icons/ic_trade_ball.png'
import iconoIncursion from '../../assets/icons/raid.png'
import iconoMision from '../../assets/icons/research.png'
import iconoCompanero from '../../assets/icons/walkWithYourBuddy.png'

const props = defineProps({
  /** El texto del bonus: de él sale el icono. */
  texto: { type: String, required: true },
  /** Clases del círculo (tamaño y fondo). */
  circulo: { type: String, default: 'w-7 h-7 bg-gray-150 dark:bg-gray-700' },
  /** Clases de la imagen. */
  imagen: { type: String, default: 'w-5 h-5' },
  /** Para el destacado: el signo en ámbar y más grande. */
  destacado: Boolean
})

const IMAGENES = {
  candy: iconoCaramelo,
  candyXl: iconoCarameloXl,
  lure: iconoCebo,
  egg: iconoHuevo,
  trade: iconoIntercambio
}
const MASCARAS = { raid: iconoIncursion, research: iconoMision, buddy: iconoCompanero }
const SIGNOS = { shiny: '✦', stardust: '✧', xp: 'PX' }

const icono = computed(() => iconoDeBonus(props.texto))
</script>

<template>
  <span
    class="shrink-0 rounded-full flex items-center justify-center"
    :class="circulo"
    aria-hidden="true"
  >
    <img
      v-if="IMAGENES[icono]"
      :src="IMAGENES[icono]"
      alt=""
      class="object-contain"
      :class="imagen"
    />
    <icono-mascara
      v-else-if="MASCARAS[icono]"
      :src="MASCARAS[icono]"
      class="text-gray-700 dark:text-gray-200"
      :class="imagen"
    />
    <span
      v-else
      class="font-bold"
      :class="
        destacado || icono === 'shiny'
          ? 'text-amber-600 dark:text-amber-400'
          : 'text-gray-700 dark:text-gray-200'
      "
      >{{ SIGNOS[icono] ?? '•' }}</span
    >
  </span>
</template>
