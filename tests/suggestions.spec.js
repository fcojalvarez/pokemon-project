import { describe, expect, it } from 'vitest'
import { COOLDOWN_MS, remainingCooldown, validate } from '../src/stores/suggestions'

/**
 * Lo que decide si una sugerencia llega a salir del navegador.
 *
 * Importa porque la tabla de Supabase repite estas mismas reglas en sus CHECK:
 * si esto deja pasar algo que allí no cabe, el usuario recibe un error de base
 * de datos en vez de un aviso entendible.
 */
describe('validación de una sugerencia', () => {
  const valida = { category: 'idea', message: 'El buscador no encuentra las formas de Deoxys' }

  it('acepta una sugerencia completa', () => {
    expect(validate(valida)).toBe(null)
    expect(validate({ ...valida, contact: 'alguien@ejemplo.com' })).toBe(null)
  })

  it('exige una categoría de las que conoce la tabla', () => {
    expect(validate({ ...valida, category: 'queja' })).toBe('category')
    expect(validate({ ...valida, category: undefined })).toBe('category')
  })

  it('rechaza los mensajes que no dicen nada', () => {
    expect(validate({ ...valida, message: 'malo' })).toBe('tooShort')
    // Los espacios no cuentan: nueve caracteres rodeados de blancos siguen
    // siendo nueve.
    expect(validate({ ...valida, message: '   no va   ' })).toBe('tooShort')
    expect(validate({ ...valida, message: '' })).toBe('tooShort')
    expect(validate({ ...valida, message: undefined })).toBe('tooShort')
  })

  it('rechaza los que no caben en la columna', () => {
    expect(validate({ ...valida, message: 'a'.repeat(2001) })).toBe('tooLong')
    expect(validate({ ...valida, message: 'a'.repeat(2000) })).toBe(null)
  })

  it('deja el contacto vacío, pero no a medias', () => {
    expect(validate({ ...valida, contact: '' })).toBe(null)
    expect(validate({ ...valida, contact: '   ' })).toBe(null)
    expect(validate({ ...valida, contact: undefined })).toBe(null)
    expect(validate({ ...valida, contact: 'alguien@' })).toBe('contact')
    expect(validate({ ...valida, contact: 'alguien' })).toBe('contact')
    expect(validate({ ...valida, contact: 'alguien@ejemplo' })).toBe('contact')
  })
})

describe('espera entre envíos', () => {
  const ahora = 1_700_000_000_000

  it('no frena al que nunca ha enviado nada', () => {
    expect(remainingCooldown(0, ahora)).toBe(0)
    expect(remainingCooldown(null, ahora)).toBe(0)
    expect(remainingCooldown('lo que sea', ahora)).toBe(0)
  })

  it('cuenta lo que falta desde el último envío', () => {
    expect(remainingCooldown(ahora, ahora)).toBe(COOLDOWN_MS / 1000)
    expect(remainingCooldown(ahora - 30_000, ahora)).toBe(30)
  })

  it('deja enviar cuando ya ha pasado el plazo', () => {
    expect(remainingCooldown(ahora - COOLDOWN_MS, ahora)).toBe(0)
    expect(remainingCooldown(ahora - 10 * COOLDOWN_MS, ahora)).toBe(0)
  })

  /**
   * Con la marca en el futuro (el reloj del sistema movido hacia atrás, o un
   * cambio de hora) la resta se dispara y el formulario se quedaría bloqueado
   * durante horas sin que el usuario entienda por qué.
   */
  it('ignora una marca en el futuro', () => {
    expect(remainingCooldown(ahora + 86_400_000, ahora)).toBe(0)
  })
})
