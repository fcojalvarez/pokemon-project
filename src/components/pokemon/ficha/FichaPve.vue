<script setup>
/** Puestos en PvE por forma, como el PvP: la que se ve y debajo la oscura. */
import { computed } from 'vue'
import FichaSeccion from '../FichaSeccion.vue'
import TypeIcons from '../../base/TypeIcons.vue'
import BaseNivel from '../../base/BaseNivel.vue'
import IconoPapel from '../../base/IconoPapel.vue'
import { useTranslate, formatDecimal } from '../../../composables/useTranslate'

const props = defineProps({
  /** pveRanks de useFichaDatos. */
  ranks: { type: Array, required: true },
  /** conNombre de useFichaDatos: si hay que poner el nombre de la forma. */
  conNombre: { type: Function, required: true }
})

const { t, localName } = useTranslate()

/** Plegada: la forma principal y, detrás, el mejor puesto de la oscura. */
const resumen = computed(() => {
  const [principal, ...otras] = props.ranks
  if (!principal) return t('pokemon.noPveRank')
  return [
    principal.overall && `${t('top.overall')}: #${principal.overall.rank}`,
    principal.byType[0] && `${t(`types.${principal.byType[0].type}`)} #${principal.byType[0].rank}`,
    principal.defensor && `${t('top.gym.pill')} #${principal.defensor.rank}`,
    // Solo la oscura: con las megas la línea no cabía.
    ...otras
      .filter((forma) => forma.entry.shadow && forma.byType[0])
      .map(
        (forma) =>
          `${t('pokemon.shadowShort')}: ${t(`types.${forma.byType[0].type}`)} #${
            forma.byType[0].rank
          }`
      )
  ]
    .filter(Boolean)
    .join(' · ')
})
</script>

<template>
  <ficha-seccion id="pve" :title="$t('pokemon.pveRanks')" :summary="resumen">
    <p v-if="!ranks.length" class="mt-2 text-mini text-gray-600 dark:text-gray-300">
      {{ $t('pokemon.noPveRank') }}
    </p>
    <template v-else>
      <!--
        Cada forma con su subtítulo y sus tipos en pastillas, con el puesto
        (el DPS, al pasar por encima). Antes era una caja por forma y tipo:
        en Charizard, doce cajas y casi una pantalla.
      -->
      <div v-for="forma in ranks" :key="forma.id" class="mt-3 first:mt-2">
        <h3 v-if="conNombre(forma.id, ranks.length > 1)" class="subtitulo">
          {{ localName(forma.entry) }}
        </h3>
        <!-- En flex: en línea, la letra quedaba más alta que el texto. -->
        <p
          v-if="forma.overall"
          class="mt-0.5 flex items-center gap-1.5 text-mini text-gray-600 dark:text-gray-300"
        >
          <span
            >{{ $t('top.overall') }}: <strong>#{{ forma.overall.rank }}</strong></span
          >
          <base-nivel :rank="forma.overall.rank" pequena />
        </p>
        <!-- La letra, en la esquina de cada pastilla: sobresale, de ahí el hueco de más. -->
        <ul v-if="forma.byType.length" class="mt-2.5 flex flex-wrap gap-x-3 gap-y-2.5">
          <li
            v-for="entry in forma.byType"
            :key="`${entry.type}-${entry.id}`"
            class="relative flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-xs tabular-nums"
            :title="`${$t(`types.${entry.type}`)}: #${entry.rank} · ${formatDecimal(
              entry.edps
            )} eDPS`"
          >
            <type-icons :types="[entry.type]" size="13" />
            <strong>#{{ entry.rank }}</strong>
            <base-nivel
              :rank="entry.rank"
              por-tipo
              pequena
              class="absolute -top-2 -right-2 ring-2 ring-white dark:ring-gray-900"
            />
          </li>
        </ul>
        <!-- Defendiendo un gimnasio: su puesto entre los que pueden, con su letra. -->
        <template v-if="forma.defensor">
          <p class="mt-3 text-mini text-gray-600 dark:text-gray-300">{{ $t('top.gym.ficha') }}</p>
          <ul class="mt-2.5 flex">
            <li
              class="relative flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-xs tabular-nums"
              :title="`${$t('top.gym.pill')}: #${forma.defensor.rank}`"
            >
              <icono-papel papel="tanque" class="w-[13px] h-[13px]" />
              <span class="sr-only">{{ $t('top.gym.pill') }}:</span>
              <strong>#{{ forma.defensor.rank }}</strong>
              <base-nivel
                :rank="forma.defensor.rank"
                pequena
                class="absolute -top-2 -right-2 ring-2 ring-white dark:ring-gray-900"
              />
            </li>
          </ul>
        </template>
      </div>
    </template>
  </ficha-seccion>
</template>
