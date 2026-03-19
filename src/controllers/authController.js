const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { sendEmail } = require('../services/email');
const { hitRateLimit, WINDOW_MS, MAX_ATTEMPTS } = require('../utils/rateLimit');
const { blockToken } = require('../utils/tokenBlocklist');
const {
  ensureJwtSecret,
  requireAccountToken,
} = require('../utils/authToken');
const {
  upsertIdentityByEmail,
  getIdentityById,
} = require('../models/identityModel');
const {
  getAccountsByIdentityId,
  getAccountByUsername,
  getAccountWithIdentityById,
  getAccountByUsernameAndEmail,
  createAccount,
  isUsernameTaken,
  getAccountPasswordById,
  updatePassword,
  updateAccountIdentity,
} = require('../models/accountModel');
const {
  createEmailOtp,
  getLatestEmailOtp,
  consumeEmailOtp,
  createEmailChangeOtp,
  getLatestEmailChangeOtp,
  consumeEmailChangeOtp,
  createPasswordResetOtp,
  getLatestPasswordResetOtp,
  consumePasswordResetOtp,
} = require('../models/otpModel');

const OTP_TTL_MS = 10 * 60 * 1000;
const REGISTER_TOKEN_TTL = '15m';
const IDENTITY_TOKEN_TTL = '15m';

const normalizeEmail = (email) => (email || '').trim().toLowerCase();
const normalizeUsername = (username) => (username || '').trim().toLowerCase();
const isValidEmail = (email) => email.includes('@');
const isValidUsername = (username) =>
  /^[a-z0-9_]{3,20}$/i.test(username || '');

const otpHash = (otp) => {
  const secret = process.env.OTP_SECRET || process.env.JWT_SECRET || '';
  return crypto.createHash('sha256').update(`${secret}${otp}`).digest('hex');
};

const startSignup = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ message: 'Valid email is required' });
    }

    const rateKey = `start:${email}:${req.ip}`;
    const rate = hitRateLimit(rateKey);
    if (!rate.allowed) {
      return res.status(429).json({
        message: `Too many attempts. Try again in ${Math.ceil(
          rate.retryAfterMs / 1000
        )}s.`,
      });
    }

    const otp = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    const otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);

    await createEmailOtp(email, otpHash(otp), otpExpiresAt);
    await sendEmail({
      to: email,
      subject: 'Your Dwahfy OTP Code',
      text: `Your OTP is ${otp}. It expires in 10 minutes.`,
    });

    return res.json({
      message: 'OTP sent. Check your email to continue.',
    });
  } catch (error) {
    return res
      .status(500)
      .json({ error: `Failed to start signup: ${error.message}` });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const otp = (req.body.otp || '').trim();
    if (!email || !isValidEmail(email) || otp.length !== 6) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const rateKey = `verify:${email}:${req.ip}`;
    const rate = hitRateLimit(rateKey);
    if (!rate.allowed) {
      return res.status(429).json({
        message: `Too many attempts. Try again in ${Math.ceil(
          rate.retryAfterMs / 1000
        )}s.`,
      });
    }

    const record = await getLatestEmailOtp(email);
    if (!record) {
      return res.status(400).json({ message: 'OTP is invalid or expired' });
    }
    if (new Date(record.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ message: 'OTP is invalid or expired' });
    }
    if (otpHash(otp) !== record.otp_hash) {
      return res.status(400).json({ message: 'OTP is invalid or expired' });
    }

    await consumeEmailOtp(record.id);

    const identity = await upsertIdentityByEmail(email);
    const accounts = await getAccountsByIdentityId(identity.id);

    ensureJwtSecret();
    const registerToken = jwt.sign(
      { email, identityId: identity.id, type: 'register' },
      process.env.JWT_SECRET,
      { expiresIn: REGISTER_TOKEN_TTL }
    );
    const identityToken = jwt.sign(
      { email, identityId: identity.id, type: 'identity' },
      process.env.JWT_SECRET,
      { expiresIn: IDENTITY_TOKEN_TTL }
    );

    return res.json({
      message: 'Email verified. Continue registration.',
      registerToken,
      identityToken,
      accounts,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ error: `Failed to verify OTP: ${error.message}` });
  }
};

const registerAccount = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const username = normalizeUsername(req.body.username);
    const password = req.body.password || '';
    const registerToken = req.body.registerToken || '';

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ message: 'Valid email is required' });
    }
    if (!isValidUsername(username)) {
      return res.status(400).json({
        message: 'Username must be 3-20 chars: letters, numbers, underscores',
      });
    }
    if (password.length < 8) {
      return res
        .status(400)
        .json({ message: 'Password must be at least 8 characters' });
    }

    ensureJwtSecret();
    let decoded;
    try {
      decoded = jwt.verify(registerToken, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ message: 'Register token is invalid' });
    }
    if (decoded.type !== 'register' || decoded.email !== email) {
      return res.status(401).json({ message: 'Register token is invalid' });
    }

    const usernameTaken = await isUsernameTaken(username);
    if (usernameTaken) {
      return res.status(409).json({ message: 'Username is already taken' });
    }

    const identityId = decoded.identityId;
    if (!identityId) {
      return res.status(401).json({ message: 'Register token is invalid' });
    }
    const identity = await getIdentityById(identityId);
    if (!identity) {
      return res.status(400).json({ message: 'Email identity not found' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const account = await createAccount(identityId, username, passwordHash);

    const token = jwt.sign(
      { accountId: account.id, identityId },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      message: 'Welcome to Dwahfy',
      user: {
        id: account.id,
        email: identity.email,
        username: account.username,
      },
      token,
      redirectTo: '/feed',
    });
  } catch (error) {
    return res
      .status(500)
      .json({ error: `Failed to register: ${error.message}` });
  }
};

