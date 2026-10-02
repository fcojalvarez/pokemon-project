import { afterEach, describe, expect, it, vi } from 'vitest'
import handler from '../api/calendario.js'

/**
 * La función de Vercel que da el .ics al Calendario de Apple: busca el evento
 * en el feed por su id y solo toma de la petición el título.
 */
const FEED = [
  {
    eventID: 'cd-oct',
    name: 'October Community Day',
    start: '2026-10-10T14:00:00.000',
    end: '2026-10-10T17:00:00.000',
    link: 'https://leekduck.com/events/cd-oct/'
  },
  { eventID: 'sin-fecha', name: 'Sin fecha', start: null, end: null }
]

/** Un res de Vercel de mentira: guarda lo que se le manda. */
const respuesta = () => {
  const res = { cabeceras: {}, estado: null, cuerpo: null }
  res.setHeader = (k, v) => {
    res.cabeceras[k] = v
  }
  res.status = (n) => {
    res.estado = n
    return res
  }
  res.send = (cuerpo) => {
    res.cuerpo = cuerpo
    return res
  }
  return res
}

const pedir = async (query) => {
  const res = respuesta()
  await handler({ query }, res)
  return res
}

describe('/api/calendario', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('devuelve el evento como calendario, con el título que manda la app', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => FEED }))
    )
    const res = await pedir({ id: 'cd-oct', titulo: 'Día de la Comunidad de octubre' })
    expect(res.estado).toBe(200)
    expect(res.cabeceras['Content-Type']).toBe('text/calendar; charset=utf-8')
    expect(res.cabeceras['Content-Disposition']).toMatch(/^inline;/)
    expect(res.cuerpo).toContain('SUMMARY:Día de la Comunidad de octubre')
    expect(res.cuerpo).toContain('DTSTART:20261010T140000')
    expect(res.cuerpo).toContain('URL:https://leekduck.com/events/cd-oct/')
  })

  it('con descargar=1 va como descarga', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => FEED }))
    )
    const res = await pedir({ id: 'cd-oct', titulo: 'CD', descargar: '1' })
    expect(res.cabeceras['Content-Disposition']).toBe('attachment; filename="cd.ics"')
  })

  it('sin título, el del feed; y un título con saltos se limpia', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => FEED }))
    )
    expect((await pedir({ id: 'cd-oct' })).cuerpo).toContain('SUMMARY:October Community Day')
    const sucio = await pedir({ id: 'cd-oct', titulo: 'Uno\r\nEND:VEVENT' })
    expect(sucio.cuerpo).toContain('SUMMARY:Uno END:VEVENT')
    expect(sucio.cuerpo.match(/^END:VEVENT\r$/gm)).toHaveLength(1)
  })

  it('400 sin id válido, 404 si no está o no tiene fecha, 502 si el feed falla', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => FEED }))
    )
    expect((await pedir({})).estado).toBe(400)
    expect((await pedir({ id: '../etc' })).estado).toBe(400)
    expect((await pedir({ id: 'no-existe' })).estado).toBe(404)
    expect((await pedir({ id: 'sin-fecha' })).estado).toBe(404)
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 500 }))
    )
    expect((await pedir({ id: 'cd-oct' })).estado).toBe(502)
  })
})
