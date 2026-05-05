/**
 * One-time migration — strips the "fake_" prefix from seed accounts.
 *
 * Usage:
 *   node scripts/rename-fake-users.js
 */

const fs = require('fs');
require('dotenv').config({ path: fs.existsSync('.env.local') ? '.env.local' : '.env' });

const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const RENAMES = [
  { from: 'fake_alex',   to: 'alex' },
  { from: 'fake_maya',   to: 'maya' },
  { from: 'fake_jordan', to: 'jordan' },
  { from: 'fake_priya',  to: 'priya' },
  { from: 'fake_sam',    to: 'sam' },
  { from: 'fake_leo',    to: 'leo' },
  { from: 'fake_nina',   to: 'nina' },
  { from: 'fake_tom',    to: 'tom' },
];

const run = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const { from, to } of RENAMES) {
      const existing = await client.query(
        'SELECT id FROM accounts WHERE username = $1', [from]
      );
      if (existing.rowCount === 0) {
        console.log(`  skip  ${from} (not found)`);
        continue;
      }
      const conflict = await client.query(
        'SELECT id FROM accounts WHERE username = $1', [to]
      );
      if (conflict.rowCount > 0) {
        console.log(`  skip  ${from} → ${to} (target username already taken)`);
        continue;
      }
      await client.query(
        'UPDATE accounts SET username = $1, email = $2 WHERE username = $3',
        [to, `${to}@example.com`, from]
      );
      console.log(`  renamed  ${from} → ${to}`);
    }

    await client.query('COMMIT');
    console.log('\nDone.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error — rolled back:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
};

run();
