const { pool } = require('../config/db');

const ensureProfile = async (accountId, username) => {
  const result = await pool.query(
    `
    INSERT INTO profiles (account_id, display_name)
    VALUES ($1, $2)
    ON CONFLICT (account_id)
    DO UPDATE SET display_name = profiles.display_name
    RETURNING id, account_id, display_name, bio, avatar_url, banner_url, bad_words_enabled, links, badge_id, badge_icon_only, newsletter_subscribed, profile_color, profile_palette, created_at, updated_at
  `,
    [accountId, username]
  );
  return result.rows[0];
};

const setProfileBadge = async (accountId, badgeId) => {
  await pool.query(
    `UPDATE profiles SET badge_id = $2, updated_at = NOW() WHERE account_id = $1`,
    [accountId, badgeId]
  );
};

const getProfileByAccountId = async (accountId) => {
  const result = await pool.query(
    `
    SELECT id, account_id, display_name, bio, avatar_url, banner_url, bad_words_enabled, links, badge_id, badge_icon_only, newsletter_subscribed, profile_color, profile_palette, created_at, updated_at
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
    bannerUrl,
    bannerUrlProvided,
    links,
    badgeId,
    badgeIdProvided,
    badgeIconOnly,
    badgeIconOnlyProvided,
    badWordsEnabled,
    badWordsEnabledProvided,
    newsletterSubscribed,
    newsletterSubscribedProvided,
    profileColor,
    profilePalette,
    profileColorProvided,
  }
) => {
  const result = await pool.query(
    `
    UPDATE profiles
    SET display_name = COALESCE($2, display_name),
        bio = COALESCE($3, bio),
        avatar_url = COALESCE($4, avatar_url),
        banner_url = CASE WHEN $5 THEN $6 ELSE banner_url END,
        bad_words_enabled = CASE WHEN $7 THEN $8 ELSE bad_words_enabled END,
        links = COALESCE($9, links),
        badge_id = CASE WHEN $10 THEN $11 ELSE badge_id END,
        newsletter_subscribed = CASE WHEN $12 THEN $13 ELSE newsletter_subscribed END,
        profile_color = CASE WHEN $14 THEN $15 ELSE profile_color END,
        profile_palette = CASE WHEN $14 THEN $16 ELSE profile_palette END,
        badge_icon_only = CASE WHEN $17 THEN $18 ELSE badge_icon_only END,
        updated_at = NOW()
    WHERE account_id = $1
    RETURNING id, account_id, display_name, bio, avatar_url, banner_url, bad_words_enabled, links, badge_id, badge_icon_only, newsletter_subscribed, profile_color, profile_palette, created_at, updated_at
  `,
    [
      accountId,
      displayName,
      bio,
      avatarUrl,
      bannerUrlProvided ?? false,
      bannerUrl ?? null,
      badWordsEnabledProvided,
      badWordsEnabled,
      links,
      badgeIdProvided,
      badgeId,
      newsletterSubscribedProvided,
      newsletterSubscribed,
      profileColorProvided ?? false,
      profileColor ?? null,
      profilePalette ? JSON.stringify(profilePalette) : null,
      badgeIconOnlyProvided ?? false,
      badgeIconOnly,
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
      profiles.banner_url,
      profiles.links,
      profiles.badge_id,
      profiles.badge_icon_only,
      badges.slug AS badge_slug,
      badges.name AS badge_name,
      badges.image_url AS badge_image_url,
      badges.description AS badge_description,
      badges.rarity AS badge_rarity,
      user_badges.granted_at AS badge_earned_at,
      profiles.profile_color,
      profiles.profile_palette,
      profiles.created_at,
      profiles.updated_at,
      accounts.pinned_post_id,
      pinned.id            AS pinned_id,
      pinned.content_text  AS pinned_content_text,
      pinned.gif_url       AS pinned_gif_url,
      pinned.created_at    AS pinned_created_at,
      pinned.updated_at    AS pinned_updated_at,
      accounts.id          AS pinned_author_id,
      accounts.username    AS pinned_author_username,
      profiles.avatar_url  AS pinned_author_avatar_url,
      COALESCE(pp_likes.like_count, 0)       AS pinned_like_count,
      COALESCE(pp_dislikes.dislike_count, 0) AS pinned_dislike_count,
      COALESCE(pp_replies.reply_count, 0)    AS pinned_reply_count
    FROM accounts
    LEFT JOIN profiles ON profiles.account_id = accounts.id
    LEFT JOIN badges ON badges.id = profiles.badge_id
    LEFT JOIN user_badges ON user_badges.account_id = accounts.id
                          AND user_badges.badge_id = profiles.badge_id
    LEFT JOIN posts pinned ON pinned.id = accounts.pinned_post_id
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS like_count FROM post_reactions
      WHERE post_id = pinned.id AND reaction = 'like'
    ) pp_likes ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS dislike_count FROM post_reactions
      WHERE post_id = pinned.id AND reaction = 'dislike'
    ) pp_dislikes ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS reply_count FROM posts r
      WHERE r.parent_post_id = pinned.id
    ) pp_replies ON true
    WHERE accounts.username = $1
  `,
    [username]
  );
  return result.rows[0] || null;
};

const setPinnedPost = async (accountId, postId) => {
  await pool.query('UPDATE accounts SET pinned_post_id = $1 WHERE id = $2', [postId, accountId]);
};

const clearPinnedPost = async (accountId) => {
  await pool.query('UPDATE accounts SET pinned_post_id = NULL WHERE id = $1', [accountId]);
};

module.exports = {
  ensureProfile,
  setProfileBadge,
  getProfileByAccountId,
  getBadWordsEnabledByAccountId,
  updateProfileByAccountId,
  getPublicProfileByUsername,
  setPinnedPost,
  clearPinnedPost,
};
