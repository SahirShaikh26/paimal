const { Pool } = require('pg');
require('dotenv').config();

// On Vercel every warm function instance keeps its own pool, and there can be
// many instances at once — so each one holds a single connection and gives it up
// quickly, or they collectively exhaust Supabase's pooler. A long-running server
// has no such competition and gets the normal pool.
const serverless = !!process.env.VERCEL;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Managed Postgres hosts (Supabase, some Railway plans) require SSL. Enable it
  // when the connection string points at one; node-postgres accepts their certs
  // with rejectUnauthorized:false (the cert chain isn't locally verifiable).
  ssl: /supabase|sslmode=require/.test(process.env.DATABASE_URL || '')
    ? { rejectUnauthorized: false }
    : false,
  ...(serverless ? { max: 1, idleTimeoutMillis: 10_000, connectionTimeoutMillis: 15_000 } : {}),
});

// A pooled connection dropped while idle (managed poolers do this routinely)
// surfaces here as an error on an idle client. node-postgres discards that
// client and opens a fresh one on the next query, so this is recoverable — just
// log it. Crashing the whole process on every idle drop causes restart loops.
pool.on('error', (err) => {
  console.error('Unexpected idle DB client error (recovering):', err.message);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
