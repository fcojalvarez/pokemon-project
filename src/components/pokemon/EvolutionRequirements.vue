<script setup>
/**
 * Lo que pide una evolución, con sus iconos: caramelos, megaenergía, objeto,
 * cebo, caminar con el compañero, día, noche o luna llena, sexo, intercambio y
 * misiones (Sylveon: 70 corazones con el compañero).
 *
 * `parte` decide qué se pinta, porque en la cadena el coste va encima de la
 * flecha y el resto debajo, o bajo el nombre dentro de un grupo.
 */
import { computed } from 'vue'
import BaseCandyIcon from '../base/BaseCandyIcon.vue'
import lure from '../../assets/icons/lure_icon.png'
import walk from '../../assets/icons/walkWithYourBuddy.png'
import sun from '../../assets/icons/ic_sun.png'
import moon from '../../assets/icons/ic_moon.png'
import female from '../../assets/icons/ic_female.png'
import male from '../../assets/icons/ic_male.png'
import trade from '../../assets/icons/ic_trade_ball.png'
import SunStone from '../../assets/icons/SunStone.png'
import SinnohStone from '../../assets/icons/SinnohStone.png'
import KingsRock from '../../assets/icons/KingsRock.png'
import UnovaStone from '../../assets/icons/UnovaStone.png'
import DragonScale from '../../assets/icons/DragonScale.png'
import Upgrade from '../../assets/icons/Upgrade.png'
import MetalCoat from '../../assets/icons/MetalCoat.png'

const OBJETOS = { SunStone, SinnohStone, KingsRock, UnovaStone, DragonScale, Upgrade, MetalCoat }

const props = defineProps({
  req: { type: Object, default: () => ({}) },
  /** Tipo principal del que evoluciona: da el color al caramelo. */
  type: { type: String, default: null },
  /** 'coste' (caramelos y megaenergía), 'resto' o 'todo'. */
  parte: { type: String, default: 'todo' },
  /** En columna (dentro de un grupo) o en línea. */
  columna: Boolean
})

const coste = computed(() => props.parte !== 'resto')
const resto = computed(() => props.parte !== 'coste')

const objeto = computed(() => (props.req.item_required || '').replace("'", '').replace(/\s/g, ''))

const hayAlgo = computed(() => {
  const r = props.req
  const deCoste = r.candy_required || r.mega_energy_required
  const deResto =
    r.item_required ||
    r.lure_required ||
    r.buddy_distance_required ||
    r.only_evolves_in_daytime ||
    r.only_evolves_in_nighttime ||
    r.only_evolves_in_full_moon ||
    r.gender_required ||
    r.no_candy_cost_if_traded ||
    r.quest_required
  return (coste.value && deCoste) || (resto.value && deResto)
})
</script>

<template>
  <ul
    v-if="hayAlgo"
    class="flex text-mini text-gray-600 dark:text-gray-300 leading-tight"
    :class="
      columna
        ? 'columna flex-col items-center gap-0.5 text-center min-w-0 max-w-full'
        : 'flex-wrap items-center justify-center gap-x-2 gap-y-0.5'
    "
  >
    <li
      v-if="coste && req.candy_required"
      class="flex items-center gap-1 whitespace-nowrap text-xs"
    >
      <span>×{{ req.candy_required }}</span>
      <base-candy-icon :type="type" class="w-3 h-3" aria-hidden="true" />
      <span class="sr-only">{{ $tc('candy', req.candy_required) }}</span>
    </li>
    <li v-if="coste && req.mega_energy_required" class="whitespace-nowrap text-xs">
      ×{{ req.mega_energy_required }} {{ $t('megaenergy') }}
    </li>

    <template v-if="resto">
      <li v-if="req.item_required" class="req">
        <img
          v-if="OBJETOS[objeto]"
          :src="OBJETOS[objeto]"
          alt=""
          class="w-3.5 h-3.5 drop-shadow icono"
        />
        <!-- Cuántos, si es más de uno: 999 monedas para Gimmighoul. -->
        <template v-if="req.item_cost">×{{ req.item_cost }}</template>
        {{
          $te(`evolutions.items.${objeto}`) ? $t(`evolutions.items.${objeto}`) : req.item_required
        }}
      </li>
      <li v-if="req.lure_required" class="req">
        <img :src="lure" alt="" class="invert dark:invert-0 w-4 h-2.5 icono" />
        {{ $t(`evolutions.lure.${req.lure_required}`) }}
      </li>
      <li v-if="req.buddy_distance_required" class="req">
        <img :src="walk" alt="" class="invert dark:invert-0 w-3.5 h-3 icono" />
        {{ $t('evolutions.buddyShort', { km: req.buddy_distance_required }) }}
      </li>
      <li v-if="req.only_evolves_in_daytime" class="req">
        <img :src="sun" alt="" class="invert dark:invert-0 w-3 h-3 icono" />
        {{ $t('evolutions.dayShort') }}
      </li>
      <li v-if="req.only_evolves_in_nighttime" class="req">
        <img :src="moon" alt="" class="invert dark:invert-0 w-3 h-3 icono" />
        {{ $t('evolutions.nightShort') }}
      </li>
      <li v-if="req.only_evolves_in_full_moon" class="req">
        <img :src="moon" alt="" class="invert dark:invert-0 w-3 h-3 icono" />
        {{ $t('evolutions.fullMoonShort') }}
      </li>
      <li v-if="req.gender_required" class="req">
        <img
          :src="req.gender_required === 'Female' ? female : male"
          alt=""
          class="invert dark:invert-0 w-3 h-3 icono"
        />
        {{ $t(`evolutions.${req.gender_required}Short`) }}
      </li>
      <!-- La misión viene redactada por el juego en los dos idiomas. -->
      <li v-if="req.quest_required" class="req">
        {{ req.quest_required[$i18n.locale] ?? req.quest_required.en }}
      </li>
      <li v-if="req.no_candy_cost_if_traded" class="req">
        <img :src="trade" alt="" class="invert dark:invert-0 w-3 h-3 icono" />
        {{ $t('evolutions.tradeLegend') }}
      </li>
    </template>
  </ul>
</template>

<style scoped>
/* En línea: icono y texto uno al lado del otro. */
.req {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}
.icono {
  flex-shrink: 0;
}
/*
 * En columna (dentro de una celda estrecha, como las de Eevee en móvil) el
 * icono va en línea con el texto, que así puede partir en varias líneas sin
 * salirse hacia la celda de al lado.
 */
.columna .req {
  display: block;
  overflow-wrap: anywhere;
}
.columna .icono {
  display: inline-block;
  vertical-align: -2px;
  margin-right: 0.25rem;
}
</style>
