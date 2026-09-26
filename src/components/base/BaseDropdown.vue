<script setup>
/**
 * Desplegable propio, sin `<select>` nativo.
 *
 * El nativo lo pinta cada sistema a su manera: en Android sale un diálogo a
 * pantalla completa, en iOS una rueda abajo y en escritorio cambia según el
 * navegador. Aquí se ve igual en todas partes y hereda el estilo de la app.
 *
 * Lo que se pierde del nativo (el selector del sistema en móvil, que no ocupa
 * sitio) se compensa cerrando al tocar fuera y con la lista acotada en alto.
 *
 * Accesibilidad: es el patrón de listbox con `aria-activedescendant`, así que
 * el foco no se mueve del botón y el lector de pantalla va cantando la opción
 * activa. Funciona con flechas, Inicio/Fin, Enter, Espacio y Escape.
 */
import { computed, nextTick, ref } from 'vue'
import BaseChevron from './BaseChevron.vue'
import useDetectOutsideClick from '../../composables/useDetectOutsideClick'

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  options: { type: Array, required: true },
  label: { type: String, default: '' },
  /** Para cuando no hay etiqueta visible. */
  ariaLabel: { type: String, default: null }
})

const emit = defineEmits(['update:modelValue'])

const root = ref(null)
const list = ref(null)
const isOpen = ref(false)
const activeIndex = ref(-1)

const uid = Math.random().toString(36).slice(2, 8)
const listId = `lista-${uid}`
const optionId = (index) => `opcion-${uid}-${index}`

const selectedIndex = computed(() =>
  props.options.findIndex((option) => option.value === props.modelValue)
)

const selectedLabel = computed(
  () => props.options[selectedIndex.value]?.label ?? props.options[0]?.label ?? ''
)

const open = async () => {
  isOpen.value = true
  activeIndex.value = selectedIndex.value >= 0 ? selectedIndex.value : 0
  await nextTick()
  scrollActiveIntoView()
}

const close = () => {
  isOpen.value = false
  activeIndex.value = -1
}

const pick = (index) => {
  const option = props.options[index]
  if (!option) return
  emit('update:modelValue', option.value)
  close()
}

const move = (delta) => {
  if (!props.options.length) return
  const next = activeIndex.value + delta
  activeIndex.value = Math.min(Math.max(next, 0), props.options.length - 1)
  scrollActiveIntoView()
}

/** Sin esto, al bajar con el teclado la opción activa se sale de la caja. */
const scrollActiveIntoView = () => {
  const item = list.value?.children?.[activeIndex.value]
  item?.scrollIntoView({ block: 'nearest' })
}

const onKeydown = (event) => {
  const { key } = event

  if (!isOpen.value) {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(key)) {
      event.preventDefault()
      open()
    }
    return
  }

  const acciones = {
    ArrowDown: () => move(1),
    ArrowUp: () => move(-1),
    Home: () => { activeIndex.value = 0; scrollActiveIntoView() },
    End: () => { activeIndex.value = props.options.length - 1; scrollActiveIntoView() },
    Enter: () => pick(activeIndex.value),
    ' ': () => pick(activeIndex.value),
    Escape: () => close(),
    Tab: () => close()
  }

  const accion = acciones[key]
  if (!accion) return
  // Tab tiene que seguir moviendo el foco: solo se cierra la lista.
  if (key !== 'Tab') event.preventDefault()
  accion()
}

useDetectOutsideClick(root, () => close())
</script>

<template>
  <div ref="root" class="relative min-w-0">
    <span
      v-if="label"
      :id="`etiqueta-${uid}`"
      class="block mb-1 text-mini uppercase tracking-wider text-gray-600 dark:text-gray-300"
    >
      {{ label }}
    </span>

    <button
      type="button"
      class="w-full h-11 flex items-center gap-2 pl-3 pr-3 cursor-pointer border border-gray-400 rounded-xl shadow-md bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-150 hover:dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-300"
      role="combobox"
      :aria-expanded="isOpen"
      :aria-controls="listId"
      :aria-label="ariaLabel ?? undefined"
      :aria-labelledby="label ? `etiqueta-${uid}` : undefined"
      :aria-activedescendant="isOpen && activeIndex >= 0 ? optionId(activeIndex) : undefined"
      @click="isOpen ? close() : open()"
      @keydown="onKeydown"
    >
      <span class="flex-1 min-w-0 truncate text-left">{{ selectedLabel }}</span>
      <!-- Como hijo del flex y no en absoluto: así siempre respeta el padding. -->
      <base-chevron :open="isOpen" size="w-3 h-3" class="text-gray-600 dark:text-gray-300" />
    </button>

    <!--
      Sin <transition> a propósito. Al elegir una opción la vista se recompone
      entera, el transitionend no llegaba y la lista se quedaba en el DOM con
      opacidad 0 tragándose los clics de lo que hubiera debajo. Un desplegable
      que aparece al instante es además lo que hace el nativo; lo que sí se
      anima es el chevron.
    -->
    <ul
        v-if="isOpen"
        :id="listId"
        ref="list"
        role="listbox"
        class="absolute z-40 mt-1 w-full max-h-60 overflow-y-auto py-1 border border-gray-400 rounded-xl shadow-xl bg-white dark:bg-gray-900"
      >
        <li
          v-for="(option, index) in options"
          :id="optionId(index)"
          :key="option.value"
          role="option"
          :aria-selected="option.value === modelValue"
          class="px-3 py-2 text-sm cursor-pointer text-gray-800 dark:text-gray-200"
          :class="[
            index === activeIndex ? 'bg-gray-150 dark:bg-gray-800' : '',
            option.value === modelValue ? 'font-bold' : ''
          ]"
          @click="pick(index)"
          @mousemove="activeIndex = index"
        >
          {{ option.label }}
        </li>
      </ul>
  </div>
</template>
