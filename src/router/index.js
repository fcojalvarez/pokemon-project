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
            path: "/:catchAll(.*)",
            redirect: `/`
        }
    ]
})

export default router