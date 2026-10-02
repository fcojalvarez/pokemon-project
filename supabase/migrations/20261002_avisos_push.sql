-- Avisos en el móvil (F14): quién quiere que le avisen y de qué.
--
-- Se ejecuta a mano desde el SQL Editor, con el usuario `postgres`. Es
-- idempotente: se puede volver a lanzar. Solo crea; no borra ni cambia nada
-- de lo que ya hay.
--
-- Cómo va:
--   - La app, al activar los avisos, se suscribe en el navegador y guarda la
--     suscripción con `push_alta()`. Al desactivarlos, `push_baja()` la marca
--     con fecha de baja: no se borra nunca.
--   - El workflow `avisos.yml` lee las suscripciones activas cada 15 minutos
--     (con el rol `pogodex_pipeline`) y manda el aviso de los eventos que
--     empiezan dentro de una hora a la hora de cada uno. Lo que ya ha mandado
--     lo apunta en `push_enviados`, para no repetirlo.
--   - Una suscripción que el servicio de push da por caducada (el navegador
--     la ha retirado) se marca de baja, tampoco se borra.
--
-- Nadie con la clave pública puede leer las suscripciones: no hay política
-- de lectura para `anon` ni `authenticated`. Solo pueden llamar a las dos
-- funciones, que validan lo que reciben.

create extension if not exists pgcrypto;

create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- La URL del servicio de push del navegador: identifica la suscripción.
  endpoint    text not null unique
                check (endpoint like 'https://%' and char_length(endpoint) <= 1000),
  p256dh      text not null check (char_length(p256dh) between 1 and 200),
  auth        text not null check (char_length(auth) between 1 and 100),
  -- La zona horaria del móvil: los eventos son a la hora local de cada uno.
  zona        text not null check (char_length(zona) between 1 and 64),
  idioma      text not null default 'es' check (idioma in ('es', 'en')),
  -- De qué avisar: community, hours, raids, events (src/utils/avisos.js).
  categorias  text[] not null default '{}'
                check (categorias <@ array['community', 'hours', 'raids', 'events']::text[]),
  baja_at     timestamptz
);

create index if not exists push_subscriptions_activas_idx
  on public.push_subscriptions (id) where baja_at is null;

create table if not exists public.push_enviados (
  subscription_id uuid not null references public.push_subscriptions (id),
  event_id        text not null check (char_length(event_id) <= 200),
  sent_at         timestamptz not null default now(),
  primary key (subscription_id, event_id)
);

alter table public.push_subscriptions enable row level security;
alter table public.push_enviados enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;
revoke all on public.push_enviados from anon, authenticated;

/**
 * Alta (o puesta al día) de una suscripción. Si el endpoint ya estaba, se
 * actualizan sus claves y preferencias y se quita la baja.
 */
create or replace function public.push_alta(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_zona text,
  p_idioma text,
  p_categorias text[]
) returns void
language sql
security definer
set search_path = public
as $$
  insert into public.push_subscriptions (endpoint, p256dh, auth, zona, idioma, categorias)
  values (p_endpoint, p_p256dh, p_auth, p_zona, p_idioma, p_categorias)
  on conflict (endpoint) do update
    set p256dh = excluded.p256dh,
        auth = excluded.auth,
        zona = excluded.zona,
        idioma = excluded.idioma,
        categorias = excluded.categorias,
        updated_at = now(),
        baja_at = null;
$$;

/** Baja de una suscripción: se marca con fecha, no se borra. */
create or replace function public.push_baja(p_endpoint text) returns void
language sql
security definer
set search_path = public
as $$
  update public.push_subscriptions
     set baja_at = now(), updated_at = now()
   where endpoint = p_endpoint and baja_at is null;
$$;

revoke all on function public.push_alta(text, text, text, text, text, text[]) from public;
revoke all on function public.push_baja(text) from public;
grant execute on function public.push_alta(text, text, text, text, text, text[]) to anon, authenticated;
grant execute on function public.push_baja(text) to anon, authenticated;

-- El workflow: lee las suscripciones, marca las caducadas y apunta lo enviado.
-- Sin delete: el rol no puede borrar nada.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'pogodex_pipeline') then
    grant usage on schema public to pogodex_pipeline;
    grant select, update (baja_at, updated_at) on public.push_subscriptions to pogodex_pipeline;
    grant select, insert on public.push_enviados to pogodex_pipeline;
  else
    raise notice 'No existe el rol pogodex_pipeline: lanza antes 20260928_rls_datos_y_rol_pipeline.sql';
  end if;
end
$$;

-- Que el rol del workflow pase la RLS de las dos tablas.
drop policy if exists "pipeline lee y marca" on public.push_subscriptions;
drop policy if exists "pipeline apunta" on public.push_enviados;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'pogodex_pipeline') then
    create policy "pipeline lee y marca" on public.push_subscriptions
      for all to pogodex_pipeline using (true) with check (true);
    create policy "pipeline apunta" on public.push_enviados
      for all to pogodex_pipeline using (true) with check (true);
  end if;
end
$$;
