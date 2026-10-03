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
 *
 * Con `buscable`, la lista lleva arriba un campo para escribir y localizar la
 * opción (el tipo en el Top, que son diecinueve). Entonces el foco sí pasa al
 * campo mientras está abierta, y vuelve al botón al cerrar. Escribir con el
 * desplegable cerrado lo abre con esa letra ya puesta.
 *
 * Cada opción puede traer `description`: una línea debajo, solo con la lista
 * abierta, que es cuando se está eligiendo (qué significa cada orden del Top).
 *
 * Con `multiple`, el valor es una lista y cada opción se marca o desmarca sin
 * cerrar, con el mismo ✓ de la elegida. Cerrado enseña lo marcado como
 * etiquetas y abajo lleva «Marcar todo» y «Quitar todo» («Incluir» del Top).
 */
import { computed, nextTick, ref, useId, watch } from 'vue'
import BaseChevron from './BaseChevron.vue'
import useDetectOutsideClick from '../../composables/useDetectOutsideClick'

const props = defineProps({
  modelValue: { type: [String, Number, Array], default: '' },
  options: { type: Array, required: true },
  label: { type: String, default: '' },
  /** Para cuando no hay etiqueta visible. */
  ariaLabel: { type: String, default: null },
  /** Más bajo en escritorio (lg), para filas de filtros donde sobra altura. */
  compacto: Boolean,
  /** Con un campo para escribir y filtrar las opciones. */
  buscable: Boolean,
  /** Varias a la vez: modelValue es la lista de valores marcados. */
  multiple: Boolean,
  /** Lo que dice cerrado cuando no hay nada marcado (con `multiple`). */
  vacio: { type: String, default: '' },
  /**
   * La lista se abre en línea, empujando lo de debajo, en vez de flotar. Para
   * cuando va dentro de un panel con scroll propio (los filtros de la
   * Pokédex en móvil): flotando, el panel la recortaba y no crecía.
   */
  enLinea: Boolean
})

const emit = defineEmits(['update:modelValue'])

const root = ref(null)
const list = ref(null)
const boton = ref(null)
const buscador = ref(null)
const isOpen = ref(false)
// Posición dentro de las opciones visibles (las que pasan el filtro).
const activeIndex = ref(-1)
const query = ref('')

// Sin tildes ni mayúsculas: «elec» encuentra «Eléctrico».
const normalizar = (texto) =>
  String(texto)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

const visibles = computed(() => {
  const q = normalizar(query.value.trim())
  return props.options.filter((option) => !q || normalizar(option.label).includes(q))
})

const uid = useId()
const listId = `lista-${uid}`
const optionId = (index) => `opcion-${uid}-${index}`

const elegida = (value) =>
  props.multiple ? (props.modelValue ?? []).includes(value) : value === props.modelValue

const selectedIndex = computed(() => visibles.value.findIndex((option) => elegida(option.value)))

const selectedLabel = computed(() => {
  const opcion = props.options.find((option) => option.value === props.modelValue)
  return opcion?.label ?? props.options[0]?.label ?? ''
})

/** Con `multiple`: las marcadas, en el orden de la lista. */
const marcadas = computed(() => props.options.filter((option) => elegida(option.value)))

const open = async (inicial = '') => {
  query.value = inicial
  isOpen.value = true
  activeIndex.value = selectedIndex.value >= 0 ? selectedIndex.value : 0
  await nextTick()
  if (props.buscable) buscador.value?.focus()
  scrollActiveIntoView()
  // En línea, el panel crece hacia abajo: que se vea la lista entera.
  if (props.enLinea) list.value?.parentElement?.scrollIntoView?.({ block: 'nearest' })
}

const close = ({ devolverFoco = false } = {}) => {
  isOpen.value = false
  activeIndex.value = -1
  query.value = ''
  if (devolverFoco) boton.value?.focus()
}

const pick = (index) => {
  const option = visibles.value[index]
  if (!option) return
  if (props.multiple) {
    // Se queda abierta: se suelen tocar varias seguidas.
    const lista = props.modelValue ?? []
    emit(
      'update:modelValue',
      elegida(option.value)
        ? lista.filter((v) => v !== option.value)
        : props.options.map((o) => o.value).filter((v) => v === option.value || lista.includes(v))
    )
    return
  }
  emit('update:modelValue', option.value)
  close({ devolverFoco: props.buscable })
}

const marcarTodo = () =>
  emit(
    'update:modelValue',
    props.options.map((option) => option.value)
  )
const quitarTodo = () => emit('update:modelValue', [])

const move = (delta) => {
  if (!visibles.value.length) return
  const next = activeIndex.value + delta
  activeIndex.value = Math.min(Math.max(next, 0), visibles.value.length - 1)
  scrollActiveIntoView()
}

// Al escribir, la opción activa pasa a ser la primera que queda. Al abrir con
// una letra ya puesta también, en vez de la elegida (que quizá no aparece).
watch(query, () => {
  activeIndex.value = visibles.value.length ? 0 : -1
})

/** Sin esto, al bajar con el teclado la opción activa se sale de la caja. */
const scrollActiveIntoView = () => {
  const item = list.value?.children?.[activeIndex.value]
  item?.scrollIntoView?.({ block: 'nearest' })
}

