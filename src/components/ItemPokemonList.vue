<script setup>
    import { computed } from 'vue';
    import { BaseIcon } from '.';
    import ShinyMark from './pokemon/ShinyMark.vue';
    import MaxMark from './pokemon/MaxMark.vue';
    import BaseSprite from './base/BaseSprite.vue';
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
        can_dynamax: Boolean,
        can_gigantamax: Boolean,
        // PC del encuentro, para reutilizar la tarjeta en huevos e incursiones.
        combat_power: { type: Object, default: null },
        // Tamaño del sprite. Por defecto el de la Pokédex; en listados largos
        // como el de huevos se pasa uno más pequeño para no comer pantalla.
        image_size: { type: String, default: 'w-24 h-24' }
    })
    const pokemonId = computed(() => props.id?.toString().padStart(3, '0'));
</script>

<template>
    <!--
        Un enlace de verdad y no un bloque con @click: así se llega con el
        tabulador, se abre con Enter y se puede abrir en otra pestaña. Los que
        aún no han salido no llevan a ninguna parte y se quedan en un div.
    -->
    <component
        :is="props.is_released ? 'router-link' : 'div'"
        :to="props.is_released ? `/pokemon/${props.id}` : undefined"
        data-dex-tile
        :class="[props.is_released? 'hover:outline hover:bg-gray-150 hover:outline-white hover:dark:bg-gray-800 hover:dark:outline-gray-600' : '', 'block p-2 rounded-2xl']"
        @click="props.is_released && setIsSearching(false)"
    >
        <div class="relative mx-auto" :class="image_size">
            <!-- alt vacío: el nombre ya va escrito debajo, dentro del mismo enlace. -->
            <base-sprite
                :src="image"
                class="w-full h-full"
                :img-class="[props.is_released? 'drop-shadow-pokemon_light dark:drop-shadow-pokemon_dark': 'grayscale opacity-40', 'z-10']"
            />
            <!-- Escalada, no con otro font-size: así la marca no se descuadra. -->
            <shiny-mark v-if="props.is_shiny_released" variant="dex" :label="$t('pokemon.shinyLegend')" class="absolute top-0 right-0 z-10 scale-[0.8] origin-top-right" />
            <!--
                Abajo, una en cada esquina, para no pelearse con la marca de
                variocolor (que va arriba a la derecha) ni tapar al Pokémon.
                Se pintan las dos: gigamaxizar y dinamaxizar son cosas
                distintas y hay 31 que pueden las dos.
            -->
            <max-mark
                v-if="props.can_dynamax"
                variant="dynamax"
                :size="18"
                class="absolute bottom-0 left-0 z-10 text-gray-700 dark:text-gray-200"
            />
            <max-mark
                v-if="props.can_gigantamax"
                variant="gigantamax"
                :size="18"
                class="absolute bottom-0 right-0 z-10 text-gray-700 dark:text-gray-200"
            />
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
            class="mt-1 text-center text-mini text-gray-600 dark:text-gray-300"
        >
            {{ $t('raids.cpRange') }} {{ combat_power.min }}<template
                v-if="combat_power.max && combat_power.max !== combat_power.min"
            >–{{ combat_power.max }}</template>
        </div>
    </component>
</template>