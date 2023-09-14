<template>
    <div class="top-button sticky bg-gray-600 dark:bg-white shadow rounded-full h-16 md:h-12 w-16 md:w-12 flex justify-center items-center cursor-pointer" :class="{'show-top-button': isShowButton}" @click="scrollToUp">
        <base-icon
            width="24px" height="24px"
            :stroke-width="3"
            d="M12 21V3m0 0l8.5 8.5M12 3l-8.5 8.5"
            class-path="stroke-white dark:stroke-gray-800"
        />
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { BaseIcon } from "."; 

const isShowButton = ref(false);

const scrollHandler = ({target: { scrollingElement : { scrollTop } }}) => isShowButton.value = scrollTop > 0;

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
  transition: bottom .3s ease;
  bottom: -5rem;
}

.show-top-button {
  bottom: 2rem;
}
</style>