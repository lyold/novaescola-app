import type { Config } from 'tailwindcss';

// Cores convertidas de HSL para hex, espelhando o design system do projeto web
const config: Config = {
  content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: '#17191f',
        foreground: '#ffffff',
        card: {
          DEFAULT: '#1c1f2a',
          foreground: '#ffffff',
        },
        primary: {
          DEFAULT: '#ffc105',
          foreground: '#17191f',
        },
        secondary: {
          DEFAULT: '#22263a',
          foreground: '#ffffff',
        },
        muted: {
          DEFAULT: '#282d3d',
          foreground: '#b3b3b3',
        },
        accent: {
          DEFAULT: '#ffc105',
          foreground: '#17191f',
        },
        destructive: {
          DEFAULT: '#ef4444',
          foreground: '#ffffff',
        },
        border: '#ffc105',
        input: '#282d3d',
        ring: '#ffc105',
        coin: {
          DEFAULT: '#ffc105',
          glow: '#ffd54f',
        },
        success: {
          DEFAULT: '#16a34a',
          foreground: '#ffffff',
        },
        warning: {
          DEFAULT: '#f59e0b',
          foreground: '#17191f',
        },
      },
      fontFamily: {
        sans: ['Inter'],
        display: ['Fredoka'],
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
    },
  },
  plugins: [],
};

export default config;
