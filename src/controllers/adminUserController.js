const { pool } = require('../config/db');

const listUsers = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const offset = parseInt(req.query.offset, 10) || 0;
    const search = (req.query.search || '').trim().toLowerCase();
    const beta = req.query.beta;
    const badgeId = parseInt(req.query.badgeId, 10);

    const conditions = [];
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`a.username ILIKE $${params.length}`);
    }
    if (beta === 'true' || beta === 'false') {
      params.push(beta === 'true');
      conditions.push(`a.is_beta = $${params.length}`);
    }
    if (Number.isInteger(badgeId)) {
      params.push(badgeId);
      conditions.push(`EXISTS (
        SELECT 1 FROM user_badges ub2
        WHERE ub2.account_id = a.id AND ub2.badge_id = $${params.length}
      )`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const countParams = [...params];

    params.push(limit);
    const limitParam = params.length;
    params.push(offset);
    const offsetParam = params.length;

    const query = `
      SELECT
        a.id, a.username, a.is_admin, a.is_beta, a.created_at, i.email,
        COALESCE(
          json_agg(
            json_build_object(
              'id', b.id, 'slug', b.slug, 'name', b.name,
              'imageUrl', b.image_url, 'rarity', b.rarity
            )
          ) FILTER (WHERE b.id IS NOT NULL),
          '[]'
        ) AS badges
      FROM accounts a
      JOIN identities i ON i.id = a.identity_id
      LEFT JOIN user_badges ub ON ub.account_id = a.id
      LEFT JOIN badges b ON b.id = ub.badge_id
      ${whereClause}
      GROUP BY a.id, i.email
      ORDER BY a.created_at DESC
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `;

    const countQuery = `SELECT COUNT(*) FROM accounts a ${whereClause}`;

    const [users, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams),
    ]);

    return res.json({
      users: users.rows,
      total: parseInt(countResult.rows[0].count, 10),
    });
  } catch (error) {
    return res.status(500).json({ error: `Failed to list users: ${error.message}` });
  }
};

const toggleAdmin = async (req, res) => {
  try {
    const accountId = parseInt(req.params.accountId, 10);
    if (!Number.isInteger(accountId)) {
      return res.status(400).json({ message: 'Valid accountId is required' });
    }

    const result = await pool.query(
      `UPDATE accounts SET is_admin = NOT is_admin WHERE id = $1
       RETURNING id, username, is_admin`,
      [accountId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({ user: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ error: `Failed to toggle admin: ${error.message}` });
  }
};

const toggleBeta = async (req, res) => {
  try {
    const accountId = parseInt(req.params.accountId, 10);
    if (!Number.isInteger(accountId)) {
      return res.status(400).json({ message: 'Valid accountId is required' });
    }

    const result = await pool.query(
      `UPDATE accounts SET is_beta = NOT is_beta WHERE id = $1
       RETURNING id, username, is_beta`,
      [accountId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({ user: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ error: `Failed to toggle beta: ${error.message}` });
  }
};

const deleteAccount = async (req, res) => {
  try {
    const accountId = parseInt(req.params.accountId, 10);
    if (!Number.isInteger(accountId)) {
      return res.status(400).json({ message: 'Valid accountId is required' });
    }

    const result = await pool.query(
      'DELETE FROM accounts WHERE id = $1 RETURNING id',
      [accountId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({ message: 'Account deleted' });
  } catch (error) {
    return res.status(500).json({ error: `Failed to delete account: ${error.message}` });
  }
};

module.exports = { listUsers, toggleAdmin, toggleBeta, deleteAccount };
