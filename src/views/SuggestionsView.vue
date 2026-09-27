<script setup>
/**
 * Panel de gestión de las sugerencias (`/suggestions`).
 *
 * No está enlazado desde el menú: es para una sola persona. Aun así, lo que lo
 * protege no es que la URL no se enseñe, sino las políticas RLS de
 * `supabase/suggestions.sql`. La clave `anon` viaja en el bundle, así que
 * cualquiera puede preguntarle a Supabase por esta tabla: sin la sesión del
 * administrador, la respuesta viene vacía.
 */
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '../stores/auth'
import { STATUSES, useSuggestionsStore } from '../stores/suggestions'
import { formatDateTime } from '../utils/time'
import { useTranslate } from '../composables/useTranslate'
import {
  BaseCard,
  BaseEmptyState,
  BaseErrorMessage,
  BasePillButton,
  SpinnerComponent
} from '../components/index'

const auth = useAuthStore()
const suggestions = useSuggestionsStore()
const { isReady, isSignedIn, isBusy, email } = storeToRefs(auth)
const { items, isLoading, error, countsByStatus } = storeToRefs(suggestions)
const { t, intlLocale } = useTranslate()

const formEmail = ref('')
const formPassword = ref('')
const filter = ref('all')
/** Id de la sugerencia cuyo borrado está esperando confirmación. */
const confirming = ref(null)

const list = computed(() =>
  filter.value === 'all'
    ? items.value
    : items.value.filter((item) => item.status === filter.value)
)

const filters = computed(() => [
  { value: 'all', label: `${t('common.all')} (${items.value.length})` },
  ...STATUSES.map((status) => ({
    value: status,
    label: `${t(`suggestions.statuses.${status}`)} (${countsByStatus.value[status]})`
  }))
])

/** Colores por estado, para distinguirlos de un vistazo en una lista larga. */
const statusStyle = {
  new: 'border-blue-400 text-blue-700 dark:text-blue-300',
  doing: 'border-amber-400 text-amber-700 dark:text-amber-400',
  done: 'border-green-500 text-green-700 dark:text-green-400',
  discarded: 'border-gray-400 text-gray-600 dark:text-gray-300'
}

const fecha = (value) =>
  formatDateTime(value ? new Date(value) : null, intlLocale())

const signIn = async () => {
  if (await auth.signIn(formEmail.value, formPassword.value)) {
    formPassword.value = ''
    await suggestions.load()
  }
}

const signOut = async () => {
  await auth.signOut()
  items.value = []
}

/**
 * Las notas se guardan al salir del campo, no en cada tecla: cada guardado es
 * un viaje a Supabase.
 */
const saveNotes = (item, value) => {
  const texto = value.trim() || null
  if (texto === (item.notes ?? null)) return
  suggestions.update(item.id, { notes: texto })
}

const remove = async (id) => {
  await suggestions.remove(id)
  confirming.value = null
}

onMounted(async () => {
  await auth.init()
  if (auth.isSignedIn) await suggestions.load()
})
</script>

