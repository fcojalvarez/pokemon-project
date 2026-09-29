<script setup>
/**
 * Equipo recomendado contra un jefe Max: uno que aguante con Maxibarrera y
 * dos pegando, y de dónde sacar cada uno hoy. Sale desplegado bajo el jefe
 * (Incursiones) y en la ficha (MaxBattlePanel).
 */
import BaseEmptyState from '../base/BaseEmptyState.vue'
import LiveMonCard from '../pokemon/LiveMonCard.vue'
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

/**
 * A los que pegan, además, con qué llevarlos: el Ataque Max depende del
 * ataque rápido, así que se dice cuál poner («Disparo Lodo → Maxitemblor»).
 */
const conAtaque = (quien) => {
  const ataque = quien.maxMove
    ? quien.fastMove ? `${localName(quien.fastMove)} → ${localName(quien.maxMove)}` : localName(quien.maxMove)
    : null
  return [ataque, howToGet(quien)].filter(Boolean).join(' · ') || null
}
</script>

<template>
  <div>
    <p class="text-mini text-gray-600 dark:text-gray-300 mb-3">
      {{ $t('max.teamIntro', { pokemon: bossName }) }}
    </p>

    <div class="grid gap-4 grid-cols-1 md:grid-cols-2">
      <div>
        <h4 class="text-xs font-bold mb-2">{{ $t('max.tank') }}</h4>
        <div class="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-1.5">
          <live-mon-card
            v-for="quien in team.tanks"
            :key="`t-${quien.id}`"
            :name="localName(quien)"
            :image="spriteUrl(quien.spriteId)"
            :dex="quien.dex"
            :badge="howToGet(quien)"
          />
        </div>
      </div>

      <div>
        <h4 class="text-xs font-bold mb-2">{{ $t('max.attackers') }}</h4>
        <base-empty-state v-if="team.attackers.length === 0" :message="$t('max.noAttackers')" />
        <div v-else class="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-1.5">
          <live-mon-card
            v-for="quien in team.attackers"
            :key="`a-${quien.id}`"
            :name="localName(quien)"
            :image="spriteUrl(quien.spriteId)"
            :dex="quien.dex"
            :badge="conAtaque(quien)"
          />
        </div>
      </div>
    </div>

    <p class="mt-3 text-mini text-gray-600 dark:text-gray-300">
      {{ $t('max.teamNote') }}
    </p>
  </div>
</template>
