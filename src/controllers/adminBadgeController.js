const {
  listBadges,
  getBadgeById,
  getBadgeBySlug,
  createBadge,
  updateBadge,
  deleteBadge,
} = require('../models/badgeModel');

const MAX_SLUG_LENGTH = 40;
const MAX_NAME_LENGTH = 80;
const MAX_IMAGE_URL_LENGTH = 500;

const normalizeString = (value) =>
  typeof value === 'string' ? value.trim() : null;

const validateBadge = ({ slug, name, imageUrl }) => {
  if (slug && slug.length > MAX_SLUG_LENGTH) {
    return `Slug must be ${MAX_SLUG_LENGTH} characters or fewer`;
  }
  if (name && name.length > MAX_NAME_LENGTH) {
    return `Name must be ${MAX_NAME_LENGTH} characters or fewer`;
  }
  if (imageUrl && imageUrl.length > MAX_IMAGE_URL_LENGTH) {
    return `Image URL must be ${MAX_IMAGE_URL_LENGTH} characters or fewer`;
  }
  return null;
};

const listBadgesHandler = async (req, res) => {
  try {
    const badges = await listBadges();
    return res.json({ badges });
  } catch (error) {
    return res
      .status(500)
      .json({ error: `Failed to list badges: ${error.message}` });
  }
};

const createBadgeHandler = async (req, res) => {
  try {
    const slug = normalizeString(req.body.slug);
    const name = normalizeString(req.body.name);
    const imageUrl = normalizeString(req.body.imageUrl);

    if (!slug || !name) {
      return res.status(400).json({ message: 'slug and name are required' });
    }

    const validationError = validateBadge({ slug, name, imageUrl });
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const existing = await getBadgeBySlug(slug);
    if (existing) {
      return res.status(409).json({ message: 'Badge slug already exists' });
    }

    const badge = await createBadge({ slug, name, imageUrl });
    return res.status(201).json({ badge });
  } catch (error) {
    return res
      .status(500)
      .json({ error: `Failed to create badge: ${error.message}` });
  }
};

const updateBadgeHandler = async (req, res) => {
  try {
    const badgeId = Number.parseInt(req.params.badgeId, 10);
    if (!badgeId || Number.isNaN(badgeId)) {
      return res.status(400).json({ message: 'Valid badgeId is required' });
    }

    const slug = normalizeString(req.body.slug);
    const name = normalizeString(req.body.name);
    const imageUrl = normalizeString(req.body.imageUrl);

    if (slug === null && name === null && imageUrl === null) {
      return res.status(400).json({ message: 'No badge fields provided' });
    }

    const validationError = validateBadge({ slug, name, imageUrl });
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    if (slug) {
      const existing = await getBadgeBySlug(slug);
      if (existing && existing.id !== badgeId) {
        return res.status(409).json({ message: 'Badge slug already exists' });
      }
    }

    const badge = await updateBadge(badgeId, { slug, name, imageUrl });
    if (!badge) {
      return res.status(404).json({ message: 'Badge not found' });
    }

    return res.json({ badge });
  } catch (error) {
    return res
      .status(500)
      .json({ error: `Failed to update badge: ${error.message}` });
  }
};

const deleteBadgeHandler = async (req, res) => {
  try {
    const badgeId = Number.parseInt(req.params.badgeId, 10);
    if (!badgeId || Number.isNaN(badgeId)) {
      return res.status(400).json({ message: 'Valid badgeId is required' });
    }

    const deleted = await deleteBadge(badgeId);
    if (!deleted) {
      return res.status(404).json({ message: 'Badge not found' });
    }

    return res.json({ message: 'Badge deleted' });
  } catch (error) {
    return res
      .status(500)
      .json({ error: `Failed to delete badge: ${error.message}` });
  }
};

module.exports = {
  listBadgesHandler,
  createBadgeHandler,
  updateBadgeHandler,
  deleteBadgeHandler,
};
