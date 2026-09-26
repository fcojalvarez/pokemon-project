-- Variocolor de Phantump liberado el 26/09/2026 con el evento
-- "Phantump Catch Mastery" (capturas en libertad e investigaciones de campo).
-- Trevenant entra con él: en el juego, liberar el variocolor de la forma base
-- lo hace accesible en toda la línea, ahí por evolución.
update public.pokemons
   set is_shiny_released = true,
       shiny_found = '{"wild":true,"research":true,"egg":false,"raid":false,"evolution":false,"photobomb":false}'::jsonb,
       updated_at = now()
 where pokemon_id = 708;

update public.pokemons
   set is_shiny_released = true,
       shiny_found = '{"wild":false,"research":false,"egg":false,"raid":false,"evolution":true,"photobomb":false}'::jsonb,
       updated_at = now()
 where pokemon_id = 709;
