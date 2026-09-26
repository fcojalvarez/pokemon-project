-- `is_shiny_released` vive en dos sitios: en su columna y, copiado, dentro del
-- jsonb `evolution_info` de cada Pokemon de la familia, que es de donde lo lee
-- la cadena evolutiva de la ficha. Marcar un variocolor como liberado y tocar
-- solo la columna deja la estrella sin aparecer en la cadena.
--
-- Esto copia la columna a todas las entradas incrustadas. Es idempotente, asi
-- que se puede volver a lanzar despues de cada liberacion.
update public.pokemons p
   set evolution_info = (
         select jsonb_object_agg(fam.key, (
                  select jsonb_agg(
                           case
                             when ref.is_shiny_released is distinct from
                                  (uno->>'is_shiny_released')::boolean
                             then jsonb_set(
                                    uno,
                                    '{is_shiny_released}',
                                    to_jsonb(coalesce(ref.is_shiny_released, false))
                                  )
                             else uno
                           end
                           order by t.idx
                         )
                    from jsonb_array_elements(fam.value) with ordinality as t(uno, idx)
                    left join public.pokemons ref
                           on ref.pokemon_id = (uno->>'pokemon_id')::int
                ))
           from jsonb_each(p.evolution_info) fam
       ),
       updated_at = now()
 where p.evolution_info is not null
   and exists (
         select 1
           from jsonb_each(p.evolution_info) fam,
                jsonb_array_elements(fam.value) uno
           left join public.pokemons ref
                  on ref.pokemon_id = (uno->>'pokemon_id')::int
          where coalesce(ref.is_shiny_released, false)
                is distinct from coalesce((uno->>'is_shiny_released')::boolean, false)
       );
