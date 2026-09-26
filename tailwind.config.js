module.exports = {
    // En pantallas táctiles el navegador simula el hover al tocar y el estilo
    // se queda pegado hasta que tocas otra cosa. Con esto, las variantes
    // hover: solo se aplican donde hay puntero de verdad.
    future: {
        hoverOnlyWhenSupported: true,
    },
    content: ['./index.html', './src/**/*.{vue,js,jsx,html}'],
    darkMode: 'class', // or 'media' or 'class'
    /*
     * Tokens de la app. Antes había 31 grises distintos y 7 radios; ahora:
     *
     *   Texto   fuerte 900 / dark 100 · principal 800 / dark 200 · secundario 600 / dark 300
     *   Borde   sutil (tarjetas, separadores) 300 / dark 700 · control (botones, chips) 400 / dark 600
     *   Radio   rounded-xl (cajas y controles) · rounded-full (pastillas, puntos, barras)
     *
     * Excepción: en un botón relleno el borde es del color del relleno.
     */
    theme: {
        extend: {
            outlineWidth: {
                1: '1px',
                2: '2px',
                3: '3px',
            },
            screens: {
                xs: '450px',
            },
            dropShadow: {
                'svg': '2px 2px 4px rgba(0, 0, 0, 0.4)',
                'pokemon_dark': '3px -7px 5px #333333',
                'pokemon_light': '3px -7px 5px #33333370'
            },
            // `leading-none` vuelve a ser el de Tailwind (1). El 0 que tenía lo
            // necesitan solo las estrellas de variocolor, que se apilan pegadas.
            lineHeight: {
                'zero': '0px',
            },
            colors: {
                'gray-150': 'rgb(235 238 240)',
            },
            transitionProperty: {
                'position': 'left, right, top, bottom',
                'clip': 'clip-path'
            },
            fontFamily: {
                'code-sans': ['Source Code Pro','Open Sans', 'monospace']
            },
            fontSize: {
                // 0.6rem (9,6px) era ilegible. 0.75rem son los 12px que se
                // consideran el suelo para texto secundario.
                'mini': ['0.75rem', { lineHeight: '1rem' }],
            },
            animation: {
                'spin-4-s': 'bounce 3s ease infinite',
            }
        },
    },
    plugins: [],
}