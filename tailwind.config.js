module.exports = {
    purge: ['./src/**/*.html', './src/**/*.vue', './src/**/*.jsx', ],
    darkMode: 'class', // or 'media' or 'class'
    theme: {
        extend: {
            colors: {
                'Grass': '#ff0000',
                'Poison': '#ff0000',
                'Water': '#0000ff',
                'Fire': '#ff0000',
                'Flying': '#ff0000',
                'Bug': '#ff0000',
                'Normal': '#ff0000',
                'Ground': '#ff0000',
                'Electric': '#ff0000',
                'Fairy': '#ff0000',
                'Fighting': '#ff0000',
                'Rock': '#ff0000',
                'Psychic': '#ff0000',
                'Ice': '#ff0000',
                'Ghost': '#ff0000',
                'Steel': '#ff0000',
                'Dark': '#ff0000',
            }
        },
    },
    variants: {
        extend: {},
    },
    plugins: [],
}