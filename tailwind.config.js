/** @type {import('tailwindcss').Config} */
import typography from '@tailwindcss/typography';

export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#030712',
        'background-secondary': '#111827',
        'glass-bg': 'rgba(17, 24, 39, 0.5)',
        border: '#374151',
        'text-primary': '#f9fafb',
        'text-secondary': '#9ca3af',
        accent: {
          cyan: '#22d3ee',
          'cyan-hover': '#67e8f9',
          violet: '#a78bfa',
          'violet-hover': '#c4b5fd',
          green: '#4ade80',
          'green-hover': '#86efac',
          red: '#fb7185',
          yellow: '#facc15',
          blue: '#3b82f6',
          'blue-hover': '#60a5fa',
          purple: '#8b5cf6',
        },
      },
      fontFamily: {
        sans: ['Sora', 'Inter', 'sans-serif'],
        mono: ['SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 15px 0px rgba(34, 211, 238, 0.4)',
        'glow-violet': '0 0 15px 0px rgba(167, 139, 250, 0.4)',
        'glow-green': '0 0 15px 0px rgba(74, 222, 128, 0.4)',
        'glow-red': '0 0 15px 0px rgba(251, 113, 133, 0.4)',
      },
      animation: {
        'bg-pan': 'bg-pan 8s linear infinite',
      },
      keyframes: {
        'bg-pan': {
          '0%': { backgroundPosition: '0% 0%' },
          '100%': { backgroundPosition: '40px 40px' },
        },
      },
    },
  },
  plugins: [
    typography,
  ],
};