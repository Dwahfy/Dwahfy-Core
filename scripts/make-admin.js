#!/usr/bin/env node
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { Pool } = require('pg');

const username = (process.argv[2] || '').trim().toLowerCase();

if (!username) {
  console.error('Usage: node scripts/make-admin.js <username>');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  try {
    const result = await pool.query(
      'UPDATE accounts SET is_admin = TRUE WHERE username = $1 RETURNING username, is_admin',
      [username]
    );

    if (result.rowCount === 0) {
      console.error(`Account "${username}" not found`);
      process.exit(1);
    }

    console.log(`"${username}" is now an admin`);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
