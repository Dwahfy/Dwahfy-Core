const { pool } = require('../config/db');

const upsertIdentityByEmail = async (email) => {
  const result = await pool.query(
    `
    INSERT INTO identities (email, email_verified)
    VALUES ($1, true)
    ON CONFLICT (email) DO UPDATE SET email_verified = true
    RETURNING id, email
  `,
    [email]
  );
  return result.rows[0];
};

const getIdentityById = async (identityId) => {
  const result = await pool.query(
    'SELECT id, email FROM identities WHERE id = $1 LIMIT 1',
    [identityId]
  );
  return result.rows[0] || null;
};

module.exports = {
  upsertIdentityByEmail,
  getIdentityById,
};
