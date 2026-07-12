/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require("@leafx/config/tailwind")],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "../ui/src/**/*.{ts,tsx}",
  ],
  plugins: [require("tailwindcss-animate")],
};
