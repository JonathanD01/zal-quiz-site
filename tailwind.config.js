/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./views/*.ejs"],
  darkMode: 'class',
  theme: {
    extend: {
      transitionProperty: {
        'max-height': 'max-height'
      }
    },
  },
  plugins: [
		require('tailwindcss'),
    	require('autoprefixer'),
	],
}