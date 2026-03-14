import type { Config } from 'tailwindcss'

export default {
  content: [
    './app/**/*.{vue,js,ts}',
    './components/**/*.{vue,js,ts}',
    './layouts/**/*.{vue,js,ts}',
    './pages/**/*.{vue,js,ts}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          green:  '#2d5a1b',   // U-Haag Dunkelgrün (aus Logo)
          light:  '#3d7a25',   // Helleres Grün
          gold:   '#c8a84b',   // Goldakzent (Wappen-Rand)
          dark:   '#1a3510',   // Sehr dunkles Grün
          white:  '#f8f8f6',   // Vereinsfarbe Weiß
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
} satisfies Config
