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

const scrollToUp = () => window.scrollTo({ top: 0, behavior: 'smooth' })

onMounted(() => document.addEventListener('scroll', scrollHandler, { passive: true }))
onUnmounted(() => document.removeEventListener('scroll', scrollHandler))
</script>

<template>
    <div
        class="rebote-caja fixed z-30 bg-white dark:bg-gray-900 shadow-xl rounded-full h-16 md:h-12 w-16 md:w-12 flex justify-center items-center cursor-pointer right-10 border border-gray-400 dark:border-gray-150 hover:bg-gray-150 hover:dark:bg-gray-800 transition-[bottom] duration-300 ease-out"
        :class="[isShowButton ? 'bottom-8' : '-bottom-20', rebota ? 'rebota' : '']"
        @animationend="rebota = false"
        @click="scrollToUp"
    >
        <base-icon
            width="24px" height="24px"
            :stroke-width="3"
            d="M12 21V3m0 0l8.5 8.5M12 3l-8.5 8.5"
            class-path="stroke-gray-800 dark:stroke-gray-200"
        />
    </div>
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
