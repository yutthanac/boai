/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#121212',
        'bg-primary': '#121212',
        surface: '#1E1E1E',
        'surface-elevated': '#252525',
        'surface-hover': '#2A2A2A',
        border: '#2A2A2A',
        'border-subtle': '#2A2A2A',
        'border-focus': 'rgba(56, 189, 248, 0.4)',
        primary: {
          DEFAULT: '#38BDF8',
          hover: '#0EA5E9',
          light: '#7DD3FC'
        },
        cyan: {
          neon: '#00F0FF',
        },
        violet: {
          neon: '#8B5CF6',
        },
        emerald: {
          neon: '#10B981',
        }
      },
      fontFamily: {
        sans: ['"Noto Sans Thai"', '"Noto Sans"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Noto Sans Thai"', 'monospace']
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-pulse': 'glow 2.5s ease-in-out infinite alternate',
        'spin-slow': 'spin 12s linear infinite',
      },
      keyframes: {
        glow: {
          '0%': { filter: 'drop-shadow(0 0 12px rgba(99, 102, 241, 0.4))' },
          '100%': { filter: 'drop-shadow(0 0 28px rgba(0, 240, 255, 0.7))' }
        }
      }
    },
  },
  plugins: [],
}
