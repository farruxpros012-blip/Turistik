/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        figma: {
          bg: '#1e1e1e',
          panel: '#2c2c2c',
          sidebar: '#252525',
          border: '#3d3d3d',
          hover: '#383838',
          accent: '#18a0fb',
          purple: '#a259ff',
          green: '#1bc47d',
          text: '#e5e5e5',
          muted: '#8c8c8c',
          canvas: '#1a1a1a',
          input: '#3d3d3d',
        }
      },
    },
  },
  plugins: [],
}

