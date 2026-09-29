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
import { computed, nextTick, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '../stores/auth'
import { STATUSES, useSuggestionsStore } from '../stores/suggestions'
import { formatDateTime } from '../utils/time'
import { useTranslate } from '../composables/useTranslate'
import BaseCard from '../components/base/BaseCard.vue'
import BaseDropdown from '../components/base/BaseDropdown.vue'
import BaseEmptyState from '../components/base/BaseEmptyState.vue'
import BaseErrorMessage from '../components/base/BaseErrorMessage.vue'
import BaseIcon from '../components/base/BaseIcon.vue'
import SpinnerComponent from '../components/SpinnerComponent.vue'

const auth = useAuthStore()
const suggestions = useSuggestionsStore()
const { isReady, isSignedIn, isBusy, email } = storeToRefs(auth)
const { items, isLoading, error, countsByStatus, pendingCount } = storeToRefs(suggestions)
const { t, intlLocale } = useTranslate()

const formEmail = ref('')
const formPassword = ref('')
const filter = ref('all')
/** Id de la sugerencia cuyo borrado está esperando confirmación. */
const confirming = ref(null)
/** Las sugerencias sin notas a las que se les ha abierto el campo. */
const notasAbiertas = ref(new Set())

const list = computed(() =>
  filter.value === 'all'
    ? items.value
    : items.value.filter((item) => item.status === filter.value)
)

/**
 * El filtro y el estado de cada tarjeta son desplegables y no filas de
 * botones: con cinco filtros y cuatro estados por tarjeta, la vista era un
 * mar de botones y lo que importa, el mensaje, se perdía.
 */
const filterOptions = computed(() => [
  { value: 'all', label: `${t('common.all')} (${items.value.length})` },
  ...STATUSES.map((status) => ({
    value: status,
    label: `${t(`suggestions.statuses.${status}`)} (${countsByStatus.value[status]})`
  }))
])

const statusOptions = computed(() =>
  STATUSES.map((status) => ({ value: status, label: t(`suggestions.statuses.${status}`) }))
)

/**
 * Una franja de color por estado, para distinguirlos de un vistazo. Con `!`:
 * sin él manda el `dark:border-gray-700` de BaseCard y la franja sale gris.
 */
const statusAccent = {
  new: '!border-l-blue-500',
  doing: '!border-l-amber-400',
  done: '!border-l-green-500',
  discarded: '!border-l-gray-400 dark:!border-l-gray-500'
}

const conNotas = (item) => Boolean(item.notes) || notasAbiertas.value.has(item.id)
const abrirNotas = async (id) => {
  notasAbiertas.value = new Set(notasAbiertas.value).add(id)
  // El botón desaparece al abrirse: el foco va al campo, no se pierde.
  await nextTick()
  document.getElementById(`notas-${id}`)?.focus()
}

const ICONO_ACTUALIZAR =
  'M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99'
const ICONO_SALIR =
  'M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H21'
const ICONO_BORRAR =
  'm14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0'

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
  suggestions.reset()
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
    <!-- Salir, arriba a la izquierda: donde en la ficha está «Volver», que
         aquí queda libre. -->
    <button
      v-if="isSignedIn"
      type="button"
      class="mb-3 h-9 px-3 flex items-center gap-1.5 rounded-xl border border-gray-400 dark:border-gray-600 shadow-md bg-white dark:bg-gray-900 text-xs text-gray-800 dark:text-gray-200 hover:bg-gray-150 hover:dark:bg-gray-800"
      @click="signOut"
    >
      <base-icon :d="ICONO_SALIR" width="16" height="16" color="currentColor" stroke-linecap="round" stroke-linejoin="round" />
      {{ $t('suggestions.signOut') }}
    </button>

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
      <!-- Quién está dentro y cuántas quedan por mirar; las acciones de la
           sesión, discretas a un lado. -->
      <div class="flex items-start gap-3 -mt-2 mb-5">
        <p class="flex-1 min-w-0 text-mini text-gray-600 dark:text-gray-300 truncate">
          {{ email }}
          <template v-if="pendingCount">
            · <strong class="font-semibold text-blue-700 dark:text-blue-300">
              {{ pendingCount }} {{ $t('suggestions.statuses.new').toLowerCase() }}
            </strong>
          </template>
        </p>
        <button
          type="button"
          class="shrink-0 -my-1.5 p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 hover:dark:bg-gray-800 disabled:opacity-50"
          :aria-label="$t('common.update')"
          :title="$t('common.update')"
          :disabled="isLoading"
          @click="suggestions.load()"
        >
          <base-icon :d="ICONO_ACTUALIZAR" width="18" height="18" color="currentColor" stroke-linecap="round" stroke-linejoin="round" />
        </button>
      </div>

      <base-dropdown
        v-model="filter"
        :label="$t('suggestions.status')"
        :options="filterOptions"
        class="w-full max-w-[14rem] mb-4"
      />

      <spinner-component v-if="isLoading" />
      <base-error-message v-else-if="error" :message="$t('common.error')" :detail="error" />
      <base-empty-state v-else-if="!list.length" :message="$t('suggestions.none')" />

      <ul v-else class="grid gap-3">
        <li v-for="item in list" :key="item.id">
          <base-card
            class="border-l-4"
            :class="[statusAccent[item.status], item.status === 'discarded' ? 'opacity-75' : '']"
          >
            <div class="flex items-start gap-2 mb-2">
              <p class="flex-1 min-w-0 pt-1 text-mini text-gray-600 dark:text-gray-300">
                <span class="font-semibold text-gray-800 dark:text-gray-200">
                  {{ $t(`suggestions.categories.${item.category}`) }}
                </span>
                · {{ fecha(item.created_at) }}
              </p>

              <base-dropdown
                :model-value="item.status"
                :aria-label="$t('suggestions.status')"
                :options="statusOptions"
                compacto
                class="w-36 shrink-0"
                @update:model-value="suggestions.setStatus(item.id, $event)"
              />

              <!-- Borrar pide confirmación en el propio botón: no hay papelera
                   donde recuperarlo. -->
              <button
                type="button"
                class="shrink-0 h-11 lg:h-9 flex items-center gap-1.5 rounded-xl text-xs transition-colors"
                :class="
                  confirming === item.id
                    ? 'px-3 bg-red-600 text-white'
                    : 'w-11 lg:w-9 justify-center text-gray-500 dark:text-gray-400 hover:text-red-700 hover:bg-red-50 hover:dark:text-red-400 hover:dark:bg-red-900/30'
                "
                :aria-label="$t(confirming === item.id ? 'suggestions.confirmDelete' : 'suggestions.delete')"
                @click="confirming === item.id ? remove(item.id) : (confirming = item.id)"
                @blur="confirming === item.id ? (confirming = null) : null"
              >
                <base-icon :d="ICONO_BORRAR" width="18" height="18" color="currentColor" stroke-linecap="round" stroke-linejoin="round" />
                <span v-if="confirming === item.id">{{ $t('suggestions.confirmDelete') }}</span>
              </button>
            </div>

            <!-- whitespace-pre-line: la gente separa en párrafos y esos saltos
                 son parte de lo que ha escrito. -->
            <p class="text-sm whitespace-pre-line break-words">{{ item.message }}</p>

            <p
              v-if="item.contact || item.page || item.app_version"
              class="mt-2 text-mini text-gray-600 dark:text-gray-300 break-all"
            >
              <a v-if="item.contact" :href="`mailto:${item.contact}`" class="underline">{{ item.contact }}</a>
              <template v-if="item.contact && (item.page || item.app_version)"> · </template>
              <span v-if="item.page">{{ item.page }}</span>
              <template v-if="item.page && item.app_version"> · </template>
              <span v-if="item.app_version">v{{ item.app_version }}</span>
            </p>

            <!-- Las notas, solo si hay o se piden: vacías eran un campo más en
                 cada tarjeta. -->
            <div v-if="conNotas(item)" class="mt-3">
              <label :for="`notas-${item.id}`" class="block text-mini font-medium mb-1">
                {{ $t('suggestions.notes') }}
              </label>
              <textarea
                :id="`notas-${item.id}`"
                :value="item.notes ?? ''"
                rows="2"
                class="campo"
                :placeholder="$t('suggestions.notesPlaceholder')"
                @blur="saveNotes(item, $event.target.value)"
              ></textarea>
            </div>
            <button
              v-else
              type="button"
              class="mt-2 text-mini text-gray-600 dark:text-gray-300 underline underline-offset-2 hover:text-gray-900 hover:dark:text-white"
              @click="abrirNotas(item.id)"
            >
              + {{ $t('suggestions.addNote') }}
            </button>
          </base-card>
        </li>
      </ul>
    </template>
  </section>
</template>
