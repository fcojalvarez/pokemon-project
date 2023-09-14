<script setup>
    import { ref, watch } from 'vue';
    import { useRoute } from 'vue-router';
    import { SearchBar, ToogleDarkMode, BaseIcon } from './index';
    import { useMainStore } from '../stores/main';
    import { storeToRefs } from 'pinia';

    const { isDarkMode } = storeToRefs(useMainStore);
    const route = useRoute();

    const pokemonListRoute = 'PokemonList';
    const backButtonRef = ref(null);

    watch(route, async (newRoute) => {
        if(newRoute.name !== pokemonListRoute) {
            backButtonRef.value.classList.add('show-back-btn');
            document.getElementById('search-bar').classList.add('search-bar-moved');
        } else {
            backButtonRef.value.classList.remove('show-back-btn');
            document.getElementById('search-bar').classList.remove('search-bar-moved');
        }
    })
</script>

<template>
    <div class="relative h-20 md:h-16 flex gap-3">
        <button
            ref="backButtonRef"
            class="h-100 w-2/12 md:max-w-[150px] border border-gray-400 py-2 px-4 md:px-12 rounded-xl shadow-md absolute left-[-100%] transition-position duration-300 bg-white dark:bg-gray-900"
            @click="$router.push('/')"
        >
            <div class="flex md:hidden justify-center items-center h-9">
                <base-icon
                    width="20" height="20"
                    stroke-width="1.5" :color="isDarkMode?'#fff':'#666'"
                    d="M21 12H3m0 0 8.5-8.5M3 12l8.5 8.5"
                />
            </div>

            <span class="hidden md:block text-gray-800 dark:text-white">
                {{ $t('back') }}
            </span>
        </button>

        <SearchBar id="search-bar" class="w-6/12 md:w-7/12 xl:w-8/12 md:max-w-lg h-100 search-bar md:absolute left-0 transition-position duration-300" />

        <ToogleDarkMode class="w-100 h-100 px-4 ml-auto cursor-pointer" />
    </div>
</template>

<style scoped>
.search-bar-moved {
    left: 6rem;
    width: 50%;
}
.show-back-btn {
    left: 0px;
}
@media(min-width: 648px) {
    .search-bar-moved { left: 9rem; }
}
@media(min-width: 1024px) {
    .search-bar-moved { left: 12rem; }
}
</style>
