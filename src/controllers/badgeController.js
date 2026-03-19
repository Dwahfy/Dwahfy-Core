const jwt = require('jsonwebtoken');
const { listBadgesByAccount } = require('../models/badgeModel');

const getAccountId = (req) => {
  const header = (req.headers.authorization || '').trim();
  if (!header.startsWith('Bearer ')) return null;
  try {
    const decoded = jwt.verify(
      header.slice('Bearer '.length).trim(),
      process.env.JWT_SECRET
    );
    return decoded?.accountId ?? null;
  } catch {
    return null;
  }
};

const listBadgesHandler = async (req, res) => {
  try {
    const accountId = getAccountId(req);
    if (!accountId) {
      return res.json({ badges: [] });
    }
    const rows = await listBadgesByAccount(accountId);
    const badges = rows.map((b) => ({
      id: b.id,
      slug: b.slug,
      name: b.name,
      imageUrl: b.image_url,
    }));
    return res.json({ badges });
  } catch (error) {
    return res
      .status(500)
      .json({ error: `Failed to list badges: ${error.message}` });
  }
};

module.exports = {
  listBadgesHandler,
};
