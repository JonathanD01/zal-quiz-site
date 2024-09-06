// app.js

// Required modules
var express = require('express');
var compression = require('compression');
var minify = require('express-minify');
var path = require('path');

// Create Express app
const app = express();

// TODO Compression / Minifiy breaks tailwind dark mode
// compression
//app.use(compression({ filter: shouldCompress }));

// minify
//app.use(minify());

// Set up static file serving
app.use(express.static(path.join(__dirname, 'public')));

// Set up EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Define route for the homepage
app.get('/', (req, res) => {
	res.render('index');
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});

function shouldCompress (req, res) {
  if (req.headers['x-no-compression']) {
    // don't compress responses with this request header
    return false;
  }

  // fallback to standard filter function
  return compression.filter(req, res);
}