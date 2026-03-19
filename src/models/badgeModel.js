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

module.exports = {
  listBadges,
  getBadgeById,
  createBadge,
  updateBadge,
  deleteBadge,
  getBadgeBySlug,
};
