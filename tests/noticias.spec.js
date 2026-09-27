import { describe, expect, it } from 'vitest'
import { asociarEventos, leerNoticia, palabras, slugsDePortada } from '../scripts/lib/noticias.mjs'

/**
 * Noticias oficiales de pokemongo.com: si Niantic rehace la web, esto salta
 * aquí y no en el detalle de un evento vacío. El HTML es un recorte del de
 * verdad, con la misma forma.
 */
const POST = `<html><head>
<meta content="¡Una bola de fuego furiosa como Cinderace Gigamax llega cual tormenta el Día de Combates Max! — Pokémon GO" property="og:title"/>
<meta content="https://lh3.googleusercontent.com/cartel" property="og:image"/>
</head><body>
<div class="_date"><pg-date-format timestamp="1788973200000"></pg-date-format></div>
<div class="_containerBlock"><div><h2 class="_containerHeadline">Día de Combates Max de Cinderace Gigamax</h2></div>
<div class="_markdown"><p>Sábado 3 de octubre de 2026 de 14:00 a 17:00 en la hora local</p></div></div>
<div class="_containerBlock"><div><h2 class="_containerHeadline">Bonus del evento</h2></div>
<div class="_markdown"><p>Los bonus siguientes estarán activos durante el evento.</p>
<ul><li>Límite de Partículas Max aumentado a 1600</li><li>Hasta tres intercambios especiales al día</li></ul>
<p>—El equipo de Pokémon GO</p></div></div>
<div class="_containerBlock"><div><h2>¿Buscas Entrenadores con los que jugar?</h2></div><div><p>Campfire…</p></div></div>
<footer><h2>Pie</h2><p>Enlaces</p></footer>
</body></html>`

describe('leer una noticia oficial', () => {
  const noticia = leerNoticia(POST)

  it('saca título, imagen y fecha de publicación', () => {
    expect(noticia.titulo).toBe('¡Una bola de fuego furiosa como Cinderace Gigamax llega cual tormenta el Día de Combates Max!')
    expect(noticia.imagen).toBe('https://lh3.googleusercontent.com/cartel')
    expect(noticia.publicada).toBe(new Date(1788973200000).toISOString())
  })

  it('se queda con lo que dice algo del evento', () => {
    // Fuera: la primera sección (solo repite la fecha, que ya da la tarjeta),
    // la frase que solo presenta la lista, la despedida, la promoción y el pie.
    expect(noticia.secciones.map((s) => s.titulo)).toEqual(['Bonus del evento'])
    expect(noticia.secciones[0].bloques).toEqual([
      { t: 'li', x: 'Límite de Partículas Max aumentado a 1600' },
      { t: 'li', x: 'Hasta tres intercambios especiales al día' }
    ])
  })

  it('deja las frases con fechas o cifras aunque presenten una lista', () => {
    const conFecha = leerNoticia(POST.replace('Los bonus siguientes estarán activos durante el evento.', 'Los bonus siguientes estarán activos el 2 de octubre de 00:00 a 17:00.'))
    expect(conFecha.secciones[0].bloques[0]).toEqual({ t: 'p', x: 'Los bonus siguientes estarán activos el 2 de octubre de 00:00 a 17:00.' })
  })

  it('no revienta con una página sin nada', () => {
    expect(leerNoticia('<html></html>')).toBeNull()
  })

  it('lee las direcciones de la portada sin repetir', () => {
    const portada = '<a href="/es/news/uno-2026">x</a><a href="/es/news/dos">y</a><a href="/es/news/uno-2026">z</a><a href="/en/news/tres">w</a>'
    expect(slugsDePortada(portada)).toEqual(['uno-2026', 'dos'])
  })
})

describe('a qué evento es cada noticia', () => {
  const noticia = (titulo, texto, publicada = '2026-09-15T00:00:00Z') => ({
    titulo,
    publicada,
    secciones: [{ titulo: 'Pokémon destacados', bloques: [{ t: 'li', x: texto }] }]
  })
  const noticias = {
    'gigantamax-cinderace-max-battle-day-2026': noticia('Cinderace', 'Cinderace Gigamax'),
    'communityday-october-2026-zorua': noticia('Día de la Comunidad', 'Zorua'),
    'go-battle-league-twilight-trails': noticia('Liga', 'Copa Retro'),
    'city-safaris-europe-2026': noticia('City Safari', 'Lisboa, Marsella y Múnich')
  }
  const especies = new Set(['cinderace', 'zorua'])

  it('empareja por dirección, por palabras y la Liga con su temporada', () => {
    const eventos = [
      { eventID: 'gigantamax-cinderace-max-battle-day-2026', start: '2026-10-03T14:00:00' },
      { eventID: 'october-communityday2026', name: 'Zorua Community Day', start: '2026-10-04T14:00:00' },
      { eventID: 'gbl-twilight-trails_master-league_retro-cup', eventType: 'go-battle-league', start: '2026-09-30T13:00:00' }
    ]
    expect(asociarEventos(eventos, noticias, especies)).toEqual({
      'gigantamax-cinderace-max-battle-day-2026': 'gigantamax-cinderace-max-battle-day-2026',
      'october-communityday2026': 'communityday-october-2026-zorua',
      'gbl-twilight-trails_master-league_retro-cup': 'go-battle-league-twilight-trails'
    })
  })

  it('no engancha un evento a una noticia que se le parece pero no es suya', () => {
    const eventos = [
      // Brisbane no está en la noticia de los City Safari de Europa.
      { eventID: 'pokemon-go-city-safari-brisbane-2026', name: 'Brisbane, Australia - Pokémon GO City Safari', start: '2026-09-26T02:00:00' },
      // Mucho después de publicarse: no es la de ese mes.
      { eventID: 'november-communityday2026', name: 'Zorua Community Day', start: '2026-12-20T14:00:00' }
    ]
    expect(asociarEventos(eventos, noticias, especies)).toEqual({})
  })

  it('separa las palabras que LeekDuck escribe pegadas y quita las que no distinguen', () => {
    // «communityday2026»: comunidad por un lado, el año fuera; «day» y los
    // meses no distinguen un evento de otro.
    expect([...palabras('october-communityday2026')]).toEqual(['community'])
    expect([...palabras('gbl-twilight-trails')].sort()).toEqual(['battle', 'league', 'trail', 'twilight'])
  })
})
