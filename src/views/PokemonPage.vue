<script setup>
import { PokemonView } from '../components/index';

</script>

<template>

    <section class="min-h-screen w-max-[900px]  overflow-hidden">
        <section 
            class="pokemon-view w-full transition-clip duration-300"
            :class="{'pokemon-view-hidden': isEdit}"
        >
           <PokemonView />
        </section>
    </section>
</template>