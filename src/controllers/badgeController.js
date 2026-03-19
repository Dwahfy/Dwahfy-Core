const { listBadges } = require('../models/badgeModel');

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

module.exports = {
  listBadgesHandler,
};