<template>
  <section class="text-gray-800 dark:text-gray-200">
    <h1 class="text-xl font-bold mb-4">{{ $t('suggestions.panel') }}</h1>

    <spinner-component v-if="!isReady" />

    <!-- Sin sesión: solo el formulario. El usuario se crea a mano en Supabase
         (Authentication > Users); aquí no hay registro a propósito. -->
    <base-card v-else-if="!isSignedIn" class="max-w-sm">
      <form @submit.prevent="signIn">
        <label for="admin-email" class="block text-sm font-medium mb-1">
          {{ $t('suggestions.email') }}
        </label>
        <input
          id="admin-email"
          v-model="formEmail"
          type="email"
          autocomplete="username"
          required
          class="campo mb-4 shadow-md"
        />

        <label for="admin-password" class="block text-sm font-medium mb-1">
          {{ $t('suggestions.password') }}
        </label>
        <input
          id="admin-password"
          v-model="formPassword"
          type="password"
          autocomplete="current-password"
          required
          class="campo mb-4 shadow-md"
        />

        <base-error-message v-if="auth.error" class="mb-4" :message="$t('suggestions.signInError')" />

        <button
          type="submit"
          :disabled="isBusy"
          class="px-4 py-2 text-sm rounded-xl border border-gray-500 shadow-md bg-gray-500 dark:bg-gray-600 text-white transition-colors hover:bg-gray-600 hover:dark:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ $t(isBusy ? 'suggestions.signingIn' : 'suggestions.signIn') }}
        </button>
      </form>
    </base-card>

    <template v-else>
      <div class="flex flex-wrap items-center gap-3 mb-4">
        <span class="text-mini text-gray-600 dark:text-gray-300">{{ email }}</span>
        <base-pill-button class="ml-auto" @click="suggestions.load()">
          {{ $t('common.update') }}
        </base-pill-button>
        <base-pill-button @click="signOut">{{ $t('suggestions.signOut') }}</base-pill-button>
      </div>

      <div class="flex flex-wrap gap-2 mb-4">
        <base-pill-button
          v-for="option in filters"
          :key="option.value"
          :active="filter === option.value"
          @click="filter = option.value"
        >
          {{ option.label }}
        </base-pill-button>
      </div>

      <spinner-component v-if="isLoading" />
      <base-error-message v-else-if="error" :message="$t('common.error')" :detail="error" />
      <base-empty-state v-else-if="!list.length" :message="$t('suggestions.none')" />

      <ul v-else class="grid gap-3">
        <li v-for="item in list" :key="item.id">
          <base-card>
            <div class="flex flex-wrap items-center gap-2 mb-2">
              <span class="px-2 py-0.5 text-mini rounded-xl border border-gray-400">
                {{ $t(`suggestions.categories.${item.category}`) }}
              </span>
              <span
                class="px-2 py-0.5 text-mini rounded-xl border font-semibold"
                :class="statusStyle[item.status]"
              >
                {{ $t(`suggestions.statuses.${item.status}`) }}
              </span>
              <span class="text-mini text-gray-600 dark:text-gray-300 ml-auto">
                {{ fecha(item.created_at) }}
              </span>
            </div>

            <!-- whitespace-pre-line: la gente separa en párrafos y esos saltos
                 son parte de lo que ha escrito. -->
            <p class="text-sm whitespace-pre-line break-words mb-3">{{ item.message }}</p>

            <p class="text-mini text-gray-600 dark:text-gray-300 mb-3">
              <a
                v-if="item.contact"
                :href="`mailto:${item.contact}`"
                class="underline break-all mr-3"
              >
                {{ item.contact }}
              </a>
              <span v-if="item.page" class="mr-3">{{ item.page }}</span>
              <span v-if="item.app_version">v{{ item.app_version }}</span>
            </p>

            <label :for="`notas-${item.id}`" class="block text-mini font-medium mb-1">
              {{ $t('suggestions.notes') }}
            </label>
            <textarea
              :id="`notas-${item.id}`"
              :value="item.notes ?? ''"
              rows="2"
              class="campo mb-3"
              :placeholder="$t('suggestions.notesPlaceholder')"
              @blur="saveNotes(item, $event.target.value)"
            ></textarea>

            <div class="flex flex-wrap gap-2">
              <base-pill-button
                v-for="status in STATUSES"
                :key="status"
                :active="item.status === status"
                @click="suggestions.setStatus(item.id, status)"
              >
                {{ $t(`suggestions.statuses.${status}`) }}
              </base-pill-button>

              <!-- Borrar pide confirmación en el propio botón: no hay papelera
                   donde recuperarlo. -->
              <button
                type="button"
                class="ml-auto px-3 py-1.5 text-xs rounded-xl border shadow-md transition-colors"
                :class="
                  confirming === item.id
                    ? 'bg-red-600 border-red-600 text-white'
                    : 'bg-white dark:bg-gray-900 border-red-400 text-red-700 dark:text-red-400 hover:bg-red-50 hover:dark:bg-red-900/30'
                "
                @click="confirming === item.id ? remove(item.id) : (confirming = item.id)"
                @blur="confirming === item.id ? (confirming = null) : null"
              >
                {{ $t(confirming === item.id ? 'suggestions.confirmDelete' : 'suggestions.delete') }}
              </button>
            </div>
          </base-card>
        </li>
      </ul>
    </template>
  </section>
</template>
