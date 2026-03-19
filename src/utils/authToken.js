const jwt = require('jsonwebtoken');
const { isTokenBlocked } = require('./tokenBlocklist');

const ensureJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not set');
  }
};

const getAuthToken = (req) => {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) {
    return header.slice('Bearer '.length).trim();
  }
  return req.body.token || '';
};

const requireAccountToken = (req) => {
  const token = getAuthToken(req);
  if (!token) {
    return { error: { status: 400, message: 'Token is required' } };
  }
  ensureJwtSecret();
  if (isTokenBlocked(token)) {
    return { error: { status: 401, message: 'Token is revoked' } };
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.accountId) {
      return { error: { status: 401, message: 'Token is invalid' } };
    }
    return { token, decoded };
  } catch (error) {
    return { error: { status: 401, message: 'Token is invalid' } };
  }
};

module.exports = {
  ensureJwtSecret,
  getAuthToken,
  requireAccountToken,
};
