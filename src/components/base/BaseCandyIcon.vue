<script setup>
import { computed } from 'vue'
import { typesSVG } from '../../utils/Settings'
import candyIcon from '../../assets/icons/candy_icon.png'

/**
 * El caramelo del juego, teñido con el color del tipo.
 *
 * Se mantiene el PNG original y se usa como máscara CSS: el icono es blanco,
 * así que con un filtro no se puede recolorear, pero enmascarando un fondo de
 * color se conserva la forma exacta y se puede pintar de cualquier tono.
 */
const props = defineProps({
  type: { type: String, default: null }
})

const color = computed(() => typesSVG[props.type]?.color ?? '#9099a1')

const maskStyle = computed(() => ({
  backgroundColor: color.value,
  maskImage: `url(${candyIcon})`,
  WebkitMaskImage: `url(${candyIcon})`,
  maskSize: 'contain',
  WebkitMaskSize: 'contain',
  maskRepeat: 'no-repeat',
  WebkitMaskRepeat: 'no-repeat',
  maskPosition: 'center',
  WebkitMaskPosition: 'center'
}))
</script>

<template>
  <span class="inline-block shrink-0" :style="maskStyle" role="img" aria-hidden="true"></span>
</template>
