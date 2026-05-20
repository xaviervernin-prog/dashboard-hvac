const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Direct PostgreSQL pool for complex queries, transactions, and FOR UPDATE locks
// Connection string format: postgresql://user:pass@db.xxxx.supabase.co:5432/postgres
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const db = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect()
};

module.exports = { supabase, db };
