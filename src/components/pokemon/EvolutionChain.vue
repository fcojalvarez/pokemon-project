<script setup>
/**
 * La cadena evolutiva de la ficha. Junta las ramas en un árbol (cada Pokémon
 * sale una vez), le cuelga a cada uno sus megas y lo pinta con <evolution-tramo>.
 */
import { computed, provide, toRef } from 'vue'
import { useGameDataStore } from '../../stores/gameData'
import { spriteUrl } from '../../utils/sprites'
import { localName } from '../../composables/useTranslate'
import { construirArbol, nodosDe } from '../../utils/evolutionTree'
import EvolutionTramo from './EvolutionTramo.vue'

const props = defineProps({
  pokemon: { type: Object, required: true },
  /** Forma que se está viendo (?form=charizard_mega_x), para resaltarla. */
  formId: { type: String, default: null },
  shiny: Boolean
})

const gameData = useGameDataStore()

/** Las megas publicadas de un Pokémon, como ramas que salen de él. */
const megasDe = (mon) => {
  if (!gameData.isReady) return []
  return (gameData.formsByDex.get(mon.pokemon_id) ?? [])
    .filter((form) => form.mega && form.released)
    .map((form) => ({
      req: form.megaEnergy?.first ? { mega_energy_required: form.megaEnergy.first } : {},
      destino: {
        mon: {
          pokemon_id: form.dex,
          name: localName(form),
          types: form.types,
          is_shiny_released: mon.is_shiny_released,
          sprites: {
            male: spriteUrl(form.spriteId),
            male_shiny: spriteUrl(form.spriteId, { shiny: true })
          }
        },
        ramas: [],
        mega: { id: form.id, to: `/pokemon/${form.dex}?form=${form.id}`, superMega: form.superMega }
      }
    }))
}

/**
 * Si se está viendo una forma regional (?form=meowth_galarian), su cadena es
 * la de la forma, que monta el pipeline en el roster (`cadena`), y no la de la
 * especie, que es la de Kanto. Si la forma no evoluciona (Articuno de Galar),
 * sale ella sola.
 */
const formaRegional = computed(() => {
  const f = props.formId && gameData.isReady ? gameData.byId.get(props.formId) : null
  return f?.regional ? f : null
})

const arbol = computed(() => {
  const p = props.pokemon
  const f = formaRegional.value
  const base = f
    ? {
        pokemon_id: f.dex,
        name: f.name,
        nameEs: f.nameEs,
        types: f.types,
        form: f.id,
        sprites: { male: spriteUrl(f.spriteId), male_shiny: spriteUrl(f.spriteId, { shiny: true }) }
      }
    : {
        pokemon_id: p.pokemon_id,
        name: p.name,
        types: p.types,
        is_shiny_released: p.is_shiny_released,
        sprites: p.sprites
      }
  const raiz = construirArbol(f ? f.cadena ?? {} : p.evolution_info, base)
  if (!raiz) return null
  // Se calcula entero cada vez: así no se toca el árbol de otra ficha. Las
  // megas son de la especie, no de sus formas regionales.
  for (const nodo of nodosDe(raiz)) {
    if (!nodo.mega && !nodo.mon.form && !f) nodo.ramas = [...nodo.ramas, ...megasDe(nodo.mon)]
  }
  return raiz
})

provide('cadenaEvolutiva', {
  activeId: computed(() => props.pokemon.pokemon_id),
  formId: toRef(props, 'formId'),
  shiny: toRef(props, 'shiny')
})
</script>

<template>
  <evolution-tramo v-if="arbol" :nodo="arbol" principal />
</template>
