const { pool } = require('../config/db');

const getAllFlags = async () => {
  const result = await pool.query(
    `SELECT id, key, enabled, beta_only, status, description, created_at, updated_at
     FROM feature_flags ORDER BY created_at ASC`
  );
  return result.rows;
};

const getFlagByKey = async (key) => {
  const result = await pool.query(
    `SELECT id, key, enabled, beta_only, status, description FROM feature_flags WHERE key = $1`,
    [key]
  );
  return result.rows[0] || null;
};

const createFlag = async ({ key, description, beta_only }) => {
  const result = await pool.query(
    `INSERT INTO feature_flags (key, description, beta_only)
     VALUES ($1, $2, $3)
     RETURNING id, key, enabled, beta_only, status, description, created_at, updated_at`,
    [key, description || null, beta_only || false]
  );
  return result.rows[0];
};

const updateFlag = async (key, { enabled, beta_only, status }) => {
  const result = await pool.query(
    `UPDATE feature_flags
     SET enabled = COALESCE($2, enabled),
         beta_only = COALESCE($3, beta_only),
         status = COALESCE($4, status),
         updated_at = NOW()
     WHERE key = $1
     RETURNING id, key, enabled, beta_only, status, description, created_at, updated_at`,
    [key, enabled ?? null, beta_only ?? null, status || null]
  );
  return result.rows[0] || null;
};

const deleteFlag = async (key) => {
  const result = await pool.query(
    `DELETE FROM feature_flags WHERE key = $1 AND status != 'permanent' RETURNING id`,
    [key]
  );
  return result.rowCount > 0;
};

const getActiveFlags = async () => {
  const result = await pool.query(
    `SELECT key, enabled, beta_only, status FROM feature_flags`
  );
  return result.rows;
};

module.exports = { getAllFlags, getFlagByKey, createFlag, updateFlag, deleteFlag, getActiveFlags };
