-- Sugerencias de los usuarios de PogoDex.
--
-- Se ejecuta a mano una vez, desde el SQL Editor de Supabase
-- (Project > SQL Editor > New query > pegar > Run). El script es idempotente:
-- se puede volver a lanzar sin romper nada.
--
-- Quién puede qué:
--   - Cualquiera (clave `anon`, sin identificarse) puede INSERTAR una
--     sugerencia, y nada más: no puede leer las de los demás ni la suya.
--   - Solo el administrador puede leer, cambiar el estado, anotar y borrar.
--     Se decide por el email del token, en `es_admin_sugerencias()`.
--
-- Para cambiar de administrador basta con reescribir esa función.

create extension if not exists pgcrypto;

create table if not exists public.suggestions (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz,
  category    text not null check (category in ('bug', 'idea', 'data', 'other')),
  -- El límite de arriba evita que alguien use la tabla como almacén; el de
  -- abajo, las sugerencias de una palabra que no dicen nada.
  message     text not null check (char_length(btrim(message)) between 10 and 2000),
  -- Email opcional para poder responder. Va sin validar formato: la app ya lo
  -- comprueba y aquí lo único que importa es que no crezca sin control.
  contact     text check (contact is null or char_length(contact) <= 120),
  -- Desde dónde se envió. Un fallo descrito como "no carga" se reproduce mucho
  -- mejor sabiendo la ruta y la versión que tenía delante quien lo escribió.
  page        text check (page is null or char_length(page) <= 200),
  app_version text check (app_version is null or char_length(app_version) <= 20),
  status      text not null default 'new'
                check (status in ('new', 'doing', 'done', 'discarded')),
  notes       text check (notes is null or char_length(notes) <= 2000)
);

-- El panel las lista por fecha y las filtra por estado.
create index if not exists suggestions_created_at_idx on public.suggestions (created_at desc);
create index if not exists suggestions_status_idx on public.suggestions (status);

alter table public.suggestions enable row level security;

/**
 * ¿El que llama es el administrador?
 *
 * Mira el email del JWT, no el `uid`, para que siga valiendo aunque se borre y
 * se vuelva a crear el usuario en Supabase.
 */
create or replace function public.es_admin_sugerencias()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'fcojalvarezrodriguez@gmail.com';
$$;

-- El `with check` es lo que impide que alguien se cuele por la puerta de
-- entrada y se marque solo una sugerencia como hecha, o se escriba las notas
-- internas: al insertar, el estado tiene que ser el inicial y las notas ir
-- vacías. Los valores por defecto de la tabla ya cumplen las dos cosas.
drop policy if exists "cualquiera puede enviar una sugerencia" on public.suggestions;
create policy "cualquiera puede enviar una sugerencia"
  on public.suggestions for insert
  to anon, authenticated
  with check (status = 'new' and notes is null);

drop policy if exists "solo el admin lee las sugerencias" on public.suggestions;
create policy "solo el admin lee las sugerencias"
  on public.suggestions for select
  to authenticated
  using (public.es_admin_sugerencias());

drop policy if exists "solo el admin cambia las sugerencias" on public.suggestions;
create policy "solo el admin cambia las sugerencias"
  on public.suggestions for update
  to authenticated
  using (public.es_admin_sugerencias())
  with check (public.es_admin_sugerencias());

drop policy if exists "solo el admin borra las sugerencias" on public.suggestions;
create policy "solo el admin borra las sugerencias"
  on public.suggestions for delete
  to authenticated
  using (public.es_admin_sugerencias());

-- `updated_at` se pone solo: si lo rellenara la app, una actualización hecha
-- desde el panel de Supabase se quedaría con la fecha vieja.
create or replace function public.suggestions_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists suggestions_touch on public.suggestions;
create trigger suggestions_touch
  before update on public.suggestions
  for each row execute function public.suggestions_touch();
