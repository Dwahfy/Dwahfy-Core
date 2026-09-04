const { requireAccountToken } = require('../utils/authToken');
const {
  ensureProfile,
  getProfileByAccountId,
  updateProfileByAccountId,
  getPublicProfileByUsername,
} = require('../models/profileModel');
const { getAccountById, getAccountByUsername } = require('../models/accountModel');
const { getBadgeById, hasAccountBadge } = require('../models/badgeModel');
const { getFollowerCount, getFollowingCount } = require('../models/followModel');

const MAX_DISPLAY_NAME_LENGTH = 50;
const MAX_BIO_LENGTH = 160;
const MAX_AVATAR_URL_LENGTH = 500;
const MAX_LINKS = 5;
const MAX_LINK_LENGTH = 200;

const normalizeString = (value) =>
  typeof value === 'string' ? value.trim() : null;

const normalizeLinks = (links) => {
  if (links === undefined) return undefined;
  if (!Array.isArray(links)) return null;
  const cleaned = links
    .map((link) => (typeof link === 'string' ? link.trim() : null))
    .filter((link) => link && link.length > 0);
  return cleaned;
};

const validateProfile = ({ displayName, bio, avatarUrl, links }) => {
  if (displayName && displayName.length > MAX_DISPLAY_NAME_LENGTH) {
    return `Display name must be ${MAX_DISPLAY_NAME_LENGTH} characters or fewer`;
  }
  if (bio && bio.length > MAX_BIO_LENGTH) {
    return `Bio must be ${MAX_BIO_LENGTH} characters or fewer`;
  }
  if (avatarUrl && avatarUrl.length > MAX_AVATAR_URL_LENGTH) {
    return `Avatar URL must be ${MAX_AVATAR_URL_LENGTH} characters or fewer`;
  }
  if (links && links.length > MAX_LINKS) {
    return `Links must be ${MAX_LINKS} or fewer`;
  }
  if (links && links.some((link) => link.length > MAX_LINK_LENGTH)) {
    return `Each link must be ${MAX_LINK_LENGTH} characters or fewer`;
  }
  return null;
};

const parseBooleanField = (value) => {
  if (value === undefined) return { provided: false, value: undefined };
  if (typeof value === 'boolean') return { provided: true, value };
  return { provided: true, value: null };
};

const buildBadgePayload = async (badgeId, accountId) => {
  if (!badgeId) {
    return null;
  }
  const badge = await getBadgeById(badgeId);
  if (!badge) {
    return null;
  }
  let earnedAt = null;
  if (accountId) {
    const { pool } = require('../config/db');
    const row = await pool.query(
      `SELECT granted_at FROM user_badges WHERE account_id = $1 AND badge_id = $2 LIMIT 1`,
      [accountId, badgeId]
    );
    earnedAt = row.rows[0]?.granted_at ?? null;
  }
  return {
    id: badge.id,
    slug: badge.slug,
    name: badge.name,
    imageUrl: badge.image_url,
    description: badge.description ?? null,
    rarity: badge.rarity ?? null,
    earnedAt,
  };
};

const getProfileHandler = async (req, res) => {
  try {
    const auth = requireAccountToken(req);
    if (auth.error) {
      return res.status(auth.error.status).json({ message: auth.error.message });
    }

    const account = await getAccountById(auth.decoded.accountId);
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    let profile = await getProfileByAccountId(account.id);
    if (!profile) {
      profile = await ensureProfile(account.id, account.username);
    }

    const badge = await buildBadgePayload(profile.badge_id, account.id);

    return res.json({
      profile: {
        username: account.username,
        displayName: profile.display_name || account.username,
        bio: profile.bio,
        avatarUrl: profile.avatar_url,
        bannerUrl: profile.banner_url,
        badWordsEnabled: profile.bad_words_enabled,
        newsletterSubscribed: profile.newsletter_subscribed,
        badgeIconOnly: profile.badge_icon_only,
        links: profile.links || [],
        badge,
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ error: `Failed to get profile: ${error.message}` });
  }
};

const updateProfileHandler = async (req, res) => {
  try {
    const auth = requireAccountToken(req);
    if (auth.error) {
      return res.status(auth.error.status).json({ message: auth.error.message });
    }

    const account = await getAccountById(auth.decoded.accountId);
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    const displayName = normalizeString(req.body.displayName);
    const bio = normalizeString(req.body.bio);
    const avatarUrl = normalizeString(req.body.avatarUrl);
    const bannerUrlProvided = Object.prototype.hasOwnProperty.call(req.body, 'bannerUrl');
    const bannerUrl = bannerUrlProvided
      ? (req.body.bannerUrl === null ? null : normalizeString(req.body.bannerUrl))
      : undefined;
    const links = normalizeLinks(req.body.links);
    const badWordsField = parseBooleanField(req.body.badWordsEnabled);
    const newsletterField = parseBooleanField(req.body.newsletterSubscribed);
    const badgeIconOnlyField = parseBooleanField(req.body.badgeIconOnly);
    const badgeIdProvided = Object.prototype.hasOwnProperty.call(
      req.body,
      'badgeId'
    );
    const badgeId =
      req.body.badgeId === null || req.body.badgeId === undefined
        ? null
        : Number.parseInt(req.body.badgeId, 10);

    if (
      displayName === null &&
      bio === null &&
      avatarUrl === null &&
      !bannerUrlProvided &&
      links === undefined &&
      !badWordsField.provided &&
      !newsletterField.provided &&
      !badgeIconOnlyField.provided &&
      !badgeIdProvided
    ) {
      return res.status(400).json({ message: 'No profile fields provided' });
    }

    if (links === null) {
      return res.status(400).json({ message: 'Links must be an array' });
    }

    if (badWordsField.provided && badWordsField.value === null) {
      return res
        .status(400)
        .json({ message: 'badWordsEnabled must be a boolean' });
    }

    if (newsletterField.provided && newsletterField.value === null) {
      return res
        .status(400)
        .json({ message: 'newsletterSubscribed must be a boolean' });
    }

    if (badgeIconOnlyField.provided && badgeIconOnlyField.value === null) {
      return res
        .status(400)
        .json({ message: 'badgeIconOnly must be a boolean' });
    }

    if (badgeIdProvided && badgeId !== null && Number.isNaN(badgeId)) {
      return res.status(400).json({ message: 'badgeId must be a number' });
    }

    if (badgeIdProvided && badgeId !== null) {
      const badgeExists = await getBadgeById(badgeId);
      if (!badgeExists) {
        return res.status(400).json({ message: 'Badge not found' });
      }
      const owned = await hasAccountBadge(account.id, badgeId);
      if (!owned) {
        return res.status(403).json({ message: 'You have not earned this badge' });
      }
    }

    const validationError = validateProfile({
      displayName,
      bio,
      avatarUrl,
      links,
    });
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    let profile = await getProfileByAccountId(account.id);
    if (!profile) {
      await ensureProfile(account.id, account.username);
    }

    profile = await updateProfileByAccountId(account.id, {
      displayName,
      bio,
      avatarUrl,
      bannerUrlProvided,
      bannerUrl,
      links,
      badgeId,
      badgeIdProvided,
      badWordsEnabled: badWordsField.value,
      badWordsEnabledProvided: badWordsField.provided,
      newsletterSubscribed: newsletterField.value,
      newsletterSubscribedProvided: newsletterField.provided,
      badgeIconOnly: badgeIconOnlyField.value,
      badgeIconOnlyProvided: badgeIconOnlyField.provided,
    });

    const badge = await buildBadgePayload(profile.badge_id, account.id);

    return res.json({
      profile: {
        username: account.username,
        displayName: profile.display_name || account.username,
        bio: profile.bio,
        avatarUrl: profile.avatar_url,
        bannerUrl: profile.banner_url,
        badWordsEnabled: profile.bad_words_enabled,
        newsletterSubscribed: profile.newsletter_subscribed,
        badgeIconOnly: profile.badge_icon_only,
        links: profile.links || [],
        badge,
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ error: `Failed to update profile: ${error.message}` });
  }
};

const getPublicProfileHandler = async (req, res) => {
  try {
    const username = (req.params.username || '').trim().toLowerCase();
    if (!username) {
      return res.status(400).json({ message: 'Valid username is required' });
    }

    const account = await getAccountByUsername(username);
    if (!account) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    const profile = await getPublicProfileByUsername(username);
    const badge =
      profile && profile.badge_id
        ? {
            id: profile.badge_id,
            slug: profile.badge_slug,
            name: profile.badge_name,
            imageUrl: profile.badge_image_url,
            description: profile.badge_description ?? null,
            rarity: profile.badge_rarity ?? null,
            earnedAt: profile.badge_earned_at ?? null,
          }
        : null;
    const followerCount = await getFollowerCount(account.id);
    const followingCount = await getFollowingCount(account.id);
    return res.json({
      profile: {
        username: account.username,
        displayName: profile.display_name || account.username,
        bio: profile.bio,
        avatarUrl: profile.avatar_url,
        bannerUrl: profile.banner_url ?? null,
        links: profile.links || [],
        badge,
        badgeIconOnly: profile.badge_icon_only ?? false,
        followerCount,
        followingCount,
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ error: `Failed to get profile: ${error.message}` });
  }
};

module.exports = {
  getProfileHandler,
  updateProfileHandler,
  getPublicProfileHandler,
};
