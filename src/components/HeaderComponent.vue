<script setup>
    import { ref, watch } from 'vue';
    import { useRoute } from 'vue-router';
    import { SearchBar, ToogleDarkMode } from './index';

    const route = useRoute();

    const pokemonListRoute = 'PokemonList';
    const isShowBackButton = ref(false);

    watch(route, async (newRoute, oldRoute) => {
        isShowBackButton.value = newRoute.name !== pokemonListRoute;
    })
</script>

<template>
    <section class="flex gap-3 h-full">
        <button
            v-if="isShowBackButton"
            class="border border-gray-400 py-2 px-12 mb-12 rounded-xl shadow-md"
            @click="$router.push('/')"
        >
            <span class="text-gray-800 dark:text-white">
                {{ $t('back') }}
            </span>
        </button>
        <SearchBar class="w-8/12" />
        <ToogleDarkMode class="w-3/12 ml-auto cursor-pointer" />
    </section>
</template>

<style scoped>
</style>
