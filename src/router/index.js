import { createRouter, createWebHistory } from 'vue-router';
import { PokemonsList } from "../views/index";

const router = createRouter({
    history: createWebHistory(
        import.meta.env.BASE_URL),
    routes: [{
        path: '/',
        name: 'home',
        component: PokemonsList
    }, ]
})

export default router