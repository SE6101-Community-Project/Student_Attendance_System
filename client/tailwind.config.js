/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx}",
    "./src/**/*.{js,jsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#00113a',
          900: '#001a4d',
          800: '#002366',
          700: '#003399',
        },
        gold: {
          700: '#5c420f',
          600: '#775a19',
          500: '#9b7321',
          400: '#c4a257',
          100: '#f9f2e3',
        },
        academic: {
          bg: '#f0f0f0',
          card: '#ffffff',
          text: '#1a1c1c',
          muted: '#444650',
          subtle: '#8f9090',
          border: 'rgba(197,198,210,0.4)',
        },
      },
      fontFamily: {
        newsreader: ['Newsreader_400Regular'],
        'newsreader-bold': ['Newsreader_700Bold'],
        manrope: ['Manrope_400Regular'],
        'manrope-semi': ['Manrope_600SemiBold'],
        'manrope-bold': ['Manrope_700Bold'],
      },
      letterSpacing: {
        widest2: '0.15em',
      },
    },
  },
  plugins: [],
};