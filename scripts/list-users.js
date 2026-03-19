require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const main = async () => {
  const { rows } = await pool.query(`
    SELECT
      a.id,
      a.username,
      i.email,
      i.email_verified,
      a.is_admin,
      p.display_name,
      p.bad_words_enabled,
      a.created_at
    FROM accounts a
    JOIN identities i ON i.id = a.identity_id
    LEFT JOIN profiles p ON p.account_id = a.id
    ORDER BY a.id ASC
  `);

  if (rows.length === 0) {
    console.log('No users found.');
    return;
  }

  console.log(`\n${rows.length} user(s):\n`);
  console.table(
    rows.map((r) => ({
      id: r.id,
      username: r.username,
      email: r.email,
      verified: r.email_verified,
      admin: r.is_admin,
      display_name: r.display_name ?? '',
      filter: r.bad_words_enabled,
      joined: new Date(r.created_at).toLocaleDateString(),
    })),
  );
};

main()
  .catch((err) => {
    console.error('Error:', err.message);
    process.exit(1);
  })
  .finally(() => pool.end());
