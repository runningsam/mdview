/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './public/**/*.html',
        './public/**/*.js',
        './functions/**/*.js',
    ],
    theme: {
        extend: {
            colors: {
                primary: '#4f46e5',
                'primary-hover': '#4338ca',
            },
        },
    },
    plugins: [],
};
