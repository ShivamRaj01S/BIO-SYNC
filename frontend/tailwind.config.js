/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        blood: {
          red: '#8B1538',
          dark: '#5C0E26',
          light: '#B71C3C',
          pale: '#F8E8EA',
        },
        medical: {
          gray: '#6B7280',
          light: '#F3F4F6',
          dark: '#374151',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        display: ['Sora', 'DM Sans', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