const onKeydown = (event) => {
  const { key } = event

  if (!isOpen.value) {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(key)) {
      event.preventDefault()
      open()
    } else if (
      props.buscable &&
      key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      // Escribir con el desplegable cerrado lo abre con esa letra ya puesta.
      event.preventDefault()
      open(key)
    }
    return
  }

  const enBuscador = event.target === buscador.value
  const acciones = {
    ArrowDown: () => move(1),
    ArrowUp: () => move(-1),
    Home: () => {
      activeIndex.value = 0
      scrollActiveIntoView()
    },
    End: () => {
      activeIndex.value = visibles.value.length - 1
      scrollActiveIntoView()
    },
    Enter: () => pick(activeIndex.value),
    Escape: () => close({ devolverFoco: props.buscable }),
    Tab: () => close()
  }
  // En el campo de búsqueda el espacio se escribe e Inicio/Fin mueven el cursor.
  if (enBuscador) {
    delete acciones.Home
    delete acciones.End
  } else {
    acciones[' '] = () => pick(activeIndex.value)
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
      ref="boton"
      type="button"
      :class="compacto ? 'lg:h-9 lg:text-xs' : ''"
      class="w-full h-11 flex items-center gap-2 pl-3 pr-3 cursor-pointer border border-gray-400 rounded-xl shadow-md bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-150 hover:dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-600 dark:focus:ring-blue-300"
      role="combobox"
      :aria-expanded="isOpen"
      :aria-controls="listId"
      :aria-label="ariaLabel ?? undefined"
      :aria-labelledby="label ? `etiqueta-${uid}` : undefined"
      :aria-activedescendant="
        isOpen && !buscable && activeIndex >= 0 ? optionId(activeIndex) : undefined
      "
      @click="isOpen ? close() : open()"
      @keydown="onKeydown"
    >
      <span v-if="!multiple" class="flex-1 min-w-0 truncate text-left">{{ selectedLabel }}</span>
      <span v-else class="flex-1 min-w-0 flex gap-1 overflow-hidden text-left">
        <span
          v-for="option in marcadas"
          :key="option.value"
          class="shrink-0 px-2 py-0.5 rounded-full bg-gray-150 dark:bg-gray-800 text-mini font-semibold"
          >{{ option.label }}</span
        >
        <span v-if="!marcadas.length" class="truncate text-gray-600 dark:text-gray-300">{{
          vacio
        }}</span>
      </span>
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
    <div
      v-if="isOpen"
      :class="enLinea ? 'relative' : 'absolute z-40'"
      class="mt-1 w-full border border-gray-400 rounded-xl shadow-xl bg-white dark:bg-gray-900 overflow-hidden"
    >
      <div v-if="buscable" class="p-2 border-b border-gray-300 dark:border-gray-700">
        <input
          ref="buscador"
          v-model="query"
          type="text"
          role="searchbox"
          autocomplete="off"
          :placeholder="(label || ariaLabel || '') + '…'"
          :aria-label="label || ariaLabel || undefined"
          :aria-controls="listId"
          :aria-activedescendant="activeIndex >= 0 ? optionId(activeIndex) : undefined"
          class="campo !py-1.5"
          @keydown="onKeydown"
        />
      </div>
      <ul
        :id="listId"
        ref="list"
        role="listbox"
        :aria-multiselectable="multiple || undefined"
        class="max-h-72 overflow-y-auto py-1"
      >
        <li
          v-for="(option, index) in visibles"
          :id="optionId(index)"
          :key="option.value"
          role="option"
          :aria-selected="elegida(option.value)"
          class="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer"
          :class="
            /*
              La elegida lleva su propio fondo, más fuerte que el del ratón, y
              un ✓. Solo con negrita no se distinguía en modo oscuro, y el fondo
              de la activa se iba con el ratón. Si además es la activa, un
              punto más, para que el teclado se note también al pasar por ella.
            */
            elegida(option.value)
              ? [
                  'font-bold text-gray-900 dark:text-gray-50',
                  index === activeIndex
                    ? 'bg-gray-400/60 dark:bg-gray-600'
                    : 'bg-gray-300 dark:bg-gray-700'
                ]
              : [
                  'text-gray-800 dark:text-gray-200',
                  index === activeIndex ? 'bg-gray-150 dark:bg-gray-800' : ''
                ]
          "
          @mousedown.prevent
          @click="pick(index)"
          @mousemove="activeIndex = index"
        >
          <span class="flex-1 min-w-0">
            {{ option.label }}
            <span
              v-if="option.description"
              class="block mt-0.5 text-mini font-normal leading-snug text-gray-600 dark:text-gray-300"
              >{{ option.description }}</span
            >
          </span>
          <svg
            v-if="elegida(option.value)"
            aria-hidden="true"
            viewBox="0 0 24 24"
            class="w-4 h-4 shrink-0"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M5 12l5 5L20 7" />
          </svg>
        </li>
        <li
          v-if="!visibles.length"
          role="presentation"
          class="px-3 py-2 text-sm text-gray-600 dark:text-gray-300"
        >
          {{ $t('common.empty') }}
        </li>
      </ul>
      <!-- mousedown.prevent: el foco se queda en el botón y Escape sigue cerrando. -->
      <div
        v-if="multiple"
        class="flex justify-between gap-2 px-3 py-2 border-t border-gray-300 dark:border-gray-700 text-xs"
      >
        <button
          type="button"
          class="underline underline-offset-4 text-gray-700 dark:text-gray-200"
          @mousedown.prevent
          @click="marcarTodo"
        >
          {{ $t('common.selectAll') }}
        </button>
        <button
          type="button"
          class="underline underline-offset-4 text-gray-700 dark:text-gray-200"
          @mousedown.prevent
          @click="quitarTodo"
        >
          {{ $t('common.clearAll') }}
        </button>
      </div>
    </div>
  </div>
</template>
