/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Exact Android app colors
        'cyan-primary': '#C4EF95',   // Lime/Neon Yellow-Green
        'cyan-light': '#DDFB6E',
        'cyan-dark': '#AADE2E',
        'silver': '#C0C0C0',
        'neon-green': '#00E676',
        'neon-green-dark': '#00C853',
        'dark-bg': '#0A0E14',
        'dark-surface': '#121820',
        'dark-variant': '#1A2230',
        'dark-card': 'rgba(10,14,20,0.9)',
        'dark-border': 'rgba(255,255,255,0.12)',
        'text-primary': '#E8EAED',
        'text-secondary': '#ADB5BD',
        'text-tertiary': '#6C757D',
        'status-green': '#4CAF50',
        'status-yellow': '#FFEB3B',
        'status-red': '#FF5252',
        'status-orange': '#FF9800',
        // Chart palette
        'chart-0': '#C4EF95',
        'chart-1': '#C0C0C0',
        'chart-2': '#FF6D00',
        'chart-3': '#00E676',
        'chart-4': '#FF4081',
        'chart-5': '#FFD740',
        'chart-6': '#448AFF',
        'chart-7': '#E040FB',
      },
    },
  },
  plugins: [],
}
