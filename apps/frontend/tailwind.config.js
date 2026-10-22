/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#9e001f',
          container: '#c8102e',
          fixed: '#ffdad8',
          'fixed-dim': '#ffb3b1',
        },
        secondary: {
          DEFAULT: '#b12a34',
          container: '#fd6166',
        },
        tertiary: {
          DEFAULT: '#624900',
          container: '#806000',
          fixed: '#ffdf9b',
        },
        'gold-vip': '#B8902A',
        background: '#fbf8ff',
        surface: {
          DEFAULT: '#fbf8ff',
          base: '#FFFFFF',
          alt: '#F7F4F4',
          highlight: '#FDECEF',
          dim: '#dcd9e0',
          bright: '#fbf8ff',
          'container-low': '#f5f2f9',
          container: '#f0edf4',
          'container-high': '#eae7ee',
          'container-highest': '#e4e1e8',
        },
        text: {
          primary: '#1A1A1F',
          secondary: '#5B5B66',
          muted: '#8A8A94',
        },
        'border-subtle': '#E8E0E0',
        status: {
          success: '#1E8E5A',
          warning: '#D98A00',
          error: '#B3261E',
          info: '#1F6FD1',
        },
      },
      fontFamily: {
        sans: ['"Be Vietnam Pro"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        full: '9999px',
      },
    },
  },
  plugins: [],
};
