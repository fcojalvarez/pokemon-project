<script setup>
/**
 * Botón de volver arriba. Entra deslizándose por abajo al empezar a bajar.
 *
 * El rebote antes era `animate-bounce` de Tailwind, que se quitaba con un
 * setTimeout tocando el DOM a mano. Dos problemas: esa animación tiene sus
 * fotogramas 0 % y 100 % en translateY(-25 %), así que el botón no descansa
 * donde parece; y al retirarle la clase a mitad de vuelo pegaba un salto seco
 * hasta su sitio real.
 *
 * Aquí el rebote empieza y acaba en 0, dura lo que dura y se acabó: no hay
 * nada que quitar después, así que no hay salto.
 */
import { onMounted, onUnmounted, ref } from 'vue'
import { BaseIcon } from '.'

const isShowButton = ref(false)
const rebota = ref(false)

const scrollHandler = ({ target: { scrollingElement: { scrollTop } } }) => {
    const visible = scrollTop > 0
    // Solo rebota al aparecer, no en cada scroll.
    if (visible && !isShowButton.value) rebota.value = true
    isShowButton.value = visible
}

// El botón desaparece al llegar arriba: el foco pasa al contenido para que
// quien va con teclado no se quede en un elemento oculto.
const scrollToUp = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    document.getElementById('contenido')?.focus({ preventScroll: true })
}

onMounted(() => document.addEventListener('scroll', scrollHandler, { passive: true }))
onUnmounted(() => document.removeEventListener('scroll', scrollHandler))
</script>

<template>
    <!--
        40 px y pegado al borde: con 64 en móvil y a 40 px del borde tapaba
        media tarjeta. En móvil va alineado con el borde derecho de la barra
        de secciones (inset-x-3) y justo encima de ella (8 + 66 + 10 px); en
        escritorio, en la esquina.
    -->
    <button
        type="button"
        :aria-label="$t('a11y.backToTop')"
        :tabindex="isShowButton ? 0 : -1"
        :aria-hidden="!isShowButton"
        class="rebote-caja fixed z-30 bg-white dark:bg-gray-900 shadow-lg rounded-full h-10 w-10 flex justify-center items-center cursor-pointer right-3 sm:right-6 border border-gray-400 dark:border-gray-600 hover:bg-gray-150 hover:dark:bg-gray-800 transition-[bottom] duration-300 ease-out"
        :class="[isShowButton ? 'bottom-[calc(84px+env(safe-area-inset-bottom))] sm:bottom-6' : '-bottom-20', rebota ? 'rebota' : '']"
        @animationend="rebota = false"
        @click="scrollToUp"
    >
        <!--
            La punta iba en dos trazos sueltos que arrancaban los dos en el
            vértice, así que con los remates a ras se veía abierta. Ahora la
            cabeza es un único trazo continuo y el vértice es una unión.
        -->
        <base-icon
            width="18px" height="18px"
            :stroke-width="2.5"
            d="M12 21V4 M3.6 12.4 12 4l8.4 8.4"
            stroke-linecap="round"
            stroke-linejoin="round"
            class-path="stroke-gray-800 dark:stroke-gray-200"
        />
    </button>
</template>

<style scoped>
/* Empieza y acaba en 0: cuando termina, ya está en su sitio. */
@keyframes rebote {
    0%,
    100% {
        transform: translateY(0);
    }
    50% {
        transform: translateY(-22%);
    }
}

.rebota {
    animation: rebote 0.9s ease-in-out 2;
}

@media (prefers-reduced-motion: reduce) {
    .rebote-caja {
        transition: none;
    }

    .rebota {
        animation: none;
    }
}
</style>
