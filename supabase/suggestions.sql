-- Sugerencias de los usuarios de PoGoDex.
--
-- Se ejecuta a mano una vez, desde el SQL Editor de Supabase
-- (Project > SQL Editor > New query > pegar > Run). El script es idempotente:
-- se puede volver a lanzar sin romper nada.
--
-- Quién puede qué:
--   - Cualquiera (clave `anon`, sin identificarse) puede INSERTAR una
--     sugerencia, y nada más: no puede leer las de los demás ni la suya.
--   - Solo el administrador puede leer, cambiar el estado, anotar y borrar.
--     Se decide en `es_admin_sugerencias()`, por una marca en el
--     `app_metadata` del usuario (ver más abajo cómo ponerla).
--   - El servidor limita cuántas llegan por minuto y por día, y rechaza las
--     repetidas, en `suggestions_limite()`.

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
 * Mira `app_metadata.pogodex_admin` del token. Antes miraba el email, y eso
 * se podía suplantar: con los registros abiertos, quien se diera de alta con
 * ese email (por ejemplo, mientras el usuario estaba borrado) entraba como
 * administrador. `app_metadata` solo lo puede escribir el servidor; a
 * diferencia de `user_metadata`, el propio usuario no puede tocarlo.
 *
 * La marca se pone una vez, a mano, desde el SQL Editor (cambiando el email):
 *
 *   update auth.users
 *      set raw_app_meta_data = coalesce(raw_app_meta_data, '{}') || '{"pogodex_admin": true}'
 *    where email = '<tu-email>';
 *
 * El token nuevo no la lleva hasta que se cierra sesión y se vuelve a entrar.
 */
create or replace function public.es_admin_sugerencias()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'pogodex_admin', '') = 'true';
$$;

-- Qué columnas puede rellenar quien envía. El resto (`id`, `created_at`,
-- `status`, `notes`, `updated_at`) toma su valor por defecto: así nadie puede
-- fechar una sugerencia en el futuro para que salga siempre la primera. Los
-- permisos del administrador (leer, cambiar, borrar) no se tocan.
--
-- Y fuera todo lo demás que Supabase da por defecto. A `anon` le basta con
-- insertar; al administrador (`authenticated`), con leer, cambiar y borrar.
-- `truncate` sobre todo: vacía la tabla entera y la RLS no lo frena.
revoke all on public.suggestions from anon;
revoke insert, truncate, references, trigger on public.suggestions from authenticated;
grant select, update, delete on public.suggestions to authenticated;
grant insert (category, message, contact, page, app_version)
  on public.suggestions to anon, authenticated;

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

/**
 * Freno al spam, del lado del servidor.
 *
 * La espera de 60 s de la app vive en el navegador y se salta borrándola;
 * esto no. Los límites son para toda la tabla, no por persona: la base de
 * datos no sabe quién envía, y guardar IPs sería guardar datos personales.
 * El precio es que alguien que la inunde deja sin poder enviar a los demás un
 * rato, que es mucho mejor que llenar la base de datos.
 *
 * `security definer` porque tiene que contar filas que quien envía no puede
 * leer (la RLS se lo impide). El bloqueo pone en fila los envíos simultáneos,
 * para que dos a la vez no se cuelen los dos por el último hueco.
 */
create or replace function public.suggestions_limite()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext('public.suggestions_limite'));

  if (select count(*) from public.suggestions
       where created_at > now() - interval '1 minute') >= 10 then
    raise exception 'Demasiadas sugerencias seguidas; prueba en un minuto'
      using errcode = 'P0001';
  end if;

  if (select count(*) from public.suggestions
       where created_at > now() - interval '1 day') >= 200 then
    raise exception 'Límite diario de sugerencias alcanzado'
      using errcode = 'P0001';
  end if;

  if exists (select 1 from public.suggestions
              where created_at > now() - interval '1 day'
                and lower(btrim(message)) = lower(btrim(new.message))) then
    raise exception 'Esa sugerencia ya se ha enviado'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists suggestions_limite on public.suggestions;
create trigger suggestions_limite
  before insert on public.suggestions
  for each row execute function public.suggestions_limite();
