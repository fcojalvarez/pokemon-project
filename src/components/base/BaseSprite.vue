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
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { miniatura } from '../../utils/sprites'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  src: { type: String, default: null },
  alt: { type: String, default: '' },
  imgClass: { type: [String, Array, Object], default: '' },
  lazy: { type: Boolean, default: true },
  /**
   * Cómo aparece al cargar. 'salida' crece desde cero y pasa de blanco a sus
   * colores, como si saliera: es la de la Pokédex. En el resto de la app,
   * 'suave': un fundido corto que apenas se nota.
   */
  entrada: { type: String, default: 'suave' },
  /**
   * Pokémon oscuro: lleva detrás el halo morado. No hay sprite oscuro propio
   * (PokeAPI y LeekDuck usan el normal), así que el halo es lo único que lo
   * distingue en una lista.
   */
  oscuro: Boolean
})

/**
 * Los sprites de PokeAPI, en su miniatura WebP propia: pesan diez veces menos.
 * Si una no está (un Pokémon recién añadido que aún no tiene miniatura), se
 * cae al PNG original en vez de dejar la imagen rota.
 */
const sinMiniatura = ref(false)
const fuente = computed(() => (sinMiniatura.value ? null : miniatura(props.src)) ?? props.src)

/**
 * Último intento antes de darla por rota: la misma imagen sin `crossorigin`.
 * Si la respuesta llega sin la cabecera CORS (una copia vieja en la caché del
 * móvil, un nodo del CDN que la quita), el navegador la rechaza aunque exista;
 * sin `crossorigin` eso no puede pasar (ver useImagenTolerante).
 */
const sinCors = ref(false)

const alFallar = () => {
  if (!sinMiniatura.value && miniatura(props.src)) {
    sinMiniatura.value = true
    estado.value = 'cargando'
    return
  }
  if (!sinCors.value) {
    sinCors.value = true
    estado.value = 'cargando'
    return
  }
  estado.value = 'error'
}

const img = ref(null)
// 'cargando' | 'brillando' | 'lista' | 'error'
const estado = ref('cargando')

const alCargar = () => {
  if (estado.value !== 'cargando') return
  const sinMovimiento = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  estado.value = sinMovimiento ? 'lista' : 'brillando'
}

// Si ya estaba en la caché, el evento load puede haber pasado antes de que
// Vue enganchara el listener: se mira a mano. Y sale igual, con su
// animación: que venga de la caché no es motivo para que aparezca de golpe.
const comprobarCache = () => {
  const el = img.value
  if (!el?.complete) return
  if (el.naturalWidth) alCargar()
  else estado.value = 'error'
}

watch(
  () => props.src,
  () => {
    sinMiniatura.value = false
    sinCors.value = false
    estado.value = 'cargando'
    nextTick(comprobarCache)
  }
)
onMounted(comprobarCache)
</script>

<template>
  <span :class="['relative block', $attrs.class]" :style="$attrs.style">
    <span
      v-if="estado === 'cargando'"
      aria-hidden="true"
      class="esqueleto absolute inset-[12%] rounded-full"
    ></span>
    <span
      v-if="oscuro"
      aria-hidden="true"
      class="aura-oscuro absolute -inset-[18%] rounded-full"
    ></span>
    <img
      v-if="src"
      ref="img"
      :src="fuente"
      :crossorigin="sinCors ? undefined : 'anonymous'"
      :alt="alt"
      :loading="lazy ? 'lazy' : undefined"
      decoding="async"
      :class="[
        'relative w-full h-full object-contain',
        imgClass,
        estado === 'brillando' ? (entrada === 'salida' ? 'sprite-brilla' : 'sprite-suave') : null
      ]"
      :style="
        estado === 'cargando'
          ? { opacity: 0 }
          : estado === 'error'
          ? { visibility: 'hidden' }
          : null
      "
      @load="alCargar"
      @animationend="estado = 'lista'"
      @error="alFallar"
    />
  </span>
</template>

<style scoped>
/*
 * El halo del oscuro: morado que se apaga hacia fuera, como el aura del juego,
 * con el 50 % de opacidad como mucho, en el centro, y desvaneciéndose poco a
 * poco hasta el borde, para que se note el degradado. Sobresale del sprite
 * (-inset-[18%]): del mismo tamaño, el Pokémon lo tapaba casi entero. En modo
 * claro, el morado 700; en modo oscuro, el 600: con el 800
 * casi no se veía y con el 500 llamaba más la atención que el Pokémon.
 */
.aura-oscuro {
  background: radial-gradient(
    circle,
    rgba(126, 34, 206, 0.5) 0%,
    rgba(126, 34, 206, 0.32) 32%,
    rgba(126, 34, 206, 0.12) 55%,
    rgba(126, 34, 206, 0) 72%
  );
}
:global(.dark .aura-oscuro) {
  background: radial-gradient(
    circle,
    rgba(147, 51, 234, 0.5) 0%,
    rgba(147, 51, 234, 0.32) 32%,
    rgba(147, 51, 234, 0.12) 55%,
    rgba(147, 51, 234, 0) 72%
  );
}

/*
 * Sale de la nada: crece desde cero hasta su tamaño a la vez que pasa de
 * blanco y con halo a sus colores, como si estuviera saliendo. El
 * final no fija opacidad ni filtro: así acaba en los de la propia imagen (los
 * que aún no han salido van en gris y al 40 %) y no parpadea al terminar.
 */
.sprite-brilla {
  animation: brilla 0.55s ease-out backwards;
}
/* Fuera de la Pokédex: un fundido corto, sin crecer ni brillar. */
.sprite-suave {
  animation: suave 0.2s ease-out backwards;
}
@keyframes suave {
  from {
    opacity: 0;
  }
}
@keyframes brilla {
  0% {
    opacity: 0;
    transform: scale(0);
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
