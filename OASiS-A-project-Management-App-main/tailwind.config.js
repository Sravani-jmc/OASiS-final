/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
    './src/app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Japanese-inspired color palette
        'sakura': {
          50: '#FFF5F7',
          100: '#FFEAEE',
          200: '#FFCCD5',
          300: '#FFADC0',
          400: '#FF7096',
          500: '#FF3370',
          600: '#E32E65',
          700: '#971F43',
          800: '#711732',
          900: '#4C1022',
        },
        'matcha': {
          50: '#F5F9F0',
          100: '#EBF4E0',
          200: '#D1E5B7',
          300: '#B3D68D',
          400: '#93C467',
          500: '#75B241',
          600: '#5D8F34',
          700: '#3E5F23',
          800: '#2E471A',
          900: '#1F3012',
        },
        'indigo': {
          50: '#F0F5FF',
          100: '#E5EDFF',
          200: '#CDDBFE',
          300: '#B4C6FD',
          400: '#8896FB',
          500: '#5E66F9',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
        },
        'ink': {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        },
        'fuji': {
          50: '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
          800: '#5B21B6',
          900: '#4C1D95',
        }
      },
      fontFamily: {
        sans: ['Noto Sans JP', 'sans-serif'],
        display: ['Poppins', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
      }
    },
  },
  plugins: [],
} 