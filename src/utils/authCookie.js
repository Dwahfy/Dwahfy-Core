const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const setAuthCookie = (res, token) => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE_MS,
  });
};

const clearAuthCookie = (res) => {
  res.clearCookie('token', { path: '/' });
};

module.exports = { setAuthCookie, clearAuthCookie };
