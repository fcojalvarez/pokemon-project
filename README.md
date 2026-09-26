# PogoDex

Pokédex de Pokémon GO construida con Vue 3 + Vite + Tailwind, con los datos servidos desde Supabase
y una capa de datos de juego propia para rankings, eventos e incursiones.

Es una PWA: se puede instalar en el móvil y sigue siendo útil sin cobertura.

## Requisitos

- Node 18+ y `pnpm`
- Un proyecto de Supabase con la tabla `pokemons`

## Configuración

```sh
pnpm install
cp .env.example .env   # y rellena VITE_BASE_SUPABASE_URL / VITE_BASE_SUPABASE_KEY
pnpm data              # genera public/data/ (la primera vez descarga ~25 MB)
pnpm dev
```

Las credenciales están en el panel de Supabase: *Project Settings → API* (URL del proyecto y clave `anon`).

## Scripts

| Comando           | Descripción                                            |
| ----------------- | ------------------------------------------------------ |
| `pnpm dev`        | Servidor de desarrollo con hot-reload                  |
| `pnpm dev-host`   | Igual, accesible desde la red local                    |
| `pnpm build`      | Build de producción en `dist/` (con service worker)    |
| `pnpm preview`    | Sirve el build de producción                           |
| `pnpm lint`       | ESLint con autofix                                     |
| `pnpm test`       | Tests con Vitest                                       |
| `pnpm test:e2e`   | Tests e2e con Playwright en móvil, tablet y escritorio  |
| `pnpm data`       | Regenera `public/data/` y lo sube a Supabase            |
| `pnpm data:fresh` | Igual, pero vuelve a descargar las fuentes             |

## Páginas

| Ruta             | Qué hay                                                                |
| ---------------- | ---------------------------------------------------------------------- |
| `/`              | Pokédex con buscador                                                   |
| `/pokemon/:id`   | Toda la información de un Pokémon (ver abajo)                          |
| `/pokemon/:id?form=` | Una forma concreta: megas y supermegas tienen su propia pantalla   |
| `/top`           | Mejores Pokémon, con un select para PvE (por defecto) o PvP            |
| `/eventos`       | Eventos con cuenta atrás en hora local                                 |
| `/incursiones`   | Jefes actuales con sus counters, huevos y tareas de campo              |

La ficha de cada Pokémon reúne evoluciones, megaevoluciones, PC de un 100 %, dónde sale ahora
mismo (incursión, huevo o tarea), variocolor, debilidades y resistencias, mejores ataques, y su
puesto en los rankings de PvE y PvP.

## Datos

**Desde Supabase** (como hasta ahora): la Pokédex, las evoluciones y sus requisitos.

**En vivo, en cada arranque** (no hay que regenerar nada): eventos, incursiones, huevos e
investigaciones desde [ScrapedDuck](https://github.com/bigfoott/ScrapedDuck), que scrapea
[LeekDuck](https://leekduck.com). Se cachean en `localStorage` y en el service worker para que la
app siga siendo útil sin conexión.

**Generados por `pnpm data`** en `public/data/`:

| Fichero           | Contenido                                                       | Fuente              |
| ----------------- | --------------------------------------------------------------- | ------------------- |
| `roster.json`     | Formas jugables con megas, supermegas y oscuros; stats y ataques | PvPoke + PokeAPI    |
| `moves.json`      | Movimientos con stats **de PvE y de PvP por separado**            | PokeMiners + PvPoke |
| `typechart.json`  | Tabla de efectividades                                            | GAME_MASTER         |
| `pvp.json`        | Top 400 de Súper, Hiper y Master                                  | PvPoke              |

Ojo con una diferencia que mucha gente pasa por alto: **un movimiento no pega igual en
incursiones que en PvP**. Anillo Ígneo hace 120 en PvE y 110 en PvP. Por eso se guardan los dos
juegos de valores y cada ranking usa el suyo.

Los sprites siguen viniendo de PokeAPI. Para megas y formas regionales hace falta el id de forma
(≥ 10000), que el script resuelve con una única llamada a PokeAPI y guarda como `spriteId`.

`src/utils/PokemonDDBB.js` sigue siendo el script que repuebla la tabla `pokemons` de Supabase a
partir de los JSON de `src/utils/`. No forma parte del bundle.

## Cómo se calculan los rankings PvE

No hay tabla precocinada: se calcula en el navegador desde `roster.json` + `moves.json` con las
fórmulas de `src/utils/formulas.js` (~70 ms para todo el roster), y se memoriza por combinación de
filtros.

- Nivel 40, IVs 15/15/15, contra un objetivo genérico de 180 de defensa.
- El ritmo de ataques cargados sale de resolver el balance de energía del ciclo, contando la
  energía que genera el daño recibido.
- `TDO` asume un DPS entrante de `900 / defensa`; `ER = (DPS³ · TDO)^(1/4)`.
- Frustración y Retroceso quedan fuera: no son opciones reales.

No modela esquivar, relevos ni ventanas de daño exactas: sirve para **ordenar atacantes entre sí**,
no para cronometrar un combate. Para un jefe concreto están los counters de `/incursiones`, que sí
aplican la efectividad real.

## Tests

```sh
pnpm test
```

`tests/gameData.spec.js` corre contra los datos reales de `public/data/`: comprueba que el
pipeline no se ha roto y que Mega Rayquaza sigue liderando dragón, Mega Lucario lucha, etc. Los PC
están contrastados con valores conocidos del juego (Mewtwo 4178 a nivel 40, Charizard 2889,
Bulbasaur 637 a nivel 20).

## Créditos

Datos de [PokeMiners](https://github.com/PokeMiners), [PogoApi](https://pogoapi.net/),
[PvPoke](https://pvpoke.com) y [LeekDuck](https://leekduck.com) vía ScrapedDuck.
Sprites de [PokeAPI](https://github.com/PokeAPI/sprites).

## Tests

`pnpm test` cubre las fórmulas de combate, el pipeline de datos (incluidos los
movimientos exclusivos de supermega), la caducidad de la caché de datos en vivo
y la traducción de los títulos de evento.

`pnpm test:e2e` levanta la app en el puerto 5175 y la recorre en tres tamaños
—móvil, tablet y escritorio— comprobando que ninguna vista desborda a lo ancho,
que no hay errores de consola y que funcionan los recorridos principales. La
primera vez hay que bajar el navegador:

```sh
npx playwright install chromium
```

## De dónde salen los datos del juego

`pnpm data` los descarga, escribe `public/data/` y sube cada fichero a la tabla
`game_data` de Supabase (una fila por fichero, el JSON entero en una columna
`jsonb`).

**La app lee de `game_data`**, no de los ficheros. Por eso actualizar los datos
no obliga a redesplegar: en cuanto la tabla cambia, la app lo ve. Los JSON de
`public/data/` viajan igualmente con el despliegue y actúan de respaldo si
Supabase no responde o la tabla está vacía.

Lo mantiene al día el workflow `.github/workflows/datos.yml`, que corre a
diario y se puede lanzar a mano desde la pestaña Actions. Necesita el secreto
`SUPABASE_DB_URL` en el repositorio; se lanza con `--must-upload` para que
falle en vez de acabar en verde sin haber subido nada.

La subida va en una transacción: entran los seis ficheros o no entra ninguno,
para que nadie lea un roster nuevo con unos movimientos viejos. La tabla tiene
RLS con lectura pública y escritura solo para `service_role`.

Necesita `SUPABASE_DB_URL` en `.env` (ver `.env.example`). Sin esa variable el
script genera los ficheros igual y avisa de que no ha subido nada, así que
sigue funcionando para quien solo quiera levantar el proyecto.
