import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useLiveStore } from '../src/stores/live'
import { TIPO_EVENTO, useBuscarAhora } from '../src/composables/useBuscarAhora'

// La store de datos de juego importa el cliente de Supabase, que sin
// credenciales revienta al cargar.
vi.mock('../src/lib/supabaseClient', () => ({ supabase: {} }))

/**
 * La búsqueda en lo que hay ahora en el juego: la del buscador de «Ahora» y
 * la del de la cabecera. Con la app en español pero sin las frases del juego
 * cargadas, las misiones se quedan en inglés, como al arrancar sin red.
 */
const icono = (dex) => `https://cdn.leekduck.com/assets/img/pokemon_icons_crop/pm${dex}.icon.png`
const mon = (name, dex) => ({ name, image: icono(dex) })

/** Hora local sin zona, como las publica LeekDuck. */
const local = (dias) => {
  const fecha = new Date(Date.now() + dias * 86_400_000)
  return new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60_000).toISOString().slice(0, -1)
}

let live
let buscador
beforeEach(() => {
  setActivePinia(createPinia())
  live = useLiveStore()
  live.research = [
    // Sin tipo: las del evento (ver TIPO_EVENTO).
    {
      text: '<span>Earn a Candy exploring with your buddy</span>',
      rewards: [mon('Electrike', 309), mon('Bramblin', 946)]
    },
    { text: 'Catch 7 Pokémon', type: 'catch', rewards: [mon('Magikarp', 129)] },
    { text: 'Walk your buddy to earn 3 Candy', type: 'buddy', rewards: [mon('Ralts', 280)] }
  ]
  live.raids = [{ name: 'Yveltal', tier: '5-Star Raids', image: icono(717) }]
  live.eggs = [
    { name: 'Riolu', eggType: '7 km', image: icono(447) },
    // LeekDuck lista algunos dos veces: tiene que salir uno.
    { name: 'Riolu', eggType: '7 km', image: icono(447) }
  ]
  live.rocket = [
    {
      name: 'Fire-type Female Grunt',
      title: 'Team GO Rocket Grunt',
      type: 'fire',
      firstPokemon: [mon('Ponyta', 77)]
    }
  ]
  live.events = [
    {
      eventID: 'fall-marathon',
      name: 'Fall Marathon: Buddy Trek',
      eventType: 'event',
      heading: 'Event',
      start: local(-1),
      end: local(3)
    },
    {
      eventID: 'ya-paso',
      name: 'Old Buddy Event',
      eventType: 'event',
      heading: 'Event',
      start: local(-9),
      end: local(-8)
    }
  ]
  buscador = useBuscarAhora()
})

const claves = (secciones) => secciones.map((seccion) => seccion.clave)

describe('buscar en lo de ahora', () => {
  it('sin nada escrito, o con menos de 3 letras, no busca', () => {
    expect(buscador.buscar('')).toEqual([])
    expect(buscador.buscar('   ')).toEqual([])
    // «ca» casaría con «Candy» y «Catch»: es ruido, no lo que se busca.
    expect(buscador.buscar('ca')).toEqual([])
    expect(buscador.buscar('can')).not.toEqual([])
  })

  it('encuentra la misión por su texto y por su recompensa', () => {
    const porTexto = buscador.buscar('candy buddy')
    expect(claves(porTexto)).toEqual(['research'])
    expect(porTexto[0].items.map((item) => item.texto)).toEqual([
      'Earn a Candy exploring with your buddy',
      'Walk your buddy to earn 3 Candy'
    ])

    const [misiones] = buscador.buscar('bramblin')
    expect(misiones.items).toHaveLength(1)
    // Se buscaba Bramblin: sale él, con su sprite, y el resto como «y 1 más».
    expect(misiones.items[0].sub).toBe('Bramblin y 1 más')
    expect(misiones.items[0].imagen).toContain('pm946')
    // La del evento lleva su insignia; las demás no.
    expect(misiones.items[0].insignia).toBe('Evento')
  })

  it('si no se buscaba un Pokémon, la primera recompensa y el resto en «y N más»', () => {
    const [misiones] = buscador.buscar('exploring')
    expect(misiones.items[0].sub).toBe('Electrike y 1 más')
    expect(misiones.items[0].imagen).toContain('pm309')
  })

  it('el recluta lleva el sprite del Pokémon buscado', () => {
    const [rocket] = buscador.buscar('pony')
    expect(rocket.items[0].imagen).toContain('pm77')
    expect(rocket.items[0].sub).toBe('Team GO Rocket · Ponyta')
  })

  it('cada resultado lleva a su pestaña con la búsqueda puesta', () => {
    const [misiones] = buscador.buscar(' bramblin ')
    expect(misiones.to).toEqual({ path: '/live', query: { tab: 'research', buscar: 'bramblin' } })
    expect(misiones.items[0].to).toEqual(misiones.to)
  })

  it('busca en incursiones, huevos sin repetir y Rocket', () => {
    expect(buscador.buscar('yveltal')[0]).toMatchObject({
      clave: 'raids',
      items: [{ sub: 'Nivel 5' }]
    })
    const [huevos] = buscador.buscar('riolu')
    expect(huevos.clave).toBe('eggs')
    expect(huevos.items).toHaveLength(1)
    expect(huevos.items[0].sub).toBe('Huevo de 7 km')
    // Por el nombre traducido del recluta y por sus Pokémon.
    expect(claves(buscador.buscar('recluta fuego'))).toEqual(['rocket'])
    expect(claves(buscador.buscar('ponyta'))).toEqual(['rocket'])
  })

  it('los eventos, solo los que no han pasado, y abren su detalle', () => {
    const eventos = buscador.buscar('buddy trek').find((seccion) => seccion.clave === 'events')
    expect(eventos.items).toHaveLength(1)
    expect(eventos.items[0].to).toEqual({ path: '/events', query: { event: 'fall-marathon' } })
    expect(buscador.buscar('old buddy event')).toEqual([])
  })
})

describe('tipos de misión', () => {
  it('las que llegan sin tipo son las del evento', () => {
    expect(buscador.tipoMision(live.research[0])).toBe(TIPO_EVENTO)
    expect(buscador.etiquetaMision(TIPO_EVENTO)).toBe('Evento')
    expect(buscador.tipoMision(live.research[1])).toBe('catch')
  })

  it('un tipo sin traducir sale con mayúscula', () => {
    expect(buscador.etiquetaMision('nuevo')).toBe('Nuevo')
  })
})
