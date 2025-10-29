/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ["./index.html","./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cruceño: {
          green: "#0B6623",
          greenLight: "#24A148",
          red: "#E30B17"
        }
      },
      boxShadow: {
        soft: "0 10px 25px -10px rgba(0,0,0,0.25)"
      },
      borderRadius: {
        xl2: "1rem"
      }
    }
  },
  plugins: [require('@tailwindcss/forms')],
}