<script setup>
/**
 * Sprite con esqueleto: mientras la imagen no ha llegado se ve un hueco gris
 * pulsando del tamaño del sprite. Cuando llega, el Pokémon aparece con un
 * destello blanco que se apaga, como al salir de la Pokéball. Así la rejilla
 * no salta ni se queda en blanco al cargar en tandas con el scroll.
 *
 * El destello es solo un filtro animado sobre la propia imagen: ni elementos
 * de más ni JavaScript por fotograma, para que cien tarjetas a la vez no se
 * noten. Si la imagen ya estaba en la caché (al volver a una página) se
 * enseña directamente, y con movimiento reducido tampoco hay destello.
 *
 * Las clases que se le pasen van al contenedor (tamaño, posición); las de la
 * imagen en sí (sombra, escala de grises…) van en `img-class`.
 */
import { nextTick, onMounted, ref, watch } from 'vue'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  src: { type: String, default: null },
  alt: { type: String, default: '' },
  imgClass: { type: [String, Array, Object], default: '' },
  lazy: { type: Boolean, default: true }
})

const img = ref(null)
// 'cargando' | 'brillando' | 'lista' | 'error'
const estado = ref('cargando')

const alCargar = () => {
  if (estado.value !== 'cargando') return
  const sinMovimiento = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  estado.value = sinMovimiento ? 'lista' : 'brillando'
}

// Si ya estaba en la caché, el evento load puede haber pasado antes de que
// Vue enganchara el listener: se mira a mano, y entonces sin destello.
const comprobarCache = () => {
  const el = img.value
  if (el?.complete) estado.value = el.naturalWidth ? 'lista' : 'error'
}

watch(() => props.src, () => {
  estado.value = 'cargando'
  nextTick(comprobarCache)
})
onMounted(comprobarCache)
</script>

<template>
  <span :class="['relative block', $attrs.class]" :style="$attrs.style">
    <span
      v-if="estado === 'cargando'"
      aria-hidden="true"
      class="esqueleto absolute inset-[12%] rounded-full"
    ></span>
    <img
      v-if="src"
      ref="img"
      :src="src"
      :alt="alt"
      :loading="lazy ? 'lazy' : undefined"
      decoding="async"
      :class="[
        'w-full h-full object-contain',
        imgClass,
        { 'sprite-brilla': estado === 'brillando' }
      ]"
      :style="estado === 'cargando' ? { opacity: 0 } : null"
      @load="alCargar"
      @animationend="estado = 'lista'"
      @error="estado = 'error'"
    >
  </span>
</template>

<style scoped>
/*
 * Sale blanco y con halo, y en medio segundo se queda con sus colores. El
 * final no fija opacidad ni filtro: así acaba en los de la propia imagen (los
 * que aún no han salido van en gris y al 40 %) y no parpadea al terminar.
 */
.sprite-brilla {
  animation: brilla 0.55s ease-out backwards;
}
@keyframes brilla {
  0% {
    opacity: 0;
    transform: scale(0.85);
    filter: brightness(4) drop-shadow(0 0 10px #fff);
  }
  45% {
    filter: brightness(1.8) drop-shadow(0 0 6px #fff);
  }
  100% {
    transform: scale(1);
  }
}
</style>
