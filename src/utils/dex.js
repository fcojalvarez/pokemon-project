/** Número de Pokédex a tres cifras, como en el juego: 1 → «001», 1025 → «1025». */
export function formatDex(numero) {
  return numero == null ? '' : String(numero).padStart(3, '0')
}
