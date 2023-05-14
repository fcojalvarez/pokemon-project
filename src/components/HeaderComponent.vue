<script setup>
    import { SearchBar, ToogleDarkMode } from './index';
</script>

<template>
    <section class="flex gap-3 h-full sm:px-16">
        <SearchBar class="w-5/6" />
        <ToogleDarkMode class="w-1/6 ml-auto cursor-pointer" />
    </section>
</template>

<style scoped>
</style>
