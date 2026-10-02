<script setup>
/**
 * Comparar con otro Pokémon: lado a lado sus estadísticas, el PC máximo, el
 * mejor conjunto de ataques para incursiones (DPS y daño total) y los puestos
 * PvE y PvP. Es la duda de siempre antes de gastar polvo: «¿subo este o el
 * otro?», «¿el oscuro o la mega?».
 *
 * Se elige escribiendo el nombre; salen las formas del roster (con megas,
 * regionales y oscuras). Lo elegido no se guarda: es una consulta de un
 * momento, y en la ficha de otro Pokémon no tendría sentido seguir viéndolo.
 */
import { computed, ref, useId, watch } from 'vue'
import FichaSeccion from '../FichaSeccion.vue'
import MoveTag from '../MoveTag.vue'
import { useGameDataStore } from '../../../stores/gameData'
import { useTranslate } from '../../../composables/useTranslate'
import { spriteUrl } from '../../../utils/sprites'
import { candidatosComparar, filasComparar, resumenComparable } from '../../../utils/comparar'

const props = defineProps({
  /** La forma que se ve en la ficha (la `entrada` de useFichaDatos). */
  entrada: { type: Object, required: true }
})

const gameData = useGameDataStore()
const { t, localName, formatNumber } = useTranslate()
const uid = useId()

const texto = ref('')
const elegido = ref(null)

// En la ficha de otro Pokémon se empieza de cero (la especie, no el id: el
// id cambia solo al llegar el roster, y borraba lo que ya se había escrito).
watch(
  () => props.entrada.dex,
  () => {
    elegido.value = null
    texto.value = ''
  }
)

const candidatos = computed(() =>
  elegido.value
    ? []
    : candidatosComparar(gameData.roster, texto.value, localName, { excluir: props.entrada.id })
)

const elegir = (entry) => {
  elegido.value = entry
  texto.value = ''
}

const a = computed(() => resumenComparable(gameData, props.entrada))
const b = computed(() => (elegido.value ? resumenComparable(gameData, elegido.value) : null))
const filas = computed(() => (b.value ? filasComparar(a.value, b.value) : []))

/** Cómo se lee cada valor: los puestos con «#», el DPS con un decimal. */
const formato = (fila, valor) => {
  if (valor == null) return '—'
  if (fila.mejor === 'menor') return `#${valor}`
  if (fila.clave === 'dps') return formatNumber(Math.round(valor * 10) / 10)
  return formatNumber(Math.round(valor))
}

const etiqueta = (clave) =>
  ['great', 'ultra', 'master'].includes(clave)
    ? t(`top.${clave}`)
    : t(`pokemon.compare.rows.${clave}`)

/** El enlace a la ficha del otro, con su forma. */
const fichaDe = (entry) => ({ path: `/pokemon/${entry.dex}`, query: { form: entry.id } })

/** Plegada: con quién se compara, o la invitación a hacerlo. */
const resumen = computed(() =>
  elegido.value
    ? `${localName(props.entrada)} vs ${localName(elegido.value)}`
    : t('pokemon.compare.summary')
)
</script>

