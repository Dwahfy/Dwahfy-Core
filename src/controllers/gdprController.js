const bcrypt = require('bcryptjs');
const { requireAccountToken } = require('../utils/authToken');
const { blockToken } = require('../utils/tokenBlocklist');
const { getAccountById, getAccountPasswordById, deleteAccountById, countAccountsByIdentityId } = require('../models/accountModel');
const { deleteIdentityById } = require('../models/identityModel');
const { getProfileByAccountId } = require('../models/profileModel');
const { getPostsByAccountId, getReactionsByAccountId, getFollowingByAccountId, getFollowersByAccountId, getBadgesByAccountId } = require('../models/gdprModel');

const deleteAccount = async (req, res) => {
  let auth;
  try {
    auth = requireAccountToken(req);
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ message: 'Password is required' });
  }

  const { accountId, identityId } = auth.decoded;

  try {
    const account = await getAccountPasswordById(accountId);
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    const valid = await bcrypt.compare(password, account.password_hash);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    await deleteAccountById(accountId);
    blockToken(auth.token, auth.decoded.exp * 1000);

    const remaining = await countAccountsByIdentityId(identityId);
    if (remaining === 0) {
      await deleteIdentityById(identityId);
    }

    return res.json({ message: 'Account deleted' });
  } catch (err) {
    return res.status(500).json({ error: `Failed to delete account: ${err.message}` });
  }
};

const exportData = async (req, res) => {
  let auth;
  try {
    auth = requireAccountToken(req);
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { accountId } = auth.decoded;

  try {
    const account = await getAccountById(accountId);
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    const profile = await getProfileByAccountId(accountId);

    const [posts, reactions, following, followers, badges] = await Promise.all([
      getPostsByAccountId(accountId),
      getReactionsByAccountId(accountId),
      getFollowingByAccountId(accountId),
      getFollowersByAccountId(accountId),
      getBadgesByAccountId(accountId),
    ]);

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      account: {
        id: account.id,
        username: account.username,
        email: account.email,
      },
      profile: profile
        ? {
            displayName: profile.display_name,
            bio: profile.bio,
            avatarUrl: profile.avatar_url,
            createdAt: profile.created_at,
            updatedAt: profile.updated_at,
          }
        : null,
      posts,
      reactions,
      following,
      followers,
      badges,
    };

    res.setHeader('Content-Disposition', `attachment; filename="dwahfy-export-${account.username}.json"`);
    return res.json(exportPayload);
  } catch (err) {
    return res.status(500).json({ error: `Failed to export data: ${err.message}` });
  }
};

module.exports = { deleteAccount, exportData };
