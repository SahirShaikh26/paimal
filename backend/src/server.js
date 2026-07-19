// Local long-running entry point. On Vercel the app is served by api/[[...slug]].js
// instead, and migrations are run deliberately via `npm run migrate`.
const app = require('./app');
const migrate = require('./migrate');

const PORT = process.env.PORT || 4000;

migrate().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
