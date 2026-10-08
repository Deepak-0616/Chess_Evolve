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
          primary: '#040406',
          secondary: '#08090D',
          card: '#0D0E14',
          elevated: '#12141C',
          hover: '#181A24',
        },
        gold: {
          50: '#FDF8EC',
          100: '#F7EDD1',
          200: '#EEDBA5',
          300: '#E3C677',
          400: '#D4B46A',
          500: '#C5A059',
          600: '#A98338',
          700: '#8C6826',
          800: '#684A16',
          900: '#422E0B',
          DEFAULT: '#C5A059',
          light: '#D4B46A',
          dark: '#9B7830',
          muted: '#6E531D',
        },
        border: {
          DEFAULT: '#181A24',
          gold: 'rgba(197, 160, 89, 0.22)',
          'gold-bright': 'rgba(197, 160, 89, 0.5)',
        },
        text: {
          primary: '#F3EFE6',
          secondary: '#C5A059',
          muted: '#737584',
          dim: '#3F414D',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      },
      boxShadow: {
        'gold': '0 0 30px -5px rgba(197, 160, 89, 0.3)',
        'gold-sm': '0 0 15px -3px rgba(197, 160, 89, 0.2)',
        'gold-lg': '0 0 60px -10px rgba(197, 160, 89, 0.4)',
        'inner-gold': 'inset 0 1px 0 rgba(197, 160, 89, 0.18)',
        'card': '0 8px 32px rgba(0, 0, 0, 0.75)',
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #B58D3D 0%, #D4B46A 45%, #926E28 100%)',
        'gold-subtle': 'linear-gradient(135deg, rgba(197,160,89,0.15) 0%, rgba(197,160,89,0.04) 100%)',
        'dark-gradient': 'linear-gradient(180deg, #08090D 0%, #040406 100%)',
        'card-gradient': 'linear-gradient(145deg, #0F1017 0%, #08090E 100%)',
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
          '0%, 100%': { boxShadow: '0 0 15px rgba(197,160,89,0.2)' },
          '50%': { boxShadow: '0 0 30px rgba(197,160,89,0.45)' },
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
