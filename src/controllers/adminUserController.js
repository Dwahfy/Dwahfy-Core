const { pool } = require('../config/db');

const listUsers = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const offset = parseInt(req.query.offset, 10) || 0;
    const search = (req.query.search || '').trim().toLowerCase();

    let query;
    let params;

    if (search) {
      query = `
        SELECT a.id, a.username, a.is_admin, a.created_at, i.email
        FROM accounts a
        JOIN identities i ON i.id = a.identity_id
        WHERE a.username ILIKE $3
        ORDER BY a.created_at DESC
        LIMIT $1 OFFSET $2
      `;
      params = [limit, offset, `%${search}%`];
    } else {
      query = `
        SELECT a.id, a.username, a.is_admin, a.created_at, i.email
        FROM accounts a
        JOIN identities i ON i.id = a.identity_id
        ORDER BY a.created_at DESC
        LIMIT $1 OFFSET $2
      `;
      params = [limit, offset];
    }

    const [users, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query('SELECT COUNT(*) FROM accounts'),
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

module.exports = { listUsers, toggleAdmin, deleteAccount };
