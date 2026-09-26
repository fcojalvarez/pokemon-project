<script setup>
    import { computed } from 'vue';
    import { useRouter } from 'vue-router';
    import { BaseIcon } from '.';
    import ShinyMark from './pokemon/ShinyMark.vue';
    import { typesSVG } from '../utils/Settings';
    import { usePokemonsStore } from '../stores/pokemons';

    const { setIsSearching } = usePokemonsStore();

    const props = defineProps({
        id: Number,
        image: String,
        is_released: Boolean,
        name: String,
        types: Array,
        is_shiny_released: Boolean,
        // PC del encuentro, para reutilizar la tarjeta en huevos e incursiones.
        combat_power: { type: Object, default: null },
        // Tamaño del sprite. Por defecto el de la Pokédex; en listados largos
        // como el de huevos se pasa uno más pequeño para no comer pantalla.
        image_size: { type: String, default: 'w-24 h-24' }
    })
    const router = useRouter();

    const pokemonId = computed(() => props.id?.toString().padStart(3, '0'));

    const goToPokemonPage = (pokemonId) => {
        pokemonId && setIsSearching(false);
        pokemonId && router.push(`/pokemon/${pokemonId}`);
    }
</script>

<template>
    <section
        :class="[props.is_released? 'cursor-pointer hover:outline hover:bg-gray-150 hover:outline-white hover:dark:bg-gray-800 hover:dark:outline-gray-600' : '', 'p-2 rounded-2xl']"
        @click="props.is_released && goToPokemonPage(props.id)"
    >   
        <div class="relative mx-auto" :class="image_size">
            <img
                :src="image"
                :alt="`${props.name} ${$t('image')}`"
                :class="[props.is_released? 'drop-shadow-pokemon_light dark:drop-shadow-pokemon_dark': 'grayscale opacity-40', 'z-10 w-full h-full object-contain']"
                loading="lazy"
            >
            <!-- Escalada, no con otro font-size: así la marca no se descuadra. -->
            <shiny-mark v-if="props.is_shiny_released" variant="dex" class="absolute top-0 right-0 z-10 scale-[0.8] origin-top-right" />
        </div>
        <!--
            Los tipos iban en la misma línea que el nombre y se lo comían: con
            un nombre largo el truncado se activaba enseguida. Ahora el nombre
            tiene la fila entera y los tipos van debajo.
        -->
        <div class="mt-3 flex items-center justify-center gap-1 text-gray-800 dark:text-gray-300">
            <span v-if="pokemonId" class="text-xs font-semibold shrink-0">#{{ pokemonId }}</span>
            <span :class="[props.is_released? '' : 'line-through', 'font-semibold text-sm truncate']">
                {{ props.name }}
            </span>
        </div>

        <div v-if="props.is_released && types" class="mt-1 flex items-center justify-center gap-1">
            <base-icon
                view-box="0 0 512 512"
                width="14"
                height="14"
                icon-class="drop-shadow-svg"
                :fill-path="typesSVG[types[0]].color"
                :d="typesSVG[types[0]].icon"
            />
            <base-icon
                v-if="types[1]"
                view-box="0 0 512 512"
                width="14"
                height="14"
                icon-class="drop-shadow-svg"
                :fill-path="typesSVG[types[1]].color"
                :d="typesSVG[types[1]].icon"
            />
        </div>

        <div
            v-if="combat_power"
            class="mt-1 text-center text-mini text-gray-500 dark:text-gray-400"
        >
            {{ $t('raids.cpRange') }} {{ combat_power.min }}<template
                v-if="combat_power.max && combat_power.max !== combat_power.min"
            >–{{ combat_power.max }}</template>
        </div>
    </section>
</template>