<template>
  <ficha-seccion id="comparar" :title="$t('pokemon.compare.title')" :summary="resumen">
    <template v-if="!elegido">
      <label :for="`comparar-${uid}`" class="block mt-2 text-mini text-gray-600 dark:text-gray-300">
        {{ $t('pokemon.compare.pick') }}
      </label>
      <input
        :id="`comparar-${uid}`"
        v-model="texto"
        type="search"
        autocomplete="off"
        :placeholder="$t('pokemon.compare.placeholder')"
        class="campo shadow-md mt-1"
        @keydown.enter.prevent="candidatos[0] && elegir(candidatos[0])"
      />
      <ul v-if="candidatos.length" class="mt-2 flex flex-col gap-1">
        <li v-for="entry in candidatos" :key="entry.id">
          <button
            type="button"
            class="w-full flex items-center gap-2 p-1.5 rounded-xl text-left text-xs hover:bg-gray-150 hover:dark:bg-gray-700"
            @click="elegir(entry)"
          >
            <img
              :src="spriteUrl(entry.spriteId ?? entry.dex)"
              alt=""
              width="32"
              height="32"
              class="w-8 h-8 object-contain"
            />
            <span class="flex-1 min-w-0 truncate">{{ localName(entry) }}</span>
            <span class="text-gray-600 dark:text-gray-300 tabular-nums">#{{ entry.dex }}</span>
          </button>
        </li>
      </ul>
      <p
        v-else-if="texto.trim()"
        class="mt-2 text-mini text-gray-600 dark:text-gray-300"
        role="status"
      >
        {{ $t('pokemon.compare.none') }}
      </p>
    </template>

    <template v-else>
      <table class="mt-2 w-full text-xs tabular-nums">
        <caption class="sr-only">
          {{
            resumen
          }}
        </caption>
        <thead>
          <tr>
            <td></td>
            <th
              v-for="(lado, i) in [a, b]"
              :key="lado.entry.id"
              scope="col"
              class="w-[34%] pb-2 font-semibold align-bottom"
            >
              <img
                :src="spriteUrl(lado.entry.spriteId ?? lado.entry.dex)"
                alt=""
                width="48"
                height="48"
                class="mx-auto w-12 h-12 object-contain"
              />
              <router-link
                v-if="i === 1"
                :to="fichaDe(lado.entry)"
                class="block leading-tight hover:underline"
                >{{ localName(lado.entry) }}</router-link
              >
              <span v-else class="block leading-tight">{{ localName(lado.entry) }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="fila in filas"
            :key="fila.clave"
            class="border-t border-gray-300 dark:border-gray-700"
          >
            <th
              scope="row"
              class="py-1.5 pr-2 text-left font-normal text-gray-600 dark:text-gray-300"
            >
              {{ etiqueta(fila.clave) }}
            </th>
            <td
              v-for="lado in ['a', 'b']"
              :key="lado"
              class="py-1.5 text-center"
              :class="fila.gana === lado ? 'font-bold text-green-700 dark:text-green-400' : ''"
            >
              {{ formato(fila, fila[lado]) }}
            </td>
          </tr>
        </tbody>
      </table>

      <p class="mt-3 text-mini text-gray-600 dark:text-gray-300">
        {{ $t('pokemon.compare.bestSet') }}
      </p>
      <ul class="mt-1 grid grid-cols-2 gap-2">
        <li
          v-for="lado in [a, b]"
          :key="lado.entry.id"
          class="flex flex-col items-start gap-1 p-2 rounded-xl bg-gray-100 dark:bg-gray-800"
        >
          <template v-if="lado.mejor">
            <move-tag
              chip
              :name="localName(lado.mejor.fast)"
              :type="lado.mejor.fast.type"
              size="11"
              :elite="lado.mejor.fast.elite"
              :legacy="lado.mejor.fast.legacy"
            />
            <move-tag
              chip
              :name="localName(lado.mejor.charged)"
              :type="lado.mejor.charged.type"
              size="11"
              :elite="lado.mejor.charged.elite"
              :legacy="lado.mejor.charged.legacy"
              :mega="lado.mejor.charged.mega"
            />
          </template>
          <span v-else class="text-mini text-gray-600 dark:text-gray-300">—</span>
        </li>
      </ul>

      <p class="mt-2 text-mini text-gray-600 dark:text-gray-300">
        {{ $t('pokemon.compare.help') }}
      </p>
      <button
        type="button"
        class="mt-2 px-3 py-1.5 text-xs rounded-xl border border-gray-400 dark:border-gray-600 hover:bg-gray-150 hover:dark:bg-gray-700"
        @click="elegido = null"
      >
        {{ $t('pokemon.compare.other') }}
      </button>
    </template>
  </ficha-seccion>
</template>
