const { pool } = require('../config/db');

const listBadges = async () => {
  const result = await pool.query(
    `
    SELECT id, slug, name, image_url, created_at, updated_at
    FROM badges
    ORDER BY created_at ASC
  `
  );
  return result.rows;
};

const getBadgeById = async (badgeId) => {
  const result = await pool.query(
    `
    SELECT id, slug, name, image_url, created_at, updated_at
    FROM badges
    WHERE id = $1
  `,
    [badgeId]
  );
  return result.rows[0] || null;
};

const createBadge = async ({ slug, name, imageUrl }) => {
  const result = await pool.query(
    `
    INSERT INTO badges (slug, name, image_url)
    VALUES ($1, $2, $3)
    RETURNING id, slug, name, image_url, created_at, updated_at
  `,
    [slug, name, imageUrl]
  );
  return result.rows[0];
};

const updateBadge = async (badgeId, { slug, name, imageUrl }) => {
  const result = await pool.query(
    `
    UPDATE badges
    SET slug = COALESCE($2, slug),
        name = COALESCE($3, name),
        image_url = COALESCE($4, image_url),
        updated_at = NOW()
    WHERE id = $1
    RETURNING id, slug, name, image_url, created_at, updated_at
  `,
    [badgeId, slug, name, imageUrl]
  );
  return result.rows[0] || null;
};

const deleteBadge = async (badgeId) => {
  const result = await pool.query(
    `
    DELETE FROM badges
    WHERE id = $1
    RETURNING id
  `,
    [badgeId]
  );
  return result.rowCount > 0;
};

const getBadgeBySlug = async (slug) => {
  const result = await pool.query(
    `
    SELECT id, slug, name, image_url, created_at, updated_at
    FROM badges
    WHERE slug = $1
  `,
    [slug]
  );
  return result.rows[0] || null;
};

const grantBadge = async (accountId, badgeId) => {
  await pool.query(
    `
    INSERT INTO user_badges (account_id, badge_id)
    VALUES ($1, $2)
    ON CONFLICT DO NOTHING
  `,
    [accountId, badgeId]
  );
};

const revokeBadge = async (accountId, badgeId) => {
  const result = await pool.query(
    `DELETE FROM user_badges WHERE account_id = $1 AND badge_id = $2`,
    [accountId, badgeId]
  );
  return result.rowCount > 0;
};

const listBadgesByAccount = async (accountId) => {
  const result = await pool.query(
    `
    SELECT badges.id, badges.slug, badges.name, badges.image_url, badges.created_at, badges.updated_at
    FROM badges
    JOIN user_badges ON user_badges.badge_id = badges.id
    WHERE user_badges.account_id = $1
    ORDER BY user_badges.granted_at ASC
  `,
    [accountId]
  );
  return result.rows;
};

const hasAccountBadge = async (accountId, badgeId) => {
  const result = await pool.query(
    `SELECT 1 FROM user_badges WHERE account_id = $1 AND badge_id = $2 LIMIT 1`,
    [accountId, badgeId]
  );
  return result.rowCount > 0;
};

module.exports = {
  listBadges,
  getBadgeById,
  createBadge,
  updateBadge,
  deleteBadge,
  getBadgeBySlug,
  grantBadge,
  revokeBadge,
  listBadgesByAccount,
  hasAccountBadge,
};
