// Run the schema migration by hand: `npm run migrate`.
// Serverless has no boot hook to hang this off, and running DDL from a request
// handler would let concurrent invocations race each other — so it's explicit.
require('dotenv').config();
const migrate = require('../src/migrate');
const db = require('../src/db');

const target = (process.env.DATABASE_URL || '').replace(/(\/\/[^:]+:)[^@]+@/, '$1***@');
console.log('Migrating:', target || '(DATABASE_URL not set)');

migrate()
  .then(() => db.pool.end())
  .then(() => console.log('Done.'))
  .catch((err) => { console.error('Migration failed:', err); process.exit(1); });
