<script setup>
/** Puestos en PvE por forma, como el PvP: la que se ve y debajo la oscura. */
import { computed } from 'vue'
import FichaSeccion from '../FichaSeccion.vue'
import TypeIcons from '../../base/TypeIcons.vue'
import { useTranslate } from '../../../composables/useTranslate'

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
    `${t(`types.${principal.byType[0].type}`)} #${principal.byType[0].rank}`,
    // Solo la oscura: con las megas la línea no cabía.
    ...otras
      .filter((forma) => forma.entry.shadow)
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
      <div v-for="forma in ranks" :key="forma.id" class="mt-2">
        <p v-if="conNombre(forma.id, ranks.length > 1)" class="text-xs font-semibold">
          {{ localName(forma.entry) }}
        </p>
        <p v-if="forma.overall" class="mt-0.5 text-mini text-gray-600 dark:text-gray-300">
          {{ $t('top.overall') }}: <strong>#{{ forma.overall.rank }}</strong>
        </p>
        <ul class="mt-1.5 flex flex-col gap-1.5">
          <li
            v-for="entry in forma.byType"
            :key="`${entry.type}-${entry.id}`"
            class="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs"
          >
            <span class="flex items-center gap-2">
              <type-icons :types="[entry.type]" size="13" />
              <span class="font-semibold">{{ $t(`types.${entry.type}`) }}</span>
              <span class="ml-auto shrink-0">
                #{{ entry.rank }} · <strong>{{ entry.dps.toFixed(1) }}</strong>
              </span>
            </span>
          </li>
        </ul>
      </div>
    </template>
  </ficha-seccion>
</template>
