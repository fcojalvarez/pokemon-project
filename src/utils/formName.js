/**
 * Nombre corto de una forma para la cadena de evolución.
 *
 * Cuando hay dos megas basta con la letra ("Raichu X", "Raichu Y"): van una al
 * lado de la otra detrás de la flecha de megaenergía y se entiende solo.
 *
 * La mega única conserva el "Mega" delante: si no, Mega Rayquaza —que no tiene
 * cadena evolutiva— aparecería como "Rayquaza" a secas y parecería un fallo.
 */
export function shortFormName(name) {
  return String(name)
    .replace(/^Mega\s+(.+?)\s+([XY])$/i, (_, base, letra) => `${base} ${letra.toUpperCase()}`)
    .trim()
}
