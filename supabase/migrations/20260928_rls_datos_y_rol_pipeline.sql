-- Seguridad de las tablas que lee la app y del acceso de los workflows.
--
-- Se ejecuta a mano desde el SQL Editor, con el usuario `postgres`. Es
-- idempotente: se puede volver a lanzar.
--
-- 1. `pokemons`, `game_data` y `types` son de solo lectura para el público.
--    La clave `anon` va dentro de la app, así que cualquiera puede hablar con
--    la API: sin esto, podría cambiar o borrar la Pokédex. Se cierra por dos
--    lados, y basta con uno para que la escritura no pase:
--      - Sin permisos de escritura para `anon` ni `authenticated`, aunque
--        quede alguna política vieja que la dejaría pasar (la siembra de 2023,
--        src/utils/PokemonDDBB.js, insertaba con la clave pública).
--      - RLS activada, con una política que solo deja leer.
--
-- 2. Un rol propio para los workflows, `pogodex_pipeline`, que solo puede leer
--    y escribir esas dos tablas. Hasta ahora usaban `postgres`, con permiso
--    para todo, incluidos los usuarios de Auth: cualquier paquete de npm
--    comprometido en `pnpm install` se lo habría llevado.

-- 1. Solo lectura para el público ------------------------------------------

do $$
declare
  tabla text;
begin
  foreach tabla in array array['pokemons', 'game_data', 'types'] loop
    if to_regclass('public.' || tabla) is null then
      raise notice 'No existe public.%, se salta', tabla;
      continue;
    end if;

    execute format('alter table public.%I enable row level security', tabla);
    execute format(
      'revoke insert, update, delete, truncate, references, trigger on public.%I from anon, authenticated',
      tabla
    );
    execute format('grant select on public.%I to anon, authenticated', tabla);

    execute format('drop policy if exists "lectura publica" on public.%I', tabla);
    execute format(
      'create policy "lectura publica" on public.%I for select to anon, authenticated using (true)',
      tabla
    );
  end loop;
end
$$;

-- 2. El rol de los workflows -------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'pogodex_pipeline') then
    create role pogodex_pipeline login noinherit nocreatedb nocreaterole nobypassrls;
  end if;
end
$$;

-- La contraseña NO va aquí: el repositorio es público. Se pone a mano, en el
-- SQL Editor, con una larga y aleatoria:
--
--   alter role pogodex_pipeline password '<contraseña>';
--
-- y la cadena del secreto SUPABASE_DB_URL pasa a ser (Session pooler):
--
--   postgresql://pogodex_pipeline.<ref-del-proyecto>:<contraseña>@aws-1-eu-west-1.pooler.supabase.com:5432/postgres

-- Que los scripts no se queden colgados con una consulta mala.
alter role pogodex_pipeline set statement_timeout = '5min';

grant usage on schema public to pogodex_pipeline;

-- Lo que hacen los scripts (scripts/*.mjs): SELECT, INSERT y UPDATE (el
-- UPDATE también cubre el ON CONFLICT DO UPDATE y el SELECT ... FOR UPDATE).
-- Nada de DELETE ni de tocar la estructura.
grant select, insert, update on public.pokemons, public.game_data to pogodex_pipeline;

-- Con la RLS activada, los permisos no bastan: hace falta una política.
drop policy if exists "pipeline escribe" on public.pokemons;
create policy "pipeline escribe" on public.pokemons
  for all to pogodex_pipeline using (true) with check (true);

drop policy if exists "pipeline escribe" on public.game_data;
create policy "pipeline escribe" on public.game_data
  for all to pogodex_pipeline using (true) with check (true);

-- Comprobación: tras lanzarlo, cada tabla debería salir con rls = true,
-- `anon` solo con SELECT, y sin más políticas que estas y las de sugerencias.
-- Si sale alguna otra política de insert/update/delete para anon o
-- authenticated, es vieja y conviene borrarla.
select c.relname as tabla, c.relrowsecurity as rls,
       (select string_agg(privilege_type, ', ' order by privilege_type)
          from information_schema.role_table_grants g
         where g.table_schema = 'public' and g.table_name = c.relname
           and g.grantee = 'anon') as permisos_anon,
       (select string_agg(format('%s [%s] %s', p.policyname, p.cmd, p.roles::text), '; ')
          from pg_policies p
         where p.schemaname = 'public' and p.tablename = c.relname) as politicas
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind = 'r'
 order by 1;
