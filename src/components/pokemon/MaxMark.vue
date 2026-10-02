<script setup>
/**
 * Marca de Dinamax / Gigamax: el símbolo del propio juego.
 *
 * Los trazados son el contorno vectorizado de los iconos originales (seguido
 * de contornos sobre el PNG a 400x400 y simplificado con Douglas-Peucker a
 * 0,35 unidades), no un dibujo a ojo: el símbolo tiene unas proporciones muy
 * concretas y cualquier aproximación se nota.
 *
 * Van en SVG y no como PNG porque los originales son de color y aquí hacen
 * falta en gris según el tema: heredando  valen en claro y en
 * oscuro sin duplicar el recurso, y no cuestan una petición.
 *
 * Hueco es Dinamax y relleno es Gigamax, igual que en el juego. El hueco lleva
 * sus propios huecos internos, así que necesita .
 */
const props = defineProps({
  /**  (hueco) o  (relleno). */
  variant: {
    type: String,
    default: 'dynamax',
    validator: (valor) => ['dynamax', 'gigantamax'].includes(valor)
  },
  /** Lado en píxeles. Por debajo de 14 el hueco deja de leerse. */
  size: { type: [Number, String], default: 18 }
})

const TRAZADOS = {
  dynamax:
    'M9.25,12.25L17.25,14.50L26.50,18.25L36.00,23.00L43.75,27.75L44.25,27.50L49.75,13.00L50.50,13.50L55.50,27.25L56.25,27.75L62.50,23.75L75.50,17.25L87.75,12.75L89.50,12.25L91.00,12.50L81.25,19.75L70.75,29.00L60.75,39.25L50.25,52.25L49.00,51.50L43.00,43.50L33.00,32.75L19.75,20.75L9.25,12.50Z' +
    'M50.00,21.75L52.75,29.75L55.00,31.50L57.25,31.25L66.50,25.50L72.75,22.50L59.50,35.50L50.50,46.25L50.00,46.75L49.25,46.00L40.50,35.50L27.00,22.50L34.25,26.00L42.25,31.00L45.00,31.50L47.00,30.00L49.75,22.00Z' +
    'M38.00,41.50L46.00,50.75L48.50,54.75L42.25,64.75L36.75,77.00L24.00,79.00L16.75,80.75L7.50,84.00L1.25,87.50L0.75,87.50L0.75,86.75L6.00,78.00L16.50,63.75L25.25,53.75L37.75,41.75Z' +
    'M61.50,41.50L67.00,46.00L67.00,46.75L60.75,54.00L56.50,60.00L55.75,60.75L54.75,60.00L51.50,55.00L51.50,54.00L61.25,41.75Z' +
    'M37.50,46.50L38.75,47.25L42.00,51.25L44.25,54.25L44.25,55.00L39.50,62.50L34.25,74.00L23.00,75.75L9.25,79.50L17.75,67.75L24.00,60.25L37.25,46.75Z' +
    'M68.50,48.25L69.25,48.25L74.00,53.25L68.00,60.25L61.50,69.25L60.25,70.00L56.75,63.00L62.00,55.75L68.25,48.50Z' +
    'M69.00,53.00L69.25,53.50L61.25,63.75L60.75,63.50L61.25,62.50L68.75,53.25Z' +
    'M75.75,55.00L80.00,59.50L89.75,72.00L97.25,83.25L99.25,87.50L91.25,83.50L84.00,81.00L76.00,79.00L64.50,77.50L63.00,76.75L61.75,73.50L62.00,72.00L69.50,61.75L75.50,55.25Z' +
    'M75.75,60.00L82.25,67.75L90.50,79.50L81.50,76.75L65.75,74.00L65.50,73.00L66.50,71.50L75.50,60.25Z',
  gigantamax:
    'M90.00,12.00L91.00,12.50L89.75,13.75L82.75,18.75L75.00,25.25L63.25,36.75L50.25,52.25L49.00,51.75L41.75,42.25L30.00,30.00L19.00,20.25L10.00,13.50L9.25,12.25L10.75,12.25L16.25,14.00L26.75,18.25L36.25,23.00L43.50,27.50L44.25,27.25L49.25,13.50L50.25,13.00L56.00,27.75L63.50,23.00L74.00,17.75L83.50,14.00L89.75,12.25Z' +
    'M37.75,41.50L38.75,41.75L41.75,45.25L48.75,54.50L40.50,68.25L36.75,77.00L36.25,77.50L26.00,78.75L17.25,80.75L7.75,84.00L1.00,87.75L0.50,87.00L8.25,74.50L16.75,63.25L25.50,53.25L37.50,41.75Z' +
    'M61.50,41.50L62.25,41.50L64.50,43.50L67.00,46.00L67.00,47.00L60.25,54.75L56.25,60.50L55.25,60.75L54.75,60.25L51.25,55.00L51.25,54.25L61.25,41.75Z' +
    'M68.75,48.00L73.00,51.75L74.00,53.50L66.00,63.00L61.50,69.50L60.50,70.25L59.75,69.50L56.75,62.75L62.50,55.00L68.50,48.25Z' +
    'M75.50,55.00L79.50,58.75L89.75,71.75L97.25,83.00L99.25,86.50L99.25,87.75L90.25,83.25L82.00,80.50L71.00,78.25L63.50,77.50L63.00,77.00L61.50,72.50L67.75,63.75L75.25,55.25Z'
}
</script>

<template>
  <svg
    :width="props.size"
    :height="props.size"
    viewBox="0 0 100 100"
    role="img"
    :aria-label="$t(props.variant === 'gigantamax' ? 'max.canGigantamax' : 'max.canDynamax')"
    class="drop-shadow-svg"
  >
    <title>{{ $t(props.variant === 'gigantamax' ? 'max.canGigantamax' : 'max.canDynamax') }}</title>
    <path
      :d="TRAZADOS[props.variant] ?? TRAZADOS.dynamax"
      fill="currentColor"
      fill-rule="evenodd"
    />
  </svg>
</template>
