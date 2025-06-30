/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary-blue': 'var(--primary-blue)',
        'primary-blue-light': 'var(--primary-blue-light)',
        'primary-blue-dark': 'var(--primary-blue-dark)',
        'success-green': 'var(--success-green)',
        'warning-orange': 'var(--warning-orange)',
        'danger-red': 'var(--danger-red)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'background': 'var(--background)',
      },
      fontSize: {
        'base': ['18px', { lineHeight: '1.5' }],
        'lg': ['20px', { lineHeight: '1.6' }],
        'xl': ['24px', { lineHeight: '1.4' }],
        '2xl': ['28px', { lineHeight: '1.3' }],
        '3xl': ['32px', { lineHeight: '1.2' }],
      },
      maxWidth: {
        'mobile': '430px',
      },
      screens: {
        'mobile': '430px',
      },
      spacing: {
        '18': '4.5rem',
        '112': '28rem',
        '128': '32rem',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/aspect-ratio'),
  ],
} 