const { pool } = require('../config/db');

const BANNER_COLS = 'id, message, scope, preset, bg_color, text_color, dismissible, active, created_at, updated_at';

const listBanners = async () => {
  const { rows } = await pool.query(
    `SELECT ${BANNER_COLS} FROM banners ORDER BY created_at DESC`
  );
  return rows;
};

const createBanner = async ({ message, scope = 'global', preset = 'info', bg_color = null, text_color = null, dismissible = true }) => {
  const { rows } = await pool.query(
    `INSERT INTO banners (message, scope, preset, bg_color, text_color, dismissible)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${BANNER_COLS}`,
    [message, scope, preset, bg_color, text_color, dismissible]
  );
  return rows[0];
};

const activateBanner = async (id) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE banners SET active = FALSE, updated_at = NOW()');
    const { rows } = await client.query(
      `UPDATE banners SET active = TRUE, updated_at = NOW() WHERE id = $1 RETURNING ${BANNER_COLS}`,
      [id]
    );
    await client.query('COMMIT');
    return rows[0] ?? null;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const deactivateBanner = async (id) => {
  const { rows } = await pool.query(
    `UPDATE banners SET active = FALSE, updated_at = NOW() WHERE id = $1 RETURNING ${BANNER_COLS}`,
    [id]
  );
  return rows[0] ?? null;
};

const deleteBanner = async (id) => {
  const { rowCount } = await pool.query('DELETE FROM banners WHERE id = $1', [id]);
  return rowCount > 0;
};

const getActiveBanner = async () => {
  const { rows } = await pool.query(
    `SELECT ${BANNER_COLS} FROM banners WHERE active = TRUE LIMIT 1`
  );
  return rows[0] ?? null;
};

module.exports = { listBanners, createBanner, activateBanner, deactivateBanner, deleteBanner, getActiveBanner };
