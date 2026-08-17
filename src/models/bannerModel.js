const { pool } = require('../config/db');

const getActiveBanner = async () => {
  const result = await pool.query(
    `SELECT id, message, scope, preset, bg_color, text_color, dismissible
     FROM banners WHERE active = true LIMIT 1`
  );
  return result.rows[0] || null;
};

const getAllBanners = async () => {
  const result = await pool.query(
    `SELECT id, message, scope, preset, bg_color, text_color, dismissible, active, created_at, updated_at
     FROM banners ORDER BY created_at DESC`
  );
  return result.rows;
};

const createBanner = async ({ message, scope, preset, bg_color, text_color, dismissible }) => {
  const result = await pool.query(
    `INSERT INTO banners (message, scope, preset, bg_color, text_color, dismissible)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, message, scope, preset, bg_color, text_color, dismissible, active, created_at, updated_at`,
    [message, scope || 'landing', preset || 'info', bg_color || null, text_color || null, dismissible !== false]
  );
  return result.rows[0];
};

const updateBanner = async (id, fields) => {
  const { message, scope, preset, bg_color, text_color, dismissible } = fields;
  const result = await pool.query(
    `UPDATE banners
     SET message = COALESCE($2, message),
         scope = COALESCE($3, scope),
         preset = COALESCE($4, preset),
         bg_color = $5,
         text_color = $6,
         dismissible = COALESCE($7, dismissible),
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, message, scope, preset, bg_color, text_color, dismissible, active, created_at, updated_at`,
    [id, message || null, scope || null, preset || null,
     bg_color !== undefined ? bg_color : null,
     text_color !== undefined ? text_color : null,
     dismissible !== undefined ? dismissible : null]
  );
  return result.rows[0] || null;
};

const activateBanner = async (id) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`UPDATE banners SET active = false, updated_at = NOW()`);
    const result = await client.query(
      `UPDATE banners SET active = true, updated_at = NOW() WHERE id = $1
       RETURNING id, message, scope, preset, bg_color, text_color, dismissible, active, created_at, updated_at`,
      [id]
    );
    await client.query('COMMIT');
    return result.rows[0] || null;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

const deactivateBanner = async (id) => {
  const result = await pool.query(
    `UPDATE banners SET active = false, updated_at = NOW() WHERE id = $1
     RETURNING id, message, scope, preset, bg_color, text_color, dismissible, active`,
    [id]
  );
  return result.rows[0] || null;
};

const deleteBanner = async (id) => {
  const result = await pool.query(
    `DELETE FROM banners WHERE id = $1 RETURNING id`,
    [id]
  );
  return result.rowCount > 0;
};

module.exports = {
  getActiveBanner,
  getAllBanners,
  createBanner,
  updateBanner,
  activateBanner,
  deactivateBanner,
  deleteBanner,
};
