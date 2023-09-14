module.exports = {
    purge: ['./src/**/*.html', './src/**/*.vue', './src/**/*.jsx', ],
    darkMode: 'class', // or 'media' or 'class'
    theme: {
        extend: {
            dropShadow: {
                'svg': '2px 2px 4px rgba(0, 0, 0, 0.4)',
                'pokemon_dark': '3px -7px 5px #333333',
                'pokemon_light': '3px -7px 5px #33333370'
            },
            lineHeight: {
                'none': '0px',
            },
            colors: {
                'Grass': '#5fb955',
                'Poison': '#51069c',
                'Water': '#06099c',
                'Fire': '#ff0000',
                'Flying': '#c8c9fa',
                'Bug': '#93c22e',
                'Normal': '#8f98a0',
                'Ground': '#6e2c13',
                'Electric': '#d9ff00',
                'Fairy': '#dca1ff',
                'Fighting': '#ff3b44',
                'Rock': '#522114',
                'Psychic': '#4b3a6e',
                'Ice': '#80b7ff',
                'Ghost': '#705e8c',
                'Steel': '#ff0000',
                'Dark': '#5d596b',
            },
            transitionProperty: {
                'position': 'left, right, top, bottom',
                'clip': 'clip-path'
            },
        },
    },
    variants: {
        extend: {},
    },
    plugins: [],
}