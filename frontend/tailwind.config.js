/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          ink: '#0B1220',
          900: '#0F172A',
          800: '#1E293B',
          700: '#146356',
          600: '#17856A',
          500: '#1F8F73',
          400: '#3BA88A',
          300: '#7EC6AE',
          200: '#B8DDD0',
          100: '#E8F5EF',
          50: '#F4FAF7',
          muted: '#64748B',
          border: '#E2E8F0',
          accent: '#EA580C',
          'accent-200': '#FDBA74'
        },
        navy: '#0F172A',
        softBg: '#F8FAFC'
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif']
      },
      fontSize: {
        'display': ['2rem', { lineHeight: '2.375rem', letterSpacing: '-0.025em', fontWeight: '700' }],
        'heading': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.02em', fontWeight: '700' }],
        'subheading': ['1.125rem', { lineHeight: '1.625rem', letterSpacing: '-0.015em', fontWeight: '600' }],
        'body': ['0.875rem', { lineHeight: '1.375rem', fontWeight: '400' }],
        'caption': ['0.75rem', { lineHeight: '1.125rem', fontWeight: '500' }],
        'micro': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.04em', fontWeight: '600' }]
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '20px',
        '4xl': '24px'
      },
      boxShadow: {
        'xs': '0 1px 2px rgba(15, 23, 42, 0.04)',
        'card': '0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 16px rgba(15, 23, 42, 0.06)',
        'card-hover': '0 2px 4px rgba(15, 23, 42, 0.04), 0 12px 32px rgba(15, 23, 42, 0.08)',
        'elevated': '0 8px 32px rgba(15, 23, 42, 0.12), 0 2px 8px rgba(15, 23, 42, 0.06)',
        'float': '0 16px 48px rgba(15, 23, 42, 0.14)',
        'inner-soft': 'inset 0 1px 2px rgba(15, 23, 42, 0.06)',
        'focus': '0 0 0 3px rgba(31, 143, 115, 0.18)'
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)'
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        }
      }
    }
  },
  plugins: []
}
