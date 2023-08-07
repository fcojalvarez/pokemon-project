<template>
    <div v-show="isShowButton" class="top-button sticky bg-gray-600 dark:bg-white shadow-xl rounded-full h-10 w-10 flex justify-center items-center cursor-pointer" @click="scrollToUp">
        <svg width="24px" height="24px" viewBox="0 0 24 24" stroke-width="1.5" fill="none"  color="#000000">
            <path class="stroke-white dark:stroke-gray-800" d="M12 21V3m0 0l8.5 8.5M12 3l-8.5 8.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";

const isShowButton = ref(false);

const scrollHandler = ({target: { scrollingElement : { offsetHeight, scrollTop, scrollHeight} }}) => isShowButton.value = offsetHeight + scrollTop > scrollHeight;

const scrollToUp = () => window.scrollTo({ top: 0, behavior: "smooth" });

onMounted(() => {
    document.addEventListener('scroll', scrollHandler);
})
onUnmounted(() => {
    document.removeEventListener('scroll', scrollHandler);
})
</script>

<style scoped>
.top-button {
    animation: fade-in 0.5s ease;
    bottom: 2rem;
}

@keyframes fade-in {
  0% {
    opacity: 0;
    bottom: -1rem;
  }
  100% {
    opacity: 1;
    bottom: 2rem;
  }
}
</style>