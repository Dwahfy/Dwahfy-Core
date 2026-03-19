const { requireAccountToken, getAuthToken } = require('../utils/authToken');
const { getAccountByUsername } = require('../models/accountModel');
const {
  followUser,
  unfollowUser,
  isFollowing,
  getFollowerCount,
  getFollowingCount,
} = require('../models/followModel');
const { createNotification } = require('../models/notificationModel');
const jwt = require('jsonwebtoken');

const getOptionalAccountId = (req) => {
  const token = getAuthToken(req);
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded?.accountId ?? null;
  } catch {
    return null;
  }
};

const followHandler = async (req, res) => {
  const auth = requireAccountToken(req);
  if (auth.error) return res.status(auth.error.status).json({ message: auth.error.message });

  const { username } = req.params;
  const target = await getAccountByUsername(username);
  if (!target) return res.status(404).json({ message: 'User not found' });

  if (target.id === auth.decoded.accountId) {
    return res.status(400).json({ message: 'You cannot follow yourself' });
  }

  const wasInserted = await followUser(auth.decoded.accountId, target.id);
  if (wasInserted) {
    try {
      await createNotification(target.id, auth.decoded.accountId, 'follow');
    } catch (err) {
      console.error('Failed to create follow notification:', err.message);
    }
  }
  const followerCount = await getFollowerCount(target.id);
  const followingCount = await getFollowingCount(target.id);
  res.json({ isFollowing: true, followerCount, followingCount });
};

const unfollowHandler = async (req, res) => {
  const auth = requireAccountToken(req);
  if (auth.error) return res.status(auth.error.status).json({ message: auth.error.message });

  const { username } = req.params;
  const target = await getAccountByUsername(username);
  if (!target) return res.status(404).json({ message: 'User not found' });

  await unfollowUser(auth.decoded.accountId, target.id);
  const followerCount = await getFollowerCount(target.id);
  const followingCount = await getFollowingCount(target.id);
  res.json({ isFollowing: false, followerCount, followingCount });
};

const followStatusHandler = async (req, res) => {
  const { username } = req.params;
  const target = await getAccountByUsername(username);
  if (!target) return res.status(404).json({ message: 'User not found' });

  const viewerId = getOptionalAccountId(req);
  const following = viewerId ? await isFollowing(viewerId, target.id) : false;
  const followerCount = await getFollowerCount(target.id);
  const followingCount = await getFollowingCount(target.id);

  res.json({ isFollowing: following, followerCount, followingCount });
};

module.exports = { followHandler, unfollowHandler, followStatusHandler };
