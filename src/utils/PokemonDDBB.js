import { supabase } from '../lib/supabaseClient';

import shinies from './shiny.json';
import shiniesReleasedes from './shiny_released.json';
import releasedes from './released.json';
import pokemonDB from './latest.json';
import pokemonMoves from './pokemon_moves.json';
import rarities from './rarity.json';
import generations from './generations.json';
import shadowPokemons from './shadow_pokemons.json';
import pokemonEvolutions from './pokemon_evolutions.json';
import genders from './genders.json';
import { evolutionsFamily } from './Settings';


export const createPokemonData = async() => {
    const pokemonsArr = [];
    const max_pokemons_actual = 1017;
    const idPossibleDitto = [23, 92, 177, 283, 456, 506, 557, 684];
    const idPvpExclusive = [619, 620];
    const pokemonsLegendary = rarities.Legendary.map( x => x.pokemon_id);
    const pokemonsMythic = rarities.Mythic.map( x => x.pokemon_id);
    const gen1 = generations['Generation 1'].map(x => x.id);
    const gen2 = generations['Generation 2'].map(x => x.id);
    const gen3 = generations['Generation 3'].map(x => x.id);
    const gen4 = generations['Generation 4'].map(x => x.id);
    const gen5 = generations['Generation 5'].map(x => x.id);
    const gen6 = generations['Generation 6'].map(x => x.id);
    const gen7 = generations['Generation 7'].map(x => x.id);
    const gen8 = generations['Generation 8'].map(x => x.id);
    const idsError = [];
    
    for (let index = 1; index <= max_pokemons_actual; index++) {
        const pokemon = {};
        const search_key = `V${String(index).padStart(4, 0)}_POKEMON_`;
        
        const pokemonFromDB = await pokemonDB.find( x => x.templateId.startsWith(search_key) && x.data.pokemonSettings)?.data?.pokemonSettings;
       
        if(!pokemonFromDB) {console.log('Falta el pokemon con id: ',  index); continue}
        
        pokemon.pokemon_id = index;
        const pokemonName = pokemonFromDB.pokemonId.toLowerCase().replace('_', ' ');
        pokemon.name = pokemonName.charAt(0).toUpperCase() + pokemonName.slice(1);
        pokemon.is_shiny_relased = Boolean(shiniesReleasedes[String(index)])
        pokemon.is_relased = Boolean(releasedes[String(index)]);
        if(shinies[index]) {
            pokemon.shiny_found = {
                egg: shinies[index].found_egg,
                raid: shinies[index].found_raid,
                wild: shinies[index].found_photobomb,
                research: shinies[index].found_research,
                evolution: shinies[index].found_evolution,
                photobomb: shinies[index].found_photobomb
            }
        }
        pokemon.is_possible_ditto = idPossibleDitto.includes(index)
        pokemon.forms = [];
        pokemon.stats = {
            base_attack: pokemonFromDB.stats.baseAttack,
            base_defense: pokemonFromDB.stats.baseDefense,
            base_stamina: pokemonFromDB.stats.baseStamina
        }
        const movesPoke = pokemonMoves.find( ({pokemon_id}) => pokemon_id === index)
        pokemon.moves = {
            charged: movesPoke?.charged_moves.map( x => x.toLocaleLowerCase()) || [],
            fast: movesPoke?.fast_moves.map( x => x.toLocaleLowerCase()) || [],
            elite_charged: movesPoke?.elite_charged_moves.map( x => x.toLocaleLowerCase()) || [],
            elite_fast: movesPoke?.elite_fast_moves.map( x => x.toLocaleLowerCase()) || [] 
        }
        pokemon.buddy = {
            candy_distance: pokemonFromDB.kmBuddyDistance,
            mega_distance: pokemonFromDB.kmBuddyDistance,
            candy_rewards: 1,
            mega_rewards: pokemonFromDB.buddyWalkedMegaEnergyAward
        },
        pokemon.pokemon_encounter_data = {
            gender: {
                male_percent: genders.find(({pokemon_id, form}) => form === 'Normal' && pokemon_id === index )?.gender.male_percent || 0,
                female_percent: genders.find(({pokemon_id, form}) => form === 'Normal' && pokemon_id === index )?.gender.female_percent || 0
            },
            jump_time: pokemonFromDB.encounter.jumpTimeS,
            attack_timer: pokemonFromDB.encounter.attackTimerS,
            dodge_distance: pokemonFromDB.encounter.dodgeDistance,
            dodge_duration: pokemonFromDB.encounter.dodgeDurationS,
            movement_timer: pokemonFromDB.encounter.movementTimerS,
            dodge_probability: pokemonFromDB.encounter.dodgeProbability,
            attack_probabbility: pokemonFromDB.encounter.attackProbability,
            max_pokemon_action_frequency: pokemonFromDB.encounter.maxPokemonActionFrequencyS,
            min_pokemon_action_frequency: pokemonFromDB.encounter.minPokemonActionFrequencyS,
            ob_shadow_form_base_capture_rate: pokemonFromDB.encounter.obShadowFormBaseCaptureRate || null,
            ob_shadow_form_dodge_probability: pokemonFromDB.encounter.obShadowFormDodgeProbability || null,
            ob_shadow_form_attack_probability: pokemonFromDB.encounter.obShadowFormAttackProbability || null
        }
        pokemon.rarity = pokemonsLegendary.includes(index) ? 'legendary' : pokemonsMythic.includes(index) ? 'mythic': 'standard';
        pokemon.generation = gen1.includes(index)? 1: gen2.includes(index)? 2 : gen3.includes(index)? 3 : gen4.includes(index)? 4 : gen5.includes(index)? 5 : gen6.includes(index)? 6 : gen7.includes(index)? 7 : gen8.includes(index)? 8 : 9;
        pokemon.sprites = {
            male: pokemon.generation === 9
                ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${index}.png`
                : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/${index}.png`,
            male_shiny: pokemon.generation === 9
                ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/${index}.png`
                : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/shiny/${index}.png`,
        }
        pokemon.is_shadow_released = Object.keys(shadowPokemons).map( id => Number(id)).includes(index)
        if(pokemon.is_shadow_released) {
            pokemon.shadow_info = {
                candy_required_purification: pokemonFromDB.shadow.purificationCandyNeeded,
                stardust_required_purification: pokemonFromDB.shadow.purificationStardustNeeded,
                shadow_charge_move: pokemonFromDB.shadow.shadowChargeMove.toLowerCase(),
                purified_charge_move: pokemonFromDB.shadow.purifiedChargeMove.toLowerCase()
            }
        }
        pokemon.is_pvp_exclusive = idPvpExclusive.includes(index)
        pokemon.evolution_info = (() => {
            const pokeEvolutions = {};
            const evolutionsFamilyIDArr = evolutionsFamily[pokemon.pokemon_id];
            const evolveFamilyKeys = Object.keys(evolutionsFamily[pokemon.pokemon_id]).filter(key => key !== 'mega' && key !== 'isForm' && key !== 'primal');

            evolveFamilyKeys.forEach(evolveKey => {
                if(evolutionsFamilyIDArr[evolveKey] === null) return pokeEvolutions;

                pokeEvolutions[evolveKey] = [];

                evolutionsFamilyIDArr[evolveKey].forEach( (evolutionId, indexEvolId) => {
                    if(indexEvolId === evolutionsFamilyIDArr[evolveKey].length -1) return;

                    const pokemonFinded  = pokemonEvolutions.filter(({pokemon_id}) => pokemon_id === evolutionId )
                        .find( ({pokemon_id,form} ) => {
                            const pokemonsForm = {
                                412: 'Plant',
                                422: 'East_sea',
                                585: 'Spring',
                                664: 'Archipelago',
                                665: 'Archipelago',
                                669: 'Yellow',
                                670: 'Yellow',
                                710: 'Average',
                                854: 'Antique'
                            }

                            return form === (pokemonsForm[pokemon_id] || 'Normal')
                        })

                    if(Array.isArray(pokemonFinded) && pokemonFinded.length === 0 || !pokemonFinded ) console.error('Hay un problema con el pokemon con id: ', evolutionId);

                    const {pokemon_id: pokemonId, pokemon_name, evolutions } = pokemonFinded;

                    const evolutionsFiltered = evolutions.find( ({pokemon_id, form}) => {          
                        const pokemonsForm = {
                            412: 'Plant',
                            413: 'Plant',
                            421: 'Sunny',
                            422: 'East_sea',
                            423: 'East_sea',
                            585: 'Spring',
                            586: 'Spring',
                            664: 'Archipelago',
                            665: 'Archipelago',
                            666: 'Archipelago',
                            669: 'Yellow',
                            670: 'Yellow',
                            671: 'Yellow',
                            710: 'Average',
                            711: 'Average',
                            744: 'Midday',
                            745: 'Midday',
                            848: 'Amped',
                            849: 'Amped',
                            854: 'Antique',
                            855: 'Antique',
                            891: 'Single_strike',
                            892: 'Single_strike',
                            default: 'Normal'
                        }
                        return form === (pokemonsForm[String(pokemon_id)] || 'Normal') && evolutionsFamilyIDArr[evolveKey].includes(pokemon_id);
                    })

                    if(evolutionsFiltered.length === 0) console.log('Hay un problema al filtrar las evoluciones del pokemon: ', pokemon.pokemon_id);

                    const {pokemon_name: evolveName, pokemon_id:evolveId, form, ...evolutionData} = evolutionsFiltered;

                    pokeEvolutions[evolveKey].push({ pokemon_id: pokemonId, pokemon_name, ...evolutionData});
                    if(indexEvolId === evolutionsFamilyIDArr[evolveKey].length -2) {
                        pokeEvolutions[evolveKey].push({ pokemon_id: evolveId, pokemon_name: evolveName});
                    };
                })
            })
            return pokeEvolutions;
        })()
        pokemon.third_move = {
            startdust_required: pokemonFromDB.thirdMove.stardustToUnlock,
            candy_required: pokemonFromDB.thirdMove.candyToUnlock
        }
        pokemon.is_tradeable = pokemonFromDB.isTradable
        pokemon.is_transferable = pokemonFromDB.isTransferable
        pokemon.is_deployable = pokemonFromDB.isDeployable
        pokemon.types = (function() { 
            const types = [];

            types.push(pokemonFromDB.type.substr(13).toLowerCase())
            if(pokemonFromDB.type2) {
                types.push(pokemonFromDB.type2.substr(13).toLowerCase())
            }
            return types;
        })()
      
        /* const { data, error } = await supabase.from('pokemons').insert({
            pokemon_id: index,
            name: pokemon.name,
            sprites: pokemon.sprites,
            is_shiny_relased: pokemon.is_shiny_relased,
            is_relased: pokemon.is_relased,
            shiny_found: pokemon.shiny_found,
            is_raid_exclusive: pokemon.is_raid_exclusive,
            is_possible_ditto: pokemon.is_possible_ditto,
            forms: pokemon.forms,
            stats: pokemon.stats,
            moves: pokemon.moves,
            buddy: pokemon.buddy,
            pokemon_encounter_data: pokemon.pokemon_encounter_data,
            types: pokemon.types,
            rarity: pokemon.rarity,
            generation: pokemon.generation,
            is_shadow_released: pokemon.is_shadow_released,
            shadow_info: pokemon.shadow_info,
            is_pvp_exclusive: pokemon.is_pvp_exclusive,
            evolution_info: pokemon.evolution_info,
            third_move: pokemon.third_move,
            is_tradeable: pokemon.is_tradeable,
            is_transferable: pokemon.is_transferable
        })

        if(error) {
            idsError.push(index)
        }; 
        
        
        pokemonsArr.push(pokemon); */
        console.log(pokemon);
    }
    // console.log(idsError)
}