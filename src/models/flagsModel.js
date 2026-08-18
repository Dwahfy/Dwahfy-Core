const { pool } = require('../config/db');

const listFlags = async () => {
  const { rows } = await pool.query(
    `SELECT id, key, enabled, beta_only, status, description, created_at, updated_at
     FROM feature_flags ORDER BY created_at ASC`
  );
  return rows;
};

const createFlag = async (key, { description = null, beta_only = false } = {}) => {
  const { rows } = await pool.query(
    `INSERT INTO feature_flags (key, description, beta_only)
     VALUES ($1, $2, $3)
     RETURNING id, key, enabled, beta_only, status, description, created_at, updated_at`,
    [key, description, beta_only]
  );
  return rows[0];
};

const updateFlag = async (key, fields) => {
  const allowed = ['enabled', 'beta_only', 'status'];
  const updates = Object.entries(fields).filter(([k]) => allowed.includes(k));
  if (!updates.length) return null;

  const setClauses = updates.map(([k], i) => `${k} = $${i + 2}`).join(', ');
  const values = [key, ...updates.map(([, v]) => v)];

  const { rows } = await pool.query(
    `UPDATE feature_flags SET ${setClauses}, updated_at = NOW()
     WHERE key = $1
     RETURNING id, key, enabled, beta_only, status, description, created_at, updated_at`,
    values
  );
  return rows[0] ?? null;
};

const deleteFlag = async (key) => {
  const { rowCount } = await pool.query('DELETE FROM feature_flags WHERE key = $1', [key]);
  return rowCount > 0;
};

const getPublicFlags = async () => {
  const { rows } = await pool.query(
    `SELECT key, enabled, status FROM feature_flags WHERE enabled = TRUE OR status = 'permanent'`
  );
  return rows;
};

module.exports = { listFlags, createFlag, updateFlag, deleteFlag, getPublicFlags };
