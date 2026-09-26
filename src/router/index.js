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
            component: () => import('@/views/TopView.vue')
        },
        {
            path: '/eventos',
            name: 'EventsPage',
            component: () => import('@/views/EventsView.vue')
        },
        {
            path: '/ahora',
            name: 'LivePage',
            component: () => import('@/views/RaidsView.vue')
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