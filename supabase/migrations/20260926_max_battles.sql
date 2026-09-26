-- Combates Max: que un Pokemon pueda dinamaxizar o gigamaxizar es un dato del
-- GAME_MASTER, asi que lo escribe el pipeline (scripts/build-data.mjs) en cada
-- pasada. Va en columnas y no en un jsonb porque la Pokedex filtra en servidor
-- y necesita poder indexarlo.
alter table public.pokemons
  add column if not exists can_dynamax boolean not null default false,
  add column if not exists can_gigantamax boolean not null default false;

create index if not exists pokemons_can_dynamax_idx
  on public.pokemons (can_dynamax) where can_dynamax;
create index if not exists pokemons_can_gigantamax_idx
  on public.pokemons (can_gigantamax) where can_gigantamax;
