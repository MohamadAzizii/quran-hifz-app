import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        arabic: ['Amiri', 'Traditional Arabic', 'serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
