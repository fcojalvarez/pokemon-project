<script setup>
/**
 * Botón de sugerencias del menú lateral, con su formulario.
 *
 * El diálogo va en `Teleport` porque el botón vive dentro del cajón del menú,
 * que se cierra al abrirlo: si el formulario colgara de ahí, se iría con él.
 */
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { CATEGORIES, MAX_MESSAGE, useSuggestionsStore } from '../../stores/suggestions'
import { useTranslate } from '../../composables/useTranslate'
import { useInertApp } from '../../composables/useInertApp'
import BaseIcon from '../base/BaseIcon.vue'
import BasePillButton from '../base/BasePillButton.vue'

// `open` lo escucha el menú para cerrarse y dejar el diálogo a la vista;
// `close` para recoger el foco cuando este botón ya no puede recibirlo.
const emit = defineEmits(['open', 'close'])

// La plantilla tiene dos raíces (el botón y el `Teleport`), así que Vue no
// sabe a cuál llevar las clases que le pasen de fuera. Se le dice a mano: van
// al botón, que es lo único que ocupa sitio donde se coloque el componente.
defineOptions({ inheritAttrs: false })

const { t } = useTranslate()
const route = useRoute()
const suggestions = useSuggestionsStore()

const isOpen = ref(false)
const { bloquear, liberar } = useInertApp()
onUnmounted(liberar)
const isSent = ref(false)
const category = ref('idea')
const message = ref('')
const contact = ref('')
const errorKey = ref(null)
const errorSeconds = ref(0)

const trigger = ref(null)
const campoMensaje = ref(null)

const restante = computed(() => MAX_MESSAGE - message.value.trim().length)

const errorText = computed(() => {
  if (!errorKey.value) return null
  return errorKey.value === 'cooldown'
    ? t('suggestions.errors.cooldown', { seconds: errorSeconds.value })
    : t(`suggestions.errors.${errorKey.value}`)
})

const open = async () => {
  isOpen.value = true
  bloquear()
  isSent.value = false
  errorKey.value = null
  emit('open')
  document.body.style.overflow = 'hidden'
  await nextTick()
  campoMensaje.value?.focus()
}

const close = ({ restoreFocus = true } = {}) => {
  isOpen.value = false
  liberar()
  document.body.style.overflow = ''
  if (!restoreFocus) return

  // Al abrir el diálogo el menú se cierra, y un menú cerrado es `inert`: el
  // foco no entra ahí. Cuando pasa, quien lo recoloca es el menú.
  if (trigger.value && !trigger.value.closest('[inert]')) trigger.value.focus()
  else emit('close')
}

const reset = () => {
  message.value = ''
  contact.value = ''
  category.value = 'idea'
  errorKey.value = null
}

const submit = async () => {
  errorKey.value = null
  const resultado = await suggestions.send({
    category: category.value,
    message: message.value,
    contact: contact.value,
    page: route.fullPath
  })

  if (!resultado.ok) {
    errorKey.value = resultado.errorKey
    errorSeconds.value = resultado.seconds ?? 0
    return
  }

  isSent.value = true
  reset()
}

const onKeydown = (event) => {
  if (event.key === 'Escape') close()
  // Enviar con Ctrl/Cmd+Enter: en un textarea, Enter a secas hace falta para
  // escribir párrafos.
  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && !isSent.value) submit()
}

// Si se navega con el diálogo abierto (por ejemplo desde el historial del
// navegador), se cierra para no dejar la página bloqueada con el scroll fijo.
watch(
  () => route.path,
  () => {
    if (isOpen.value) close({ restoreFocus: false })
  }
)
</script>

