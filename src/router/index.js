import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
    history: createWebHistory( import.meta.env.BASE_URL ),
    routes: [
        {
            path: '/',
            name: 'PokemonList',
            component: () => import('@/views/PokemonsList.vue')
        },
        {
            path: '/pokemon/:id',
            name: 'PokemonPage',
            component: () => import('@/views/PokemonPage.vue')
        },
        {
            path: '/top',
            name: 'TopPage',
            meta: { titleKey: 'nav.top' },
            component: () => import('@/views/TopView.vue')
        },
        {
            path: '/eventos',
            name: 'EventsPage',
            meta: { titleKey: 'nav.events' },
            component: () => import('@/views/EventsView.vue')
        },
        {
            path: '/ahora',
            name: 'LivePage',
            meta: { titleKey: 'nav.raids' },
            component: () => import('@/views/RaidsView.vue')
        },
        {
            // Panel de sugerencias. No se enlaza desde el menú: quien lo
            // protege es la RLS de Supabase, no que la URL esté escondida.
            path: '/sugerencias',
            name: 'SuggestionsPage',
            meta: { titleKey: 'suggestions.panel' },
            component: () => import('@/views/SuggestionsView.vue')
        },
        {
            // La sección se llamaba "Incursiones" y ahora cubre también huevos
            // y tareas. Se mantiene la ruta vieja redirigiendo, para no romper
            // enlaces guardados ni los que ya estuvieran compartidos.
            path: '/incursiones',
            redirect: '/ahora'
        },
        {
            path: "/:catchAll(.*)",
            redirect: `/`
        }
    ]
})

export default router