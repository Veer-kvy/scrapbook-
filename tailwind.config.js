/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        soft: '#F8E7E7',
        blush: '#F3C9CF',
        cream: '#FFF7E9',
        peach: '#E8B8A7',
        rose: '#C98C9D',
        deeprose: '#9C6474',
        ink: '#493A40',
        parchment: '#FBF1DF',
        kraft: '#E4CDA7',
      },
      fontFamily: {
        display: ['"Playfair Display Variable"', 'Georgia', 'serif'],
        serif: ['"Cormorant Garamond Variable"', 'Georgia', 'serif'],
        hand: ['"Caveat Variable"', 'Segoe Print', 'cursive'],
        sans: ['"Inter Variable"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        paper: '0 1px 2px rgba(73,58,64,.08), 0 10px 24px -12px rgba(73,58,64,.35)',
        lift: '0 18px 40px -18px rgba(73,58,64,.45), 0 4px 10px rgba(73,58,64,.12)',
        insetpaper: 'inset 0 0 60px rgba(201,140,157,.12)',
      },
      screens: {
        xs: '400px',
      },
    },
  },
  plugins: [],
};
