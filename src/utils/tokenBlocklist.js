const blockedTokens = new Map();

const blockToken = (token, expiresAtMs) => {
  if (!token || !expiresAtMs) return;
  blockedTokens.set(token, expiresAtMs);
};

const isTokenBlocked = (token) => {
  const expiresAt = blockedTokens.get(token);
  if (!expiresAt) return false;
  if (Date.now() > expiresAt) {
    blockedTokens.delete(token);
    return false;
  }
  return true;
};

module.exports = {
  blockToken,
  isTokenBlocked,
};
