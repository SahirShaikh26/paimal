// Vercel serverless entry: every request is routed here by vercel.json, and the
// Express app does its own routing from there. Vercel preserves the original
// request path, so the app's /api/... mounts match without any rewriting.
module.exports = require('../src/app');
