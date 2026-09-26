<template>
    <div
        class="top-button animate-bounce fixed z-30 bg-white dark:bg-gray-900 shadow-xl rounded-full h-16 md:h-12 w-16 md:w-12 flex justify-center items-center cursor-pointer right-10 border border-gray-400 dark:border-gray-150 hover:bg-gray-150 hover:dark:bg-gray-800 transition-[bottom] duration-300 ease-out"
        :class="isShowButton ? 'bottom-8' : '-bottom-20'"
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

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { BaseIcon } from "."; 

const isShowButton = ref(false);

const scrollHandler = ({target: { scrollingElement : { scrollTop } }}) => {
    if(!isShowButton.value && scrollTop > 0) {
        document.getElementsByClassName('top-button')[0].classList.add('animate-bounce');
           
        setTimeout(() => {
            document.getElementsByClassName('top-button')[0].classList.remove('animate-bounce');
        }, 2500);
    }

    isShowButton.value = scrollTop > 0;
}

const scrollToUp = () => window.scrollTo({ top: 0, behavior: "smooth" });

onMounted(() => {
    document.addEventListener('scroll', scrollHandler, { passive: true });
})
onUnmounted(() => {
    document.removeEventListener('scroll', scrollHandler);
})
</script>
