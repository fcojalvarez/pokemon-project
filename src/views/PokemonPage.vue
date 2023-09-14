<script setup>
import { ref } from 'vue';
import { PokemonEdit, PokemonView } from '../components/index';

const isEdit = ref(false);

const editPokemonHandler = () => {
    isEdit.value = true;
}

const backToView = () => {
    isEdit.value = false;
}
</script>

<template>
    <!-- <section class="flex">
        <button @click="isEdit? backToView() : editPokemonHandler()" class="bg-blue-300 py-4 px-20 rounded mx-auto block mb-10">
            {{ isEdit? 'CANCELAR' : 'EDITAR' }}
        </button>
    </section> -->
    <section class="min-h-screen w-max-[900px] px-16 overflow-hidden">
        <section 
            class="pokemon-view transition-clip duration-300"
            :class="{'pokemon-view-hidden': isEdit}"
        >
           <PokemonView />
        </section>
        <section 
            class="pokemon-edit transition-clip duration-300"
            :class="{'pokemon-edit-show': isEdit}"
        >
           <PokemonEdit/>
        </section>
    </section>
</template>

<style scoped>
.pokemon-view {
    max-width: 100%;
    position: absolute;
    transition: clip-path 1s;
    clip-path: inset(0 0 0 0);
    right: 0;
}
.pokemon-view-hidden {
    clip-path: inset(0 100% 0 0);
}
.pokemon-edit {
    position: absolute;
    transition: clip-path 1s;
    clip-path: inset(0 0 0 100%);
    right: 0;
}
.pokemon-edit-show {
    clip-path: inset(0 0 0 0);
}
</style>