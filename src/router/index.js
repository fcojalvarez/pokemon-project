import { createRouter, createWebHistory } from 'vue-router'

/**
 * Al volver atrás, la posición guardada, pero cuando la página ya sea lo
 * bastante alta para llegar a ella: las listas largas se pintan por tandas
 * (ver usePorTandas) y los datos pueden tardar, y saltando enseguida se
 * quedaba arriba. Como mucho se espera un segundo y medio.
 */
function cuandoQuepa(posicion, plazo = 1500) {
  const alto = (posicion.top ?? 0) + window.innerHeight
  const inicio = performance.now()
  return new Promise((resolve) => {
    const mirar = () => {
      if (document.documentElement.scrollHeight >= alto || performance.now() - inicio > plazo)
        resolve(posicion)
      else setTimeout(mirar, 50)
    }
    mirar()
  })
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  /**
   * Al volver atrás, cada página recupera el scroll que tenía: del Top a una
   * ficha y vuelta, se sigue por el mismo Pokémon del ranking. Al ir a una
   * página nueva, arriba. Si solo cambia la query (?form=, ?tab=), no se
   * mueve.
   */
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return cuandoQuepa(savedPosition)
    if (to.path === from.path) return false
    return { top: 0 }
  },
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
      path: '/events',
      name: 'EventsPage',
      meta: { titleKey: 'nav.events' },
      component: () => import('@/views/EventsView.vue')
    },
    {
      path: '/live',
      name: 'LivePage',
      meta: { titleKey: 'nav.raidsTitle' },
      component: () => import('@/views/RaidsView.vue')
    },
    {
      // Panel de sugerencias. No se enlaza desde el menú: quien lo
      // protege es la RLS de Supabase, no que la URL esté escondida.
      path: '/suggestions',
      name: 'SuggestionsPage',
      // Sin barra de secciones ni buscador: es una herramienta de gestión,
      // no una página de la Pokédex, y ahí solo estorban.
      meta: { titleKey: 'suggestions.panel', sinNavegacion: true },
      component: () => import('@/views/SuggestionsView.vue')
    },
    {
      // Las URL van en inglés. Las rutas de antes redirigen a las nuevas,
      // con su query, para no romper enlaces guardados ni compartidos.
      // «/incursiones» es aún más vieja: la sección cubre ya huevos y tareas.
      path: '/incursiones',
      redirect: (to) => ({ path: '/live', query: to.query })
    },
    { path: '/ahora', redirect: (to) => ({ path: '/live', query: to.query }) },
    { path: '/eventos', redirect: (to) => ({ path: '/events', query: to.query }) },
    { path: '/sugerencias', redirect: (to) => ({ path: '/suggestions', query: to.query }) },
    {
      // Lo que no existe: se dice, en vez de mandar a la Pokédex sin más.
      path: '/:catchAll(.*)',
      name: 'NotFound',
      meta: { titleKey: 'notFound.title' },
      component: () => import('@/views/NotFoundView.vue')
    }
  ]
})

export default router
