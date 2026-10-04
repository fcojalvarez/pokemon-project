<script setup>
/**
 * Equipo recomendado contra un jefe Max: uno que aguante con Maxibarrera y
 * dos pegando, y de dónde sacar cada uno hoy. Sale desplegado bajo el jefe
 * (Incursiones) y en la ficha (MaxBattlePanel).
 *
 * Se ve como los counters de una incursión (RaidCountersPanel): filas
 * numeradas con el sprite, el nombre y los ataques en pastillas. Antes eran
 * tarjetas con el ataque escrito con flechas («Hoja Afilada → Gigarredoble ·
 * evolucionando a Grookey»), y siendo lo mismo se veían distinto.
 */
import BaseEmptyState from '../base/BaseEmptyState.vue'
import BaseSprite from '../base/BaseSprite.vue'
import MoveTag from '../pokemon/MoveTag.vue'
import { spriteUrl } from '../../utils/sprites'
import { useTranslate } from '../../composables/useTranslate'

defineProps({
  /** Nombre del jefe, ya traducido. */
  bossName: { type: String, required: true },
  /** { tanks, attackers } de maxCounters. */
  team: { type: Object, required: true }
})

const { t, localName } = useTranslate()

/** Cómo conseguirlo hoy: directamente, evolucionando, o de ninguna forma. */
const howToGet = (quien) => {
  if (quien.availableNow) return t('max.availableNow')
  if (quien.availableFrom) return t('max.availableVia', { pokemon: localName(quien.availableFrom) })
  return null
}

const GRUPOS = [
  { clave: 'tanks', titulo: 'max.tank' },
  { clave: 'attackers', titulo: 'max.attackers', vacio: 'max.noAttackers' }
]
</script>

<template>
  <div>
    <p class="text-mini text-gray-600 dark:text-gray-300 mb-3">
      {{ $t('max.teamIntro', { pokemon: bossName }) }}
    </p>

    <div class="grid gap-4 grid-cols-1 md:grid-cols-2">
      <div v-for="grupo in GRUPOS" :key="grupo.clave">
        <h4 class="subtitulo mb-2">{{ $t(grupo.titulo) }}</h4>
        <base-empty-state
          v-if="grupo.vacio && team[grupo.clave].length === 0"
          :message="$t(grupo.vacio)"
        />
        <ol v-else class="grid gap-1.5">
          <li v-for="(quien, i) in team[grupo.clave]" :key="`${grupo.clave}-${quien.id}`">
            <component
              :is="quien.dex ? 'router-link' : 'div'"
              :to="quien.dex ? `/pokemon/${quien.dex}` : undefined"
              class="flex items-center gap-2 p-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-150 hover:dark:bg-gray-700"
            >
              <span
                class="shrink-0 min-w-[1.25rem] px-1 rounded-md bg-gray-200 dark:bg-gray-700 text-center text-mini font-bold tabular-nums text-gray-700 dark:text-gray-200"
                >{{ i + 1 }}</span
              >
              <base-sprite
                :src="spriteUrl(quien.spriteId)"
                class="w-8 h-8 shrink-0"
                img-class="drop-shadow-contorno dark:drop-shadow-none"
              />
              <div class="flex-1 min-w-0">
                <div class="text-xs font-semibold truncate">{{ localName(quien) }}</div>
                <div
                  v-if="quien.maxMove"
                  class="flex flex-wrap gap-1.5 text-mini text-gray-600 dark:text-gray-300"
                >
                  <move-tag
                    v-if="quien.fastMove"
                    chip
                    :name="localName(quien.fastMove)"
                    hide-icon
                  />
                  <move-tag chip :name="localName(quien.maxMove)" hide-icon />
                </div>
                <div v-if="howToGet(quien)" class="text-mini text-gray-600 dark:text-gray-300">
                  {{ howToGet(quien) }}
                </div>
              </div>
            </component>
          </li>
        </ol>
      </div>
    </div>

    <p class="mt-3 text-mini text-gray-600 dark:text-gray-300">
      {{ $t('max.teamNote') }}
    </p>
  </div>
</template>
