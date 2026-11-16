// Vercel Serverless Function Entry Point
// Routes all /api/* requests to the Express application in ../server/server.js
const app = require('../server/server');

module.exports = app;
