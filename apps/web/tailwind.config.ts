import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      keyframes: {
        aurora: {
          '0%': { transform: 'translateY(-10%) translateX(-10%) scale(1)' },
          '50%': { transform: 'translateY(10%) translateX(10%) scale(1.1)' },
          '100%': { transform: 'translateY(-10%) translateX(-10%) scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shine: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        fadein: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        aurora: 'aurora 14s ease-in-out infinite',
        float: 'float 6s ease-in-out infinite',
        shine: 'shine 3s linear infinite',
        marquee: 'marquee 30s linear infinite',
        fadein: 'fadein 600ms ease forwards',
      },
      backgroundImage: {
        'gradient-shine':
          'linear-gradient(110deg, rgba(255,255,255,0) 30%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0) 70%)',
      },
    },
  },
  plugins: [],
} satisfies Config;