const login = async (req, res) => {
  try {
    const username = normalizeUsername(req.body.username);
    const password = req.body.password || '';
    if (!isValidUsername(username)) {
      return res.status(400).json({ message: 'Valid username is required' });
    }

    const user = await getAccountByUsername(username);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    ensureJwtSecret();
    const token = jwt.sign(
      { accountId: user.id, identityId: user.identity_id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      message: 'Welcome back to Dwahfy',
      user: { id: user.id, email: user.email, username: user.username },
      token,
      redirectTo: '/feed',
    });
  } catch (error) {
    return res.status(500).json({ error: `Failed to login: ${error.message}` });
  }
};

const listAccounts = async (req, res) => {
  try {
    const identityToken = req.body.identityToken || '';
    ensureJwtSecret();
    let decoded;
    try {
      decoded = jwt.verify(identityToken, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ message: 'Identity token is invalid' });
    }
    if (decoded.type !== 'identity' || !decoded.identityId) {
      return res.status(401).json({ message: 'Identity token is invalid' });
    }

    const accounts = await getAccountsByIdentityId(decoded.identityId);
    return res.json({ accounts });
  } catch (error) {
    return res
      .status(500)
      .json({ error: `Failed to list accounts: ${error.message}` });
  }
};

const switchAccount = async (req, res) => {
  try {
    const identityToken = req.body.identityToken || '';
    const accountId = Number.parseInt(req.body.accountId, 10);
    if (!Number.isInteger(accountId)) {
      return res.status(400).json({ message: 'Valid accountId is required' });
    }

    ensureJwtSecret();
    let decoded;
    try {
      decoded = jwt.verify(identityToken, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ message: 'Identity token is invalid' });
    }
    if (decoded.type !== 'identity' || !decoded.identityId) {
      return res.status(401).json({ message: 'Identity token is invalid' });
    }

    const account = await getAccountWithIdentityById(
      accountId,
      decoded.identityId
    );
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    const token = jwt.sign(
      { accountId: account.id, identityId: account.identity_id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      message: 'Switched account',
      user: {
        id: account.id,
        email: account.email,
        username: account.username,
      },
      token,
      redirectTo: '/feed',
    });
  } catch (error) {
    return res
      .status(500)
      .json({ error: `Failed to switch account: ${error.message}` });
  }
};

const changePassword = async (req, res) => {
  try {
    const auth = requireAccountToken(req);
    if (auth.error) {
      return res.status(auth.error.status).json({ message: auth.error.message });
    }

    const currentPassword = req.body.currentPassword || '';
    const newPassword = req.body.newPassword || '';
    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ message: 'Password must be at least 8 characters' });
    }

    const account = await getAccountPasswordById(auth.decoded.accountId);
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    const validPassword = await bcrypt.compare(
      currentPassword,
      account.password_hash
    );
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await updatePassword(account.id, passwordHash);

    return res.json({ message: 'Password updated' });
  } catch (error) {
    return res
      .status(500)
      .json({ error: `Failed to change password: ${error.message}` });
  }
};

const requestEmailChange = async (req, res) => {
  try {
    const auth = requireAccountToken(req);
    if (auth.error) {
      return res.status(auth.error.status).json({ message: auth.error.message });
    }

    const newEmail = normalizeEmail(req.body.newEmail);
    if (!newEmail || !isValidEmail(newEmail)) {
      return res.status(400).json({ message: 'Valid email is required' });
    }

    const rateKey = `email-change:${newEmail}:${req.ip}`;
    const rate = hitRateLimit(rateKey);
    if (!rate.allowed) {
      return res.status(429).json({
        message: `Too many attempts. Try again in ${Math.ceil(
          rate.retryAfterMs / 1000
        )}s.`,
      });
    }

    const otp = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    const otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);

    await createEmailChangeOtp(
      auth.decoded.accountId,
      newEmail,
      otpHash(otp),
      otpExpiresAt
    );

    await sendEmail({
      to: newEmail,
      subject: 'Confirm your new email',
      text: `Your OTP is ${otp}. It expires in 10 minutes.`,
    });

    return res.json({ message: 'OTP sent to new email.' });
  } catch (error) {
    return res.status(500).json({
      error: `Failed to request email change: ${error.message}`,
    });
  }
};

