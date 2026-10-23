/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Landing Page Design Tokens (Editorial Minimalism)
        editorial: {
          bg: '#fdfcfc',
          warm: '#f5f3f1',
          divider: '#ebe8e4',
          text: '#000000',
          body: '#44403b',
          muted: '#777169',
          violet: '#0447ff', // Exclusively for decorative product visuals
          orange: '#ff4704', // Exclusively for decorative product visuals
        },
        // Application Design Tokens (Vercel-inspired Monochromatic Developer Tool)
        app: {
          canvas: '#fafafa',
          surface: '#ffffff',
          primary: '#171717',
          body: '#4d4d4d',
          secondary: '#666666',
          muted: '#8f8f8f',
          border: '#ebebeb',
          hover: '#f5f5f5',
          active: '#eaeaea',
          success: '#297a3a',
          'success-bg': '#f0fdf4',
          'success-border': '#bbf7d0',
          error: '#e5484d',
          'error-bg': '#fef2f2',
          'error-border': '#fecaca',
          warning: '#d97706',
          'warning-bg': '#fffbeb',
          'warning-border': '#fde68a',
          info: '#2563eb',
          'info-bg': '#eff6ff',
          'info-border': '#bfdbfe',
        },
      },
      fontFamily: {
        mono: ['Geist Mono', 'JetBrains Mono', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['Geist', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        'app': '6px',
      },
      boxShadow: {
        'app-card': '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        'app-elevated': '0 4px 12px 0 rgba(0, 0, 0, 0.06)',
      },
    },
  },
  plugins: [],
}
