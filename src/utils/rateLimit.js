const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const attempts = new Map();

const prune = (timestamps, now) => timestamps.filter((ts) => now - ts < WINDOW_MS);

const hitRateLimit = (key) => {
  const now = Date.now();
  const existing = attempts.get(key) || [];
  const recent = prune(existing, now);
  if (recent.length >= MAX_ATTEMPTS) {
    const oldest = Math.min(...recent);
    return {
      allowed: false,
      retryAfterMs: WINDOW_MS - (now - oldest),
    };
  }
  recent.push(now);
  attempts.set(key, recent);
  return { allowed: true };
};

module.exports = {
  hitRateLimit,
  WINDOW_MS,
  MAX_ATTEMPTS,
};
