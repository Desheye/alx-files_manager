const express = require('express');

const app = express();
const morgan = require('morgan');
const routes = require('./routes');

const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());

// Use morgan with 'dev' format for concise output colored by response status
app.use(morgan('dev'));

// Load all routes from routes/index.js
app.use('/', routes);

const server = app.listen(PORT, () => {
  console.log(`App Started At ${PORT}`);
});

module.exports = server;
