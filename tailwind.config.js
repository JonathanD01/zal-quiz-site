/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./views/*.ejs"],
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [
		require('tailwindcss'),
    	require('autoprefixer'),
	],
}