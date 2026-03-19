const { pool } = require('../config/db');

const ensureProfile = async (accountId, username) => {
  const result = await pool.query(
    `
    INSERT INTO profiles (account_id, display_name)
    VALUES ($1, $2)
    ON CONFLICT (account_id)
    DO UPDATE SET display_name = profiles.display_name
    RETURNING id, account_id, display_name, bio, avatar_url, bad_words_enabled, links, badge_id, created_at, updated_at
  `,
    [accountId, username]
  );
  return result.rows[0];
};

const getProfileByAccountId = async (accountId) => {
  const result = await pool.query(
    `
    SELECT id, account_id, display_name, bio, avatar_url, bad_words_enabled, links, badge_id, created_at, updated_at
    FROM profiles
    WHERE account_id = $1
  `,
    [accountId]
  );
  return result.rows[0] || null;
};

const getBadWordsEnabledByAccountId = async (accountId) => {
  const result = await pool.query(
    `
    SELECT bad_words_enabled
    FROM profiles
    WHERE account_id = $1
  `,
    [accountId]
  );
  return result.rows[0] ? result.rows[0].bad_words_enabled : null;
};

const updateProfileByAccountId = async (
  accountId,
  {
    displayName,
    bio,
    avatarUrl,
    links,
    badgeId,
    badgeIdProvided,
    badWordsEnabled,
    badWordsEnabledProvided,
  }
) => {
  const result = await pool.query(
    `
    UPDATE profiles
    SET display_name = COALESCE($2, display_name),
        bio = COALESCE($3, bio),
        avatar_url = COALESCE($4, avatar_url),
        bad_words_enabled = CASE WHEN $5 THEN $6 ELSE bad_words_enabled END,
        links = COALESCE($7, links),
        badge_id = CASE WHEN $8 THEN $9 ELSE badge_id END,
        updated_at = NOW()
    WHERE account_id = $1
    RETURNING id, account_id, display_name, bio, avatar_url, bad_words_enabled, links, badge_id, created_at, updated_at
  `,
    [
      accountId,
      displayName,
      bio,
      avatarUrl,
      badWordsEnabledProvided,
      badWordsEnabled,
      links,
      badgeIdProvided,
      badgeId,
    ]
  );
  return result.rows[0] || null;
};

const getPublicProfileByUsername = async (username) => {
  const result = await pool.query(
    `
    SELECT
      accounts.id AS account_id,
      accounts.username,
      profiles.display_name,
      profiles.bio,
      profiles.avatar_url,
      profiles.links,
      profiles.badge_id,
      badges.slug AS badge_slug,
      badges.name AS badge_name,
      badges.image_url AS badge_image_url,
      profiles.created_at,
      profiles.updated_at
    FROM accounts
    LEFT JOIN profiles ON profiles.account_id = accounts.id
    LEFT JOIN badges ON badges.id = profiles.badge_id
    WHERE accounts.username = $1
  `,
    [username]
  );
  return result.rows[0] || null;
};

module.exports = {
  ensureProfile,
  getProfileByAccountId,
  getBadWordsEnabledByAccountId,
  updateProfileByAccountId,
  getPublicProfileByUsername,
};
