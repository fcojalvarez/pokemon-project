<script setup>
import { PokemonView } from '../components/index';
</script>

<template>
    <!--
        Iba envuelto en un segundo <section> con 'pokemon-view-hidden' atado a
        un isEdit que no existía: quedaba de una edición que se quitó, y Vue
        avisaba en cada render. Las tres clases CSS de ese envoltorio tampoco
        estaban definidas en ninguna hoja de estilos.
        Además ponía w-max-[900px], que Tailwind no genera: el ancho máximo no
        se aplicaba nunca.
    -->
    <section class="min-h-screen max-w-[900px] lg:max-w-[1200px] mx-auto">
        <PokemonView />
    </section>
</template>
