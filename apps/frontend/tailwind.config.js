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
        'gold-vip': 'var(--color-gold-vip, #B8902A)',
        background: 'var(--color-background, #fbf8ff)',
        surface: {
          DEFAULT: 'var(--color-background, #fbf8ff)',
          base: 'var(--color-surface-base, #FFFFFF)',
          alt: 'var(--color-surface-alt, #F7F4F4)',
          highlight: 'var(--color-surface-highlight, #FDECEF)',
          dim: 'var(--color-surface-dim, #dcd9e0)',
          bright: 'var(--color-surface-bright, #fbf8ff)',
          'container-low': 'var(--color-surface-container-low, #f5f2f9)',
          container: 'var(--color-surface-container, #f0edf4)',
          'container-high': 'var(--color-surface-container-high, #eae7ee)',
          'container-highest': 'var(--color-surface-container-highest, #e4e1e8)',
        },
        text: {
          primary: 'var(--color-text-primary, #1A1A1F)',
          secondary: 'var(--color-text-secondary, #5B5B66)',
          muted: 'var(--color-text-muted, #8A8A94)',
        },
        'border-subtle': 'var(--color-border-subtle, #E8E0E0)',
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
