/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        cream: '#F5F0E8',
        brown: {
          dark: '#2C1A0E',
          mid: '#6B3F1F',
          light: '#C4956A',
        },
        accent: '#D4824A',       // was: amber (conflicts with Tailwind built-in)
        muted: '#7A5C3E',
        bookBorder: 'rgba(107, 63, 31, 0.15)',  // was: border (conflicts with Tailwind built-in)
        cardBg: '#FAF6EE',
        placeholder: '#E8E0D4',
        danger: '#c0392b',
      },
      fontFamily: {
        lora: ['Lora', 'serif'],
        crimson: ['Crimson Pro', 'Georgia', 'serif'],
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
      animation: {
        'fade-up': 'fadeUp 0.4s ease both',
        'fade-in': 'fadeIn 0.2s ease-out',
      },
      boxShadow: {
        book: '4px 6px 20px rgba(44, 26, 14, 0.2)',
        card: '0 4px 12px rgba(44, 26, 14, 0.1)',
        cardHover: '0 8px 28px rgba(44, 26, 14, 0.1)',
        image: '0 8px 32px rgba(44, 26, 14, 0.2)',
      },
      typography: ({ theme }) => ({
        DEFAULT: {
          css: {
            color: theme('colors.brown.dark'),
            fontFamily: "'Crimson Pro', Georgia, serif",
            fontSize: '16px',
            lineHeight: '1.75',
            strong: { 
              color: theme('colors.brown.dark'),
              fontWeight: '600',
            },
            em: {
              fontStyle: 'italic',
            },
            blockquote: {
              borderLeftColor: theme('colors.accent'),
              borderLeftWidth: '3px',
              color: theme('colors.brown.mid'),
              fontStyle: 'italic',
              marginTop: '0.8em',
              marginBottom: '0.8em',
              paddingLeft: '1em',
              paddingTop: '0.2em',
              paddingBottom: '0.2em',
            },
            code: {
              backgroundColor: 'rgba(107, 63, 31, 0.08)',
              fontFamily: 'monospace',
              fontSize: '0.88em',
              padding: '0.1em 0.4em',
              borderRadius: '4px',
            },
            'code::before': {
              content: '""',
            },
            'code::after': {
              content: '""',
            },
            'h1, h2, h3': {
              fontFamily: "'Lora', serif",
              color: theme('colors.brown.dark'),
              lineHeight: '1.3',
            },
            h1: {
              fontSize: '1.2em',
              marginTop: '1em',
              marginBottom: '0.4em',
            },
            h2: {
              fontSize: '1.1em',
              marginTop: '1em',
              marginBottom: '0.4em',
            },
            h3: {
              fontSize: '1em',
              marginTop: '1em',
              marginBottom: '0.4em',
            },
            p: {
              marginBottom: '0.9em',
            },
            'p:last-child': {
              marginBottom: '0',
            },
            'ul, ol': {
              paddingLeft: '1.4em',
              marginBottom: '0.9em',
            },
            li: {
              marginBottom: '0.3em',
            },
          },
        },
      }),
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
