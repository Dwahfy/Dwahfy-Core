const { requireAccountToken } = require('../utils/authToken');
const { resolveColor } = require('../utils/colorResolver');
const { generatePalette } = require('../utils/paletteGenerator');
const {
  ensureProfile,
  getProfileByAccountId,
  updateProfileByAccountId,
  getPublicProfileByUsername,
  setPinnedPost,
  clearPinnedPost,
} = require('../models/profileModel');
const { getPostById } = require('../models/postModel');
const { getAccountById, getAccountByUsername } = require('../models/accountModel');
const { getBadgeById, hasAccountBadge, getBadgeGrant } = require('../models/badgeModel');
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
  const grant = await getBadgeGrant(accountId, badgeId);
  return {
    id: badge.id,
    slug: badge.slug,
    name: badge.name,
    imageUrl: badge.image_url,
    description: badge.description,
    rarity: badge.rarity,
    earnedAt: grant ? grant.granted_at : null,
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
        email: account.email,
        username: account.username,
        displayName: profile.display_name || account.username,
        bio: profile.bio,
        avatarUrl: profile.avatar_url,
        bannerUrl: profile.banner_url || null,
        badWordsEnabled: profile.bad_words_enabled,
        newsletterSubscribed: profile.newsletter_subscribed,
        links: profile.links || [],
        badge,
        badgeIconOnly: profile.badge_icon_only,
        profileColor: profile.profile_color || null,
        profilePalette: profile.profile_palette || null,
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
    const bannerUrl = bannerUrlProvided ? normalizeString(req.body.bannerUrl) : undefined;
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
    const favoriteColorProvided = Object.prototype.hasOwnProperty.call(req.body, 'favoriteColor');
    let profileColor = null;
    let profilePalette = null;
    if (favoriteColorProvided && req.body.favoriteColor) {
      profileColor = resolveColor(req.body.favoriteColor);
      profilePalette = generatePalette(profileColor);
    }

    if (
      displayName === null &&
      bio === null &&
      avatarUrl === null &&
      !bannerUrlProvided &&
      links === undefined &&
      !badWordsField.provided &&
      !newsletterField.provided &&
      !badgeIdProvided &&
      !badgeIconOnlyField.provided &&
      !favoriteColorProvided
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
      bannerUrl,
      bannerUrlProvided,
      links,
      badgeId,
      badgeIdProvided,
      badgeIconOnly: badgeIconOnlyField.value,
      badgeIconOnlyProvided: badgeIconOnlyField.provided,
      badWordsEnabled: badWordsField.value,
      badWordsEnabledProvided: badWordsField.provided,
      newsletterSubscribed: newsletterField.value,
      newsletterSubscribedProvided: newsletterField.provided,
      profileColor,
      profilePalette,
      profileColorProvided: favoriteColorProvided,
    });

    const badge = await buildBadgePayload(profile.badge_id, account.id);

    return res.json({
      profile: {
        username: account.username,
        displayName: profile.display_name || account.username,
        bio: profile.bio,
        avatarUrl: profile.avatar_url,
        bannerUrl: profile.banner_url || null,
        badWordsEnabled: profile.bad_words_enabled,
        newsletterSubscribed: profile.newsletter_subscribed,
        links: profile.links || [],
        badge,
        badgeIconOnly: profile.badge_icon_only,
        profileColor: profile.profile_color || null,
        profilePalette: profile.profile_palette || null,
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
            description: profile.badge_description,
            rarity: profile.badge_rarity,
            earnedAt: profile.badge_earned_at,
          }
        : null;
    const followerCount = await getFollowerCount(account.id);
    const followingCount = await getFollowingCount(account.id);
    const pinnedPost = profile.pinned_id
      ? {
          id: profile.pinned_id,
          content_text: profile.pinned_content_text,
          gif_url: profile.pinned_gif_url,
          parent_post_id: null,
          created_at: profile.pinned_created_at,
          updated_at: profile.pinned_updated_at,
          author_id: profile.account_id,
          author_username: profile.username,
          author_avatar_url: profile.avatar_url,
          like_count: profile.pinned_like_count,
          dislike_count: profile.pinned_dislike_count,
          reply_count: profile.pinned_reply_count,
        }
      : null;
    return res.json({
      profile: {
        username: account.username,
        displayName: profile.display_name || account.username,
        bio: profile.bio,
        avatarUrl: profile.avatar_url,
        bannerUrl: profile.banner_url || null,
        links: profile.links || [],
        badge,
        badgeIconOnly: profile.badge_icon_only,
        followerCount,
        followingCount,
        pinnedPost,
        profileColor: profile.profile_color || null,
        profilePalette: profile.profile_palette || null,
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ error: `Failed to get profile: ${error.message}` });
  }
};

const pinPostHandler = async (req, res) => {
  try {
    const auth = requireAccountToken(req);
    if (auth.error) return res.status(auth.error.status).json({ message: auth.error.message });

    const postId = Number.parseInt(req.body.postId, 10);
    if (!postId || Number.isNaN(postId)) {
      return res.status(400).json({ message: 'Valid postId is required' });
    }

    const post = await getPostById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.author_id !== auth.decoded.accountId) {
      return res.status(403).json({ message: 'You can only pin your own posts' });
    }

    await setPinnedPost(auth.decoded.accountId, postId);
    return res.json({ message: 'Post pinned' });
  } catch (error) {
    return res.status(500).json({ error: `Failed to pin post: ${error.message}` });
  }
};

const unpinPostHandler = async (req, res) => {
  try {
    const auth = requireAccountToken(req);
    if (auth.error) return res.status(auth.error.status).json({ message: auth.error.message });

    await clearPinnedPost(auth.decoded.accountId);
    return res.json({ message: 'Post unpinned' });
  } catch (error) {
    return res.status(500).json({ error: `Failed to unpin post: ${error.message}` });
  }
};

module.exports = {
  getProfileHandler,
  updateProfileHandler,
  getPublicProfileHandler,
  pinPostHandler,
  unpinPostHandler,
};
