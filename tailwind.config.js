/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        plaza: {
          bg: '#FFFFFF',
          text: '#111111',
          'text-2': '#333333',
          'text-3': '#6B6B6B',
          'text-4': '#9A9A9A',
          accent: '#F26B1D',
          'accent-hover': '#DD5C12',
          'accent-tint': '#FFF3EA',
          'accent-line': '#E8D3C2',
          card: '#F6F6F6',
          line: '#D4D4D4',
          'line-subtle': '#EEEEEE',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        apple: '14px',
        card: '16px',
      },
      boxShadow: {
        subtle: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        card: '0 2px 8px -2px rgba(0, 0, 0, 0.06), 0 1px 4px -1px rgba(0, 0, 0, 0.04)',
        hover: '0 10px 25px -5px rgba(242, 107, 29, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
      }
    },
  },
  plugins: [],
}
