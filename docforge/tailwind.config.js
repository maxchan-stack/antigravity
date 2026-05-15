/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Starlux-Apple 配色系統
        'starlux': {
          'earth-gold': '#9B8A5E',
          'rose-gold': '#B4745A',
          'obsidian': '#45464D',
          'bg-dark': '#1A1A1D',
          'bg-card': '#2D2D30',
          'bg-elevated': '#3A3A3E',
          'text-primary': '#FFFFFF',
          'text-secondary': '#ADADB0',
          'text-hint': '#7C7C7F',
        },
        // 保留 Spotify 配色（用於主題切換）
        'spotify': {
          'green': '#1DB954',
          'black': '#121212',
          'dark': '#181818',
          'gray': '#282828',
          'elevated': '#282828',
          'light-gray': '#B3B3B3',
        },
        // 語意化顏色
        primary: '#9B8A5E',
        secondary: '#B4745A',
        success: '#9B8A5E',
        warning: '#B4745A',
        error: '#D64545',
      },
      fontFamily: {
        'rufina': ['Rufina', 'serif'],
        'montserrat': ['Montserrat', 'sans-serif'],
        'sans': ['Montserrat', 'sans-serif'],
        'serif': ['Rufina', 'serif'],
      },
      borderRadius: {
        'xs': '0.375rem',
        'sm': '0.5rem',
        'md': '0.75rem',
        'lg': '1rem',
        'xl': '1.5rem',
        '2xl': '2rem',
      },
      backdropBlur: {
        'glass': '16px',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glow-gold': '0 0 20px rgba(155, 138, 94, 0.4)',
        'glow-rose': '0 0 20px rgba(180, 116, 90, 0.4)',
      },
    },
  },
  plugins: [],
}
