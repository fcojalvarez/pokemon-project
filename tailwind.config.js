module.exports = {
    purge: ['./src/**/*.html', './src/**/*.vue', './src/**/*.jsx', ],
    darkMode: 'class', // or 'media' or 'class'
    theme: {
        extend: {
            dropShadow: {
                'svg': '0 3px 3px rgba(0, 0, 0, 0.2)',
            },
            lineHeight: {
                'none': '0px',
            },
            colors: {
                'Grass': '#035c26',
                'Poison': '#51069c',
                'Water': '#06099c',
                'Fire': '#ff0000',
                'Flying': '#c8c9fa',
                'Bug': '#26ff8f',
                'Normal': '#ffffff',
                'Ground': '#6e2c13',
                'Electric': '#d9ff00',
                'Fairy': '#dca1ff',
                'Fighting': '#ff3b44',
                'Rock': '#522114',
                'Psychic': '#4b3a6e',
                'Ice': '#80b7ff',
                'Ghost': '#705e8c',
                'Steel': '#ff0000',
                'Dark': '#cccccc',
            },
            transitionProperty: {
                'position': 'left, right, top, bottom',
                'clip': 'clip-path'
            }
        },
    },
    variants: {
        extend: {},
    },
    plugins: [],
}