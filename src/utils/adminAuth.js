const requireAdminKey = (req, res, next) => {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) {
    return res.status(500).json({ message: 'ADMIN_API_KEY is not set' });
  }

  const header = req.headers['x-admin-key'] || '';
  const authHeader = req.headers.authorization || '';
  let token = '';

  if (typeof header === 'string' && header.trim()) {
    token = header.trim();
  } else if (authHeader.startsWith('Bearer ')) {
    token = authHeader.slice('Bearer '.length).trim();
  }

  if (!token || token !== adminKey) {
    return res.status(401).json({ message: 'Admin access denied' });
  }

  return next();
};

module.exports = {
  requireAdminKey,
};
