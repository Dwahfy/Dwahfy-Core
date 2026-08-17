const fs = require('fs');
const path = require('path');
const { ZipArchive } = require('archiver');
const {
  listBadges,
  getBadgeById,
  getBadgeBySlug,
  createBadge,
  updateBadge,
  deleteBadge,
  grantBadge,
  revokeBadge,
} = require('../models/badgeModel');
const { getAccountByUsername } = require('../models/accountModel');
const { badgeUpload } = require('../utils/upload');

const MAX_SLUG_LENGTH = 40;
const MAX_NAME_LENGTH = 80;
const MAX_IMAGE_URL_LENGTH = 500;
const MAX_DESCRIPTION_LENGTH = 280;
const RARITY_VALUES = ['common', 'rare', 'epic', 'beta'];

const normalizeString = (value) =>
  typeof value === 'string' ? value.trim() : null;

const validateBadge = ({ slug, name, imageUrl, description, rarity }) => {
  if (slug && slug.length > MAX_SLUG_LENGTH) {
    return `Slug must be ${MAX_SLUG_LENGTH} characters or fewer`;
  }
  if (name && name.length > MAX_NAME_LENGTH) {
    return `Name must be ${MAX_NAME_LENGTH} characters or fewer`;
  }
  if (imageUrl && imageUrl.length > MAX_IMAGE_URL_LENGTH) {
    return `Image URL must be ${MAX_IMAGE_URL_LENGTH} characters or fewer`;
  }
  if (description && description.length > MAX_DESCRIPTION_LENGTH) {
    return `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer`;
  }
  if (rarity && !RARITY_VALUES.includes(rarity)) {
    return `Rarity must be one of ${RARITY_VALUES.join(', ')}`;
  }
  return null;
};

const uploadBadgeImageHandler = [
  badgeUpload.single('image'),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:8000';
    const url = `${baseUrl}/uploads/badges/${req.file.filename}`;
    return res.status(201).json({ url });
  },
];

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

const IMAGE_FETCH_TIMEOUT_MS = 5000;
const MAX_EXTERNAL_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

const CONTENT_TYPE_EXTENSIONS = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

const extensionFromContentType = (contentType) =>
  CONTENT_TYPE_EXTENSIONS[(contentType || '').split(';')[0].trim()] || '';

// Reads a badge's image into memory for zip export: local uploads come off
// disk, external URLs are fetched with a timeout and size cap. Returns null
// (and the badge is still exported, just without an image) if the image is
// missing, unreachable, or too large.
const loadBadgeImage = async (badge) => {
  const imageUrl = badge.image_url;
  if (!imageUrl) return null;

  const baseUrl = process.env.APP_BASE_URL || 'http://localhost:8000';
  const badgeUrlPrefix = `${baseUrl}/uploads/badges/`;

  if (imageUrl.startsWith(badgeUrlPrefix)) {
    try {
      const filename = path.basename(imageUrl.slice(badgeUrlPrefix.length));
      const UPLOADS_ROOT = process.env.UPLOADS_DIR || path.join(__dirname, '../../uploads');
      const localPath = path.join(UPLOADS_ROOT, 'badges', filename);
      const buffer = await fs.promises.readFile(localPath);
      return { buffer, ext: path.extname(filename) || '.png' };
    } catch {
      return null;
    }
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS);
    let response;
    try {
      response = await fetch(imageUrl, { signal: controller.signal, redirect: 'follow' });
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_EXTERNAL_IMAGE_BYTES) return null;
    const buffer = Buffer.from(arrayBuffer);
    const pathExt = path.extname(new URL(imageUrl).pathname);
    const ext = pathExt || extensionFromContentType(response.headers.get('content-type')) || '.png';
    return { buffer, ext };
  } catch {
    return null;
  }
};

