const { pool } = require('../config/db');

const listUsersHandler = async (req, res) => {
  const search = (req.query.search || '').trim().toLowerCase();
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);

  const params = search ? [`%${search}%`, limit] : [limit];
  const searchFilter = search
    ? `AND (LOWER(accounts.username) LIKE $1 OR LOWER(COALESCE(profiles.display_name, '')) LIKE $1)`
    : '';

  const result = await pool.query(
    `
    SELECT
      accounts.username,
      COALESCE(profiles.display_name, accounts.username) AS display_name,
      profiles.avatar_url,
      profiles.bio
    FROM accounts
    LEFT JOIN profiles ON profiles.account_id = accounts.id
    WHERE TRUE ${searchFilter}
    ORDER BY accounts.created_at DESC
    LIMIT ${search ? '$2' : '$1'}
    `,
    params
  );

  res.json({
    users: result.rows.map((r) => ({
      username: r.username,
      displayName: r.display_name,
      avatarUrl: r.avatar_url ?? null,
      bio: r.bio ?? null,
    })),
  });
};

module.exports = { listUsersHandler };