const confirmEmailChange = async (req, res) => {
  try {
    const auth = requireAccountToken(req);
    if (auth.error) {
      return res.status(auth.error.status).json({ message: auth.error.message });
    }

    const newEmail = normalizeEmail(req.body.newEmail);
    const otp = (req.body.otp || '').trim();
    if (!newEmail || !isValidEmail(newEmail) || otp.length !== 6) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const rateKey = `email-change-verify:${newEmail}:${req.ip}`;
    const rate = hitRateLimit(rateKey);
    if (!rate.allowed) {
      return res.status(429).json({
        message: `Too many attempts. Try again in ${Math.ceil(
          rate.retryAfterMs / 1000
        )}s.`,
      });
    }

    const record = await getLatestEmailChangeOtp(
      auth.decoded.accountId,
      newEmail
    );
    if (!record) {
      return res.status(400).json({ message: 'OTP is invalid or expired' });
    }
    if (new Date(record.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ message: 'OTP is invalid or expired' });
    }
    if (otpHash(otp) !== record.otp_hash) {
      return res.status(400).json({ message: 'OTP is invalid or expired' });
    }

    await consumeEmailChangeOtp(record.id);

    const identity = await upsertIdentityByEmail(newEmail);
    await updateAccountIdentity(auth.decoded.accountId, identity.id);

    return res.json({
      message: 'Email updated',
      email: identity.email,
    });
  } catch (error) {
    return res.status(500).json({
      error: `Failed to confirm email change: ${error.message}`,
    });
  }
};

const requestPasswordReset = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const username = normalizeUsername(req.body.username);
    if (!email || !isValidEmail(email) || !isValidUsername(username)) {
      return res
        .status(400)
        .json({ message: 'Valid email and username are required' });
    }

    const rateKey = `password-reset:${email}:${req.ip}`;
    const rate = hitRateLimit(rateKey);
    if (!rate.allowed) {
      return res.status(429).json({
        message: `Too many attempts. Try again in ${Math.ceil(
          rate.retryAfterMs / 1000
        )}s.`,
      });
    }

    const account = await getAccountByUsernameAndEmail(username, email);
    if (account) {
      const otp = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
      const otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);
      await createPasswordResetOtp(account.id, otpHash(otp), otpExpiresAt);
      await sendEmail({
        to: email,
        subject: 'Reset your Dwahfy password',
        text: `Your OTP is ${otp}. It expires in 10 minutes.`,
      });
    }

    return res.json({
      message: 'If the account exists, an OTP has been sent to the email.',
    });
  } catch (error) {
    return res.status(500).json({
      error: `Failed to request password reset: ${error.message}`,
    });
  }
};

const confirmPasswordReset = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const username = normalizeUsername(req.body.username);
    const otp = (req.body.otp || '').trim();
    const newPassword = req.body.newPassword || '';
    if (
      !email ||
      !isValidEmail(email) ||
      !isValidUsername(username) ||
      otp.length !== 6
    ) {
      return res
        .status(400)
        .json({ message: 'Email, username, and OTP are required' });
    }
    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ message: 'Password must be at least 8 characters' });
    }

    const rateKey = `password-reset-verify:${email}:${req.ip}`;
    const rate = hitRateLimit(rateKey);
    if (!rate.allowed) {
      return res.status(429).json({
        message: `Too many attempts. Try again in ${Math.ceil(
          rate.retryAfterMs / 1000
        )}s.`,
      });
    }

    const account = await getAccountByUsernameAndEmail(username, email);
    if (!account) {
      return res.status(400).json({ message: 'OTP is invalid or expired' });
    }

    const record = await getLatestPasswordResetOtp(account.id);
    if (!record) {
      return res.status(400).json({ message: 'OTP is invalid or expired' });
    }
    if (new Date(record.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ message: 'OTP is invalid or expired' });
    }
    if (otpHash(otp) !== record.otp_hash) {
      return res.status(400).json({ message: 'OTP is invalid or expired' });
    }

    await consumePasswordResetOtp(record.id);

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await updatePassword(account.id, passwordHash);

    return res.json({ message: 'Password reset successfully' });
  } catch (error) {
    return res.status(500).json({
      error: `Failed to reset password: ${error.message}`,
    });
  }
};

const logout = async (req, res) => {
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }

    ensureJwtSecret();
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ message: 'Token is invalid' });
    }

    if (!decoded || !decoded.exp) {
      return res.status(400).json({ message: 'Token is invalid' });
    }

    blockToken(token, decoded.exp * 1000);
    return res.json({ message: 'Logged out' });
  } catch (error) {
    return res
      .status(500)
      .json({ error: `Failed to logout: ${error.message}` });
  }
};

const rateLimitInfo = (req, res) => {
  res.json({
    windowMs: WINDOW_MS,
    maxAttempts: MAX_ATTEMPTS,
  });
};

module.exports = {
  startSignup,
  verifyOtp,
  registerAccount,
  login,
  listAccounts,
  switchAccount,
  changePassword,
  requestEmailChange,
  confirmEmailChange,
  requestPasswordReset,
  confirmPasswordReset,
  logout,
  rateLimitInfo,
};
