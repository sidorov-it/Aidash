const path = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    path.join(__dirname, 'index.html'),
    path.join(__dirname, 'src/**/*.{ts,tsx}'),
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#0f1117',
          1: '#161822',
          2: '#1c1f2e',
          3: '#252939',
        },
        border: {
          DEFAULT: '#2a2e3e',
        },
      },
    },
  },
  plugins: [],
};
