/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary Colors
        'primary': {
          DEFAULT: '#2563EB', // 밝은 파란색
          light: '#3B82F6',
          dark: '#1D4ED8',
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
        },
        // Secondary Colors (Gray)
        'secondary': {
          DEFAULT: '#6B7280',
          light: '#9CA3AF',
          dark: '#4B5563',
        },
        // Status Colors (고령자 친화적 명확한 색상)
        'status': {
          'waiting': '#FEF3C7', // 대기중 - 부드러운 노란색
          'waiting-text': '#92400E',
          'waiting-border': '#FDE68A',
          'called': '#D1FAE5', // 호출됨 - 부드러운 초록색
          'called-text': '#065F46',
          'called-border': '#6EE7B7',
          'ongoing': '#DBEAFE', // 진행중 - 부드러운 파란색
          'ongoing-text': '#1E40AF',
          'ongoing-border': '#93C5FD',
          'completed': '#F3F4F6', // 완료 - 부드러운 회색
          'completed-text': '#4B5563',
          'completed-border': '#D1D5DB',
        },
        // Alert Colors
        'success': '#10B981',
        'warning': '#F59E0B',
        'danger': '#EF4444',
        'info': '#3B82F6',
        // Text Colors
        'text': {
          primary: '#111827',
          secondary: '#6B7280',
          muted: '#9CA3AF',
        },
        // Background Colors
        'background': {
          DEFAULT: '#FFFFFF',
          secondary: '#F9FAFB',
          tertiary: '#F3F4F6',
        },
      },
      fontSize: {
        // 고령자 친화적 큰 글씨
        'xs': ['14px', { lineHeight: '1.5' }],
        'sm': ['16px', { lineHeight: '1.5' }],
        'base': ['18px', { lineHeight: '1.6' }],
        'lg': ['20px', { lineHeight: '1.6' }],
        'xl': ['24px', { lineHeight: '1.5' }],
        '2xl': ['28px', { lineHeight: '1.4' }],
        '3xl': ['32px', { lineHeight: '1.3' }],
        '4xl': ['36px', { lineHeight: '1.2' }],
        '5xl': ['40px', { lineHeight: '1.2' }],
      },
      fontFamily: {
        'sans': ['Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', 'sans-serif'],
      },
      maxWidth: {
        'mobile': '430px',
        'container': '1200px',
      },
      screens: {
        'xs': '375px',
        'mobile': '430px',
        'tablet': '768px',
        'desktop': '1024px',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '112': '28rem',
        '128': '32rem',
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
      },
      borderRadius: {
        'xl': '16px',
        '2xl': '20px',
        '3xl': '24px',
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'medium': '0 4px 20px -2px rgba(0, 0, 0, 0.1), 0 12px 25px -5px rgba(0, 0, 0, 0.06)',
        'large': '0 10px 40px -3px rgba(0, 0, 0, 0.1), 0 20px 50px -10px rgba(0, 0, 0, 0.08)',
        'glow': '0 0 20px rgba(37, 99, 235, 0.15)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'fade-out': 'fadeOut 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'pulse-slow': 'pulse 3s infinite',
        'pulse-ring': 'pulseRing 1.5s ease-out infinite',
        'blink': 'blink 1s ease-in-out infinite',
        'bounce-gentle': 'bounceGentle 2s ease-in-out infinite',
        'scale-in': 'scaleIn 0.3s ease-out',
        'shake': 'shake 0.5s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        pulseRing: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '80%': { transform: 'scale(1.2)', opacity: '0' },
          '100%': { transform: 'scale(1.2)', opacity: '0' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-2px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(2px)' },
        },
      },
      transitionDuration: {
        '250': '250ms',
        '350': '350ms',
        '400': '400ms',
      },
      minHeight: {
        'button': '56px', // 고령자 친화적 최소 버튼 높이
        'input': '48px',
      },
      zIndex: {
        'dropdown': '100',
        'sticky': '200',
        'fixed': '300',
        'modal-backdrop': '400',
        'modal': '500',
        'popover': '600',
        'tooltip': '700',
        'notification': '800',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/aspect-ratio'),
  ],
} 