/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#080808',
          secondary: '#0F0F0F',
          card: '#141414',
          elevated: '#1A1A1A',
          hover: '#1F1F1F',
        },
        gold: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#D4AF37',
          600: '#B8960C',
          700: '#92740A',
          800: '#6B5607',
          900: '#453804',
          DEFAULT: '#D4AF37',
          light: '#F0C040',
          dark: '#A07820',
          muted: '#7A6020',
        },
        border: {
          DEFAULT: '#2A2A2A',
          gold: '#D4AF3740',
          'gold-bright': '#D4AF3780',
        },
        text: {
          primary: '#F5F0E0',
          secondary: '#C0A060',
          muted: '#6B6B6B',
          dim: '#3A3A3A',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      },
      boxShadow: {
        'gold': '0 0 30px -5px rgba(212, 175, 55, 0.3)',
        'gold-sm': '0 0 15px -3px rgba(212, 175, 55, 0.2)',
        'gold-lg': '0 0 60px -10px rgba(212, 175, 55, 0.4)',
        'inner-gold': 'inset 0 1px 0 rgba(212, 175, 55, 0.15)',
        'card': '0 4px 24px rgba(0,0,0,0.6)',
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #D4AF37 0%, #F0C040 50%, #B8960C 100%)',
        'gold-subtle': 'linear-gradient(135deg, rgba(212,175,55,0.15) 0%, rgba(212,175,55,0.05) 100%)',
        'dark-gradient': 'linear-gradient(180deg, #0F0F0F 0%, #080808 100%)',
        'card-gradient': 'linear-gradient(145deg, #1A1A1A 0%, #111111 100%)',
      },
      animation: {
        'shimmer': 'shimmer 2s infinite',
        'pulse-gold': 'pulse-gold 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-gold': {
          '0%, 100%': { boxShadow: '0 0 15px rgba(212,175,55,0.2)' },
          '50%': { boxShadow: '0 0 30px rgba(212,175,55,0.5)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        }
      }
    },
  },
  plugins: [],
}