const exportBadgesHandler = async (req, res) => {
  try {
    const idsParam = typeof req.query.ids === 'string' ? req.query.ids : '';
    const requestedIds = idsParam
      ? idsParam
          .split(',')
          .map((id) => Number.parseInt(id.trim(), 10))
          .filter((id) => !Number.isNaN(id))
      : null;

    const allBadges = await listBadges();
    const badges = requestedIds
      ? allBadges.filter((b) => requestedIds.includes(Number(b.id)))
      : allBadges;

    if (badges.length === 0) {
      return res.status(404).json({ message: 'No badges found for export' });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="dwahfy-badges-export-${timestamp}.zip"`);

    const archive = new ZipArchive({ zlib: { level: 9 } });
    archive.on('error', (err) => {
      if (!res.headersSent) {
        res.status(500).json({ error: `Export failed: ${err.message}` });
      } else {
        res.end();
      }
    });
    archive.pipe(res);

    const manifest = [];
    for (const badge of badges) {
      const image = await loadBadgeImage(badge);
      manifest.push({
        slug: badge.slug,
        name: badge.name,
        description: badge.description,
        rarity: badge.rarity,
        imageUrl: badge.image_url,
        imageIncluded: Boolean(image),
        createdAt: badge.created_at,
        updatedAt: badge.updated_at,
      });
      if (image) {
        archive.append(image.buffer, { name: `images/${badge.slug}${image.ext}` });
      }
    }

    archive.append(JSON.stringify(manifest, null, 2), { name: 'badges.json' });
    await archive.finalize();
  } catch (error) {
    if (!res.headersSent) {
      return res.status(500).json({ error: `Failed to export badges: ${error.message}` });
    }
    res.end();
  }
};

const createBadgeHandler = async (req, res) => {
  try {
    const slug = normalizeString(req.body.slug);
    const name = normalizeString(req.body.name);
    const imageUrl = normalizeString(req.body.imageUrl);
    const description = normalizeString(req.body.description);
    const rarity = normalizeString(req.body.rarity);

    if (!slug || !name) {
      return res.status(400).json({ message: 'slug and name are required' });
    }

    const validationError = validateBadge({ slug, name, imageUrl, description, rarity });
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const existing = await getBadgeBySlug(slug);
    if (existing) {
      return res.status(409).json({ message: 'Badge slug already exists' });
    }

    const badge = await createBadge({ slug, name, imageUrl, description, rarity });
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
    const description = normalizeString(req.body.description);
    const rarity = normalizeString(req.body.rarity);

    if (slug === null && name === null && imageUrl === null && description === null && rarity === null) {
      return res.status(400).json({ message: 'No badge fields provided' });
    }

    const validationError = validateBadge({ slug, name, imageUrl, description, rarity });
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    if (slug) {
      const existing = await getBadgeBySlug(slug);
      if (existing && Number(existing.id) !== badgeId) {
        return res.status(409).json({ message: 'Badge slug already exists' });
      }
    }

    // Delete old local badge image if imageUrl is changing
    if (imageUrl !== null) {
      const current = await getBadgeById(badgeId);
      if (current) {
        const baseUrl = process.env.APP_BASE_URL || 'http://localhost:8000';
        const badgeUrlPrefix = `${baseUrl}/uploads/badges/`;
        const oldUrl = current.image_url;
        if (oldUrl && oldUrl !== imageUrl && oldUrl.startsWith(badgeUrlPrefix)) {
          const filename = path.basename(oldUrl.slice(badgeUrlPrefix.length));
          const UPLOADS_ROOT = process.env.UPLOADS_DIR || path.join(__dirname, '../../uploads');
          const oldPath = path.join(UPLOADS_ROOT, 'badges', filename);
          fs.unlink(oldPath, () => {}); // ignore errors — stale file is harmless
        }
      }
    }

    const badge = await updateBadge(badgeId, { slug, name, imageUrl, description, rarity });
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

const grantBadgeHandler = async (req, res) => {
  try {
    const badgeId = Number.parseInt(req.params.badgeId, 10);
    if (!badgeId || Number.isNaN(badgeId)) {
      return res.status(400).json({ message: 'Valid badgeId is required' });
    }

    const username = (req.body.username || '').trim().toLowerCase();
    if (!username) {
      return res.status(400).json({ message: 'username is required' });
    }

    const badge = await getBadgeById(badgeId);
    if (!badge) {
      return res.status(404).json({ message: 'Badge not found' });
    }

    const account = await getAccountByUsername(username);
    if (!account) {
      return res.status(404).json({ message: 'User not found' });
    }

    await grantBadge(account.id, badgeId);
    return res.json({ message: `Badge granted to ${account.username}` });
  } catch (error) {
    return res
      .status(500)
      .json({ error: `Failed to grant badge: ${error.message}` });
  }
};

const revokeBadgeHandler = async (req, res) => {
  try {
    const badgeId = Number.parseInt(req.params.badgeId, 10);
    if (!badgeId || Number.isNaN(badgeId)) {
      return res.status(400).json({ message: 'Valid badgeId is required' });
    }

    const username = (req.body.username || '').trim().toLowerCase();
    if (!username) {
      return res.status(400).json({ message: 'username is required' });
    }

    const account = await getAccountByUsername(username);
    if (!account) {
      return res.status(404).json({ message: 'User not found' });
    }

    await revokeBadge(account.id, badgeId);
    return res.json({ message: `Badge revoked from ${account.username}` });
  } catch (error) {
    return res
      .status(500)
      .json({ error: `Failed to revoke badge: ${error.message}` });
  }
};

module.exports = {
  listBadgesHandler,
  createBadgeHandler,
  updateBadgeHandler,
  deleteBadgeHandler,
  grantBadgeHandler,
  revokeBadgeHandler,
  uploadBadgeImageHandler,
  exportBadgesHandler,
};
