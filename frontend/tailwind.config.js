/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        border: {
          DEFAULT: 'hsl(var(--border))',
          subtle: '#1E293B',
          strong: '#334155',
        },
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: '#2563EB',
          foreground: '#FFFFFF',
          hover: '#1D4ED8',
          subtle: 'rgba(37, 99, 235, 0.15)',
        },
        surface: {
          DEFAULT: '#111827',
          elevated: '#1F2937',
          canvas: '#0B0F17',
          subtle: '#0E131F',
        },
        status: {
          success: {
            DEFAULT: '#10B981',
            bg: 'rgba(16, 185, 129, 0.12)',
            border: 'rgba(16, 185, 129, 0.3)',
          },
          warning: {
            DEFAULT: '#F59E0B',
            bg: 'rgba(245, 158, 11, 0.12)',
            border: 'rgba(245, 158, 11, 0.3)',
          },
          danger: {
            DEFAULT: '#F43F5E',
            bg: 'rgba(244, 63, 94, 0.12)',
            border: 'rgba(244, 63, 94, 0.3)',
          },
          info: {
            DEFAULT: '#38BDF8',
            bg: 'rgba(56, 189, 248, 0.12)',
            border: 'rgba(56, 189, 248, 0.3)',
          },
        },
      },
      boxShadow: {
        glow: '0 0 20px -5px rgba(37, 99, 235, 0.25)',
        'surface-elevation': '0 8px 30px rgba(0, 0, 0, 0.45)',
      },
      fontFamily: {
        sans: ['Geist', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['Geist Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};
