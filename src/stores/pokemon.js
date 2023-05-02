import { ref } from 'vue'
import { defineStore } from 'pinia'

export const usePokemonStore = defineStore('pokemon', () => {
    const pokemonsName = ref([]);

    function setPokemonsName(arrPokemonsName) {
        console.log(pokemonsName.value);
        pokemonsName.value = [...arrPokemonsName];
        console.log(pokemonsName.value);
    }

    return { pokemonsName, setPokemonsName }
})