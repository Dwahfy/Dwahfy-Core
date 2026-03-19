const { pool } = require('../config/db');

const getPostsByAccountId = async (accountId) => {
  const result = await pool.query(
    'SELECT id, content_text, parent_post_id, created_at, updated_at FROM posts WHERE author_id = $1 ORDER BY created_at ASC',
    [accountId]
  );
  return result.rows;
};

const getReactionsByAccountId = async (accountId) => {
  const result = await pool.query(
    'SELECT post_id, reaction, created_at FROM post_reactions WHERE account_id = $1 ORDER BY created_at ASC',
    [accountId]
  );
  return result.rows;
};

const getFollowingByAccountId = async (accountId) => {
  const result = await pool.query(
    `SELECT follows.following_id AS account_id, accounts.username, follows.created_at AS followed_at
     FROM follows
     JOIN accounts ON accounts.id = follows.following_id
     WHERE follows.follower_id = $1
     ORDER BY follows.created_at ASC`,
    [accountId]
  );
  return result.rows;
};

const getFollowersByAccountId = async (accountId) => {
  const result = await pool.query(
    `SELECT follows.follower_id AS account_id, accounts.username, follows.created_at AS followed_at
     FROM follows
     JOIN accounts ON accounts.id = follows.follower_id
     WHERE follows.following_id = $1
     ORDER BY follows.created_at ASC`,
    [accountId]
  );
  return result.rows;
};

const getBadgesByAccountId = async (accountId) => {
  const result = await pool.query(
    `SELECT badges.id, badges.slug, badges.name, badges.image_url, user_badges.granted_at
     FROM user_badges
     JOIN badges ON badges.id = user_badges.badge_id
     WHERE user_badges.account_id = $1
     ORDER BY user_badges.granted_at ASC`,
    [accountId]
  );
  return result.rows;
};

module.exports = {
  getPostsByAccountId,
  getReactionsByAccountId,
  getFollowingByAccountId,
  getFollowersByAccountId,
  getBadgesByAccountId,
};
