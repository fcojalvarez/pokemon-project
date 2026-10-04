<script setup>
/**
 * La letra del puesto (S, A+… F), en gris según lo buena que es. `pequena`
 * para la esquina de una pastilla o junto a un puesto; la normal, para el Top.
 * El title dice qué puestos abarca.
 */
import { computed } from 'vue'
import { useTranslate } from '../../composables/useTranslate'
import { nivelDe, rangoDe, claseNivel } from '../../utils/nivel'

const props = defineProps({
  rank: { type: Number, required: true },
  /** La lista de un tipo: cortes más cortos. */
  porTipo: Boolean,
  pequena: Boolean
})

const { t } = useTranslate()

const letra = computed(() => nivelDe(props.rank, { porTipo: props.porTipo }))
const titulo = computed(() => {
  const { desde, hasta } = rangoDe(letra.value, { porTipo: props.porTipo })
  return hasta
    ? t('top.tierRange', { letra: letra.value, desde, hasta })
    : t('top.tierFrom', { letra: letra.value, desde })
})
</script>

<template>
  <span
    role="img"
    :aria-label="titulo"
    :title="titulo"
    class="inline-grid shrink-0 place-items-center font-extrabold leading-none tabular-nums"
    :class="[
      claseNivel(letra),
      pequena
        ? 'min-w-[1rem] h-4 px-[3px] rounded-full text-[9px]'
        : 'min-w-[1.5rem] h-6 px-1 rounded-[7px] text-xs'
    ]"
    >{{ letra }}</span
  >
</template>