<template>
  <button
    ref="trigger"
    type="button"
    v-bind="$attrs"
    class="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-400 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 shadow-md transition-colors hover:bg-gray-150 hover:dark:bg-gray-700"
    @click="open"
  >
    <base-icon
      width="18"
      height="18"
      :stroke-width="1.5"
      class-path="stroke-gray-600 dark:stroke-gray-100"
      d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
    />
    <span class="text-sm">{{ $t('suggestions.button') }}</span>
  </button>

  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[60] bg-gray-900/60 flex items-end sm:items-center justify-center sm:p-4"
      @click.self="close()"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-sugerencia"
        class="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto bg-gray-100 dark:bg-gray-800 border border-gray-400 dark:border-gray-600 rounded-t-2xl sm:rounded-2xl shadow-md"
        @keydown="onKeydown"
      >
        <div class="flex items-center gap-3 px-4 py-4 border-b border-gray-300 dark:border-gray-600">
          <h2 id="titulo-sugerencia" class="font-bold text-gray-800 dark:text-gray-200">
            {{ $t('suggestions.title') }}
          </h2>
          <button
            type="button"
            class="ml-auto w-9 h-9 rounded-xl border border-gray-400 bg-white dark:bg-gray-900 hover:bg-gray-150 hover:dark:bg-gray-700 text-gray-600 dark:text-gray-200"
            :aria-label="$t('suggestions.close')"
            @click="close()"
          >
            ✕
          </button>
        </div>

        <!-- Enviada: el formulario se cambia entero por el acuse, para que no
             quede duda de si hace falta volver a darle. -->
        <div v-if="isSent" class="p-6 text-center">
          <p class="text-sm text-gray-800 dark:text-gray-200 mb-4">
            {{ $t('suggestions.thanks') }}
          </p>
          <div class="flex flex-wrap justify-center gap-2">
            <base-pill-button @click="isSent = false">
              {{ $t('suggestions.another') }}
            </base-pill-button>
            <base-pill-button @click="close()">
              {{ $t('suggestions.close') }}
            </base-pill-button>
          </div>
        </div>

        <form v-else class="p-4" @submit.prevent="submit">
          <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
            {{ $t('suggestions.intro') }}
          </p>

          <fieldset class="mb-4">
            <legend class="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
              {{ $t('suggestions.category') }}
            </legend>
            <div class="flex flex-wrap gap-2">
              <base-pill-button
                v-for="name in CATEGORIES"
                :key="name"
                :active="category === name"
                @click="category = name"
              >
                {{ $t(`suggestions.categories.${name}`) }}
              </base-pill-button>
            </div>
          </fieldset>

          <label
            for="mensaje-sugerencia"
            class="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1"
          >
            {{ $t('suggestions.message') }}
          </label>
          <textarea
            id="mensaje-sugerencia"
            ref="campoMensaje"
            v-model="message"
            rows="5"
            :maxlength="MAX_MESSAGE"
            :placeholder="$t('suggestions.messagePlaceholder')"
            class="campo shadow-md"
          ></textarea>
          <p class="text-mini text-gray-600 dark:text-gray-300 mt-1 mb-4 text-right">
            {{ $t('suggestions.remaining', { count: restante }) }}
          </p>

          <label
            for="contacto-sugerencia"
            class="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1"
          >
            {{ $t('suggestions.contact') }}
          </label>
          <input
            id="contacto-sugerencia"
            v-model="contact"
            type="email"
            autocomplete="email"
            :placeholder="$t('suggestions.contactPlaceholder')"
            class="campo shadow-md"
          />
          <p class="text-mini text-gray-600 dark:text-gray-300 mt-1 mb-4">
            {{ $t('suggestions.contactHint') }}
          </p>

          <p
            v-if="errorText"
            role="alert"
            class="p-3 mb-4 rounded-xl border border-red-400 bg-red-50 dark:bg-red-900/30 text-sm text-gray-800 dark:text-gray-200"
          >
            {{ errorText }}
          </p>

          <div class="flex justify-end gap-2">
            <base-pill-button type="button" @click="close()">
              {{ $t('suggestions.cancel') }}
            </base-pill-button>
            <button
              type="submit"
              :disabled="suggestions.isSending"
              class="px-4 py-1.5 text-xs rounded-xl border border-gray-500 shadow-md bg-gray-500 dark:bg-gray-600 text-white transition-colors hover:bg-gray-600 hover:dark:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ $t(suggestions.isSending ? 'suggestions.sending' : 'suggestions.submit') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>
