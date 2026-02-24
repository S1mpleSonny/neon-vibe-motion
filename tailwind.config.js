/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // Cyberpunk neon color palette
        background: {
          primary: '#0A0A0F',   // Deep black
          secondary: '#0F0F23', // Midnight blue
          elevated: '#1A1A2E',  // Dark grey
        },
        accent: {
          primary: '#00FFFF',   // Neon cyan
          secondary: '#7C3AED', // Neon purple
          tertiary: '#FF006E',  // Hot pink
          success: '#00FF80',   // Neon green
        },
        text: {
          primary: '#E2E8F0',   // Light grey
          muted: '#94A3B8',     // Medium grey
          disabled: '#475569',  // Dark grey
        },
        border: {
          default: '#4C1D95',   // Purple tint
          hover: '#0080FF',     // Cyan tint
        },
      },
      fontFamily: {
        display: ['Russo One', 'sans-serif'],
        body: ['Chakra Petch', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
      },
      boxShadow: {
        'neon-soft': '0 0 10px rgba(0, 255, 255, 0.5)',
        'neon-medium': '0 0 20px rgba(0, 255, 255, 0.7), 0 0 40px rgba(0, 255, 255, 0.3)',
        'neon-strong': '0 0 30px rgba(0, 255, 255, 0.8), 0 0 60px rgba(0, 255, 255, 0.4)',
        'neon-pink': '0 0 20px rgba(255, 0, 110, 0.5)',
        'neon-purple': '0 0 20px rgba(124, 58, 237, 0.5)',
        'neon-green': '0 0 20px rgba(0, 255, 128, 0.5)',
      },
    },
  },
  plugins: [],
}
