/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{js,jsx}",
    "./src/components/**/*.{js,jsx}",
    "./src/hooks/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand palette derived from the design reference
        brand: {
          DEFAULT: "#5b5bf6", // indigo accent (principal)
          50: "#eef0ff",
          100: "#e0e2ff",
          500: "#5b5bf6",
          600: "#4f46e5",
          700: "#4338ca",
        },
        interest: {
          DEFAULT: "#f5a623", // amber/orange (interest)
          500: "#f5a623",
          600: "#e8910f",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
