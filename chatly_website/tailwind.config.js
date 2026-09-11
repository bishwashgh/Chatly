/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Signature Chatly deep green, mirrored from the mobile theme.
        brand: {
          DEFAULT: '#006E28',
          dark: '#004D1A',
          light: '#34C759',
          bright: '#72FE88',
          tint: 'rgba(114, 254, 136, 0.22)',
        },
        // Outgoing bubble / FriendGate badge blue.
        accent: {
          DEFAULT: '#0070EB',
          dark: '#0058BC',
          soft: '#D8E2FF',
        },
        canvas: {
          DEFAULT: '#FAF9FE',
          low: '#F4F3F8',
          high: '#E9E7ED',
          night: '#121316',
          nightAlt: '#1A1B1F',
          nightLow: '#28292E',
          nightHigh: '#36373D',
        },
        danger: '#BA1A1A',
        muted: '#6D7B6B',
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 2px 6px rgba(0, 0, 0, 0.05)',
        panel: '0 8px 24px rgba(0, 0, 0, 0.10)',
        pop: '0 12px 32px rgba(0, 0, 0, 0.16)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'dot-pulse': {
          '0%, 80%, 100%': { opacity: '0.3', transform: 'scale(0.8)' },
          '40%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 160ms ease-out',
        'dot-pulse': 'dot-pulse 1.2s infinite ease-in-out',
      },
    },
  },
  plugins: [],
};
