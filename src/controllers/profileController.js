const { requireAccountToken } = require('../utils/authToken');
const {
  ensureProfile,
  getProfileByAccountId,
  updateProfileByAccountId,
  getPublicProfileByUsername,
} = require('../models/profileModel');
const { getAccountById, getAccountByUsername } = require('../models/accountModel');
const { getBadgeById } = require('../models/badgeModel');

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

const buildBadgePayload = async (badgeId) => {
  if (!badgeId) {
    return null;
  }
  const badge = await getBadgeById(badgeId);
  if (!badge) {
    return null;
  }
  return {
    id: badge.id,
    slug: badge.slug,
    name: badge.name,
    imageUrl: badge.image_url,
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

    const badge = await buildBadgePayload(profile.badge_id);

    return res.json({
      profile: {
        username: account.username,
        displayName: profile.display_name || account.username,
        bio: profile.bio,
        avatarUrl: profile.avatar_url,
        badWordsEnabled: profile.bad_words_enabled,
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
    const links = normalizeLinks(req.body.links);
    const badWordsField = parseBooleanField(req.body.badWordsEnabled);
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
      links === undefined &&
      !badWordsField.provided &&
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

    if (badgeIdProvided && badgeId !== null && Number.isNaN(badgeId)) {
      return res.status(400).json({ message: 'badgeId must be a number' });
    }

    if (badgeIdProvided && badgeId !== null) {
      const badgeExists = await getBadgeById(badgeId);
      if (!badgeExists) {
        return res.status(400).json({ message: 'Badge not found' });
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
      links,
      badgeId,
      badgeIdProvided,
      badWordsEnabled: badWordsField.value,
      badWordsEnabledProvided: badWordsField.provided,
    });

    const badge = await buildBadgePayload(profile.badge_id);

    return res.json({
      profile: {
        username: account.username,
        displayName: profile.display_name || account.username,
        bio: profile.bio,
        avatarUrl: profile.avatar_url,
        badWordsEnabled: profile.bad_words_enabled,
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
          }
        : null;
    return res.json({
      profile: {
        username: account.username,
        displayName: profile.display_name || account.username,
        bio: profile.bio,
        avatarUrl: profile.avatar_url,
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

module.exports = {
  getProfileHandler,
  updateProfileHandler,
  getPublicProfileHandler,
};
