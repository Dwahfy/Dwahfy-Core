const { pool } = require('../config/db');

const followUser = async (followerId, followingId) => {
  const result = await pool.query(
    `INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [followerId, followingId]
  );
  return result.rowCount > 0;
};

const unfollowUser = async (followerId, followingId) => {
  const result = await pool.query(
    `DELETE FROM follows WHERE follower_id = $1 AND following_id = $2`,
    [followerId, followingId]
  );
  return result.rowCount > 0;
};

const isFollowing = async (followerId, followingId) => {
  const result = await pool.query(
    `SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2 LIMIT 1`,
    [followerId, followingId]
  );
  return result.rowCount > 0;
};

const getFollowerCount = async (accountId) => {
  const result = await pool.query(
    `SELECT COUNT(*) FROM follows WHERE following_id = $1`,
    [accountId]
  );
  return parseInt(result.rows[0].count, 10);
};

const getFollowingCount = async (accountId) => {
  const result = await pool.query(
    `SELECT COUNT(*) FROM follows WHERE follower_id = $1`,
    [accountId]
  );
  return parseInt(result.rows[0].count, 10);
};

const getFollowingIds = async (followerId) => {
  const result = await pool.query(
    `SELECT following_id FROM follows WHERE follower_id = $1`,
    [followerId]
  );
  return result.rows.map((r) => r.following_id);
};

module.exports = { followUser, unfollowUser, isFollowing, getFollowerCount, getFollowingCount, getFollowingIds };
