<script setup>
/**
 * Botón de sugerencias del menú lateral, con su formulario.
 *
 * El diálogo es BaseModal, como el detalle de un evento o la galería de
 * formas: misma cabecera, mismo cierre (✕, Escape, pulsar fuera, «atrás») y
 * va en `Teleport`, que hace falta porque el botón vive dentro del cajón del
 * menú, que se cierra al abrirlo.
 */
import { computed, nextTick, ref } from 'vue'
import { useRoute } from 'vue-router'
import { CATEGORIES, MAX_MESSAGE, useSuggestionsStore } from '../../stores/suggestions'
import { useTranslate } from '../../composables/useTranslate'
import BaseIcon from '../base/BaseIcon.vue'
import BasePillButton from '../base/BasePillButton.vue'
import BaseModal from '../base/BaseModal.vue'
import BaseErrorMessage from '../base/BaseErrorMessage.vue'

// `open` lo escucha el menú para cerrarse y dejar el diálogo a la vista;
// `close` para recoger el foco cuando este botón ya no puede recibirlo.
const emit = defineEmits(['open', 'close'])

// La plantilla tiene dos raíces (el botón y el diálogo), así que Vue no
// sabe a cuál llevar las clases que le pasen de fuera. Se le dice a mano: van
// al botón, que es lo único que ocupa sitio donde se coloque el componente.
defineOptions({ inheritAttrs: false })

const { t } = useTranslate()
const route = useRoute()
const suggestions = useSuggestionsStore()

const isOpen = ref(false)
const isSent = ref(false)
const category = ref('idea')
const message = ref('')
const contact = ref('')
const errorKey = ref(null)
const errorSeconds = ref(0)

const trigger = ref(null)

const restante = computed(() => MAX_MESSAGE - message.value.trim().length)

const errorText = computed(() => {
  if (!errorKey.value) return null
  return errorKey.value === 'cooldown'
    ? t('suggestions.errors.cooldown', { seconds: errorSeconds.value })
    : t(`suggestions.errors.${errorKey.value}`)
})

const open = () => {
  isOpen.value = true
  isSent.value = false
  errorKey.value = null
  emit('open')
}

/**
 * BaseModal devuelve el foco al botón. Pero al abrir el diálogo el menú se
 * cierra, y un menú cerrado es `inert`: el foco no entra ahí. Cuando pasa,
 * quien lo recoloca es el menú.
 */
const close = async () => {
  isOpen.value = false
  await nextTick()
  if (trigger.value?.closest('[inert]')) emit('close')
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

// Enviar con Ctrl/Cmd+Enter: en un textarea, Enter a secas hace falta para
// escribir párrafos.
const onKeydown = (event) => {
  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && !isSent.value) submit()
}
</script>

<template>
  <button
    ref="trigger"
    type="button"
    v-bind="$attrs"
    class="flex items-center gap-2 px-2.5 md:px-3 py-2 rounded-xl border border-gray-400 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 shadow-md transition-colors hover:bg-gray-150 hover:dark:bg-gray-700"
    @click="open"
  >
    <base-icon
      width="18"
      height="18"
      :stroke-width="1.5"
      class-path="stroke-gray-600 dark:stroke-gray-100"
      d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
    />
    <!-- text-xs en móvil: comparte fila con el botón de modo oscuro. -->
    <span class="text-xs md:text-sm whitespace-nowrap">{{ $t('suggestions.button') }}</span>
  </button>

  <base-modal :open="isOpen" :title="$t('suggestions.title')" enfocar="#mensaje-sugerencia" @close="close">
    <div @keydown="onKeydown">
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

          <base-error-message v-if="errorText" :message="errorText" class="mb-4 text-gray-800 dark:text-gray-200" />

          <div class="flex justify-end gap-2">
            <base-pill-button type="button" @click="close()">
              {{ $t('suggestions.cancel') }}
            </base-pill-button>
            <button
              type="submit"
              :disabled="suggestions.isSending"
              class="zona-tactil px-4 py-1.5 text-xs rounded-xl border border-gray-500 shadow-md bg-gray-500 dark:bg-gray-600 text-white transition-colors hover:bg-gray-600 hover:dark:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ $t(suggestions.isSending ? 'suggestions.sending' : 'suggestions.submit') }}
            </button>
          </div>
        </form>
    </div>
  </base-modal>
</template>
