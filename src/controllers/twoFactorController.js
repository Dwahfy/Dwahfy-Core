const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const OTPAuth = require('otpauth');
const { requireAccountToken, requirePendingToken, ensureJwtSecret } = require('../utils/authToken');
const { hitRateLimit } = require('../utils/rateLimit');
const { getIdentityById } = require('../models/identityModel');
const { getAccountById, getAccountPasswordById } = require('../models/accountModel');
const {
  getTotpStatus,
  saveTotpSecret,
  enableTotp,
  disableTotp,
  setTotpLastVerified,
  insertBackupCodes,
  getBackupCodes,
  markBackupCodeUsed,
  deleteBackupCodes,
} = require('../models/twoFactorModel');
const {
  createEmailOtp,
  getLatestEmailOtp,
  consumeEmailOtp,
} = require('../models/otpModel');
const { sendEmail, buildOtpEmail } = require('../services/email');

const OTP_TTL_MS = 10 * 60 * 1000;

const otpHash = (otp) => {
  const secret = process.env.OTP_SECRET || process.env.JWT_SECRET || '';
  return crypto.createHmac('sha256', secret).update(otp).digest('hex');
};

const isWithinReplayWindow = (lastVerifiedAt) => {
  if (!lastVerifiedAt) return false;
  return Date.now() - new Date(lastVerifiedAt).getTime() < 90_000;
};

const buildTotp = (secret, username) =>
  new OTPAuth.TOTP({
    issuer: 'Dwahfy',
    label: username,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });

const issueFullJwt = (accountId, identityId, isAdmin) => {
  ensureJwtSecret();
  return jwt.sign(
    { accountId, identityId, isAdmin },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// POST /auth/2fa/setup
const setup = async (req, res) => {
  const auth = requireAccountToken(req);
  if (auth.error) return res.status(auth.error.status).json({ message: auth.error.message });

  const { accountId } = auth.decoded;
  try {
    const status = await getTotpStatus(accountId);
    if (status && status.totp_enabled) {
      return res.status(409).json({ message: '2FA is already enabled' });
    }

    const account = await getAccountById(accountId);
    const secret = new OTPAuth.Secret();
    await saveTotpSecret(accountId, secret.base32);

    const totp = new OTPAuth.TOTP({
      issuer: 'Dwahfy',
      label: account.username,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret,
    });

    return res.json({ otpauthUri: totp.toString() });
  } catch (err) {
    return res.status(500).json({ error: `Failed to set up 2FA: ${err.message}` });
  }
};

// POST /auth/2fa/confirm
const confirm = async (req, res) => {
  const auth = requireAccountToken(req);
  if (auth.error) return res.status(auth.error.status).json({ message: auth.error.message });

  const { accountId } = auth.decoded;
  const totpCode = (req.body.totpCode || '').trim();
  if (!totpCode) return res.status(400).json({ message: 'TOTP code is required' });

  try {
    const status = await getTotpStatus(accountId);
    if (!status || !status.totp_secret) {
      return res.status(400).json({ message: '2FA setup not started' });
    }
    if (status.totp_enabled) {
      return res.status(409).json({ message: '2FA is already enabled' });
    }
    if (isWithinReplayWindow(status.totp_last_verified_at)) {
      return res.status(429).json({ message: 'Code already used, wait 90 seconds' });
    }

    const account = await getAccountById(accountId);
    const totp = buildTotp(status.totp_secret, account.username);
    const delta = totp.validate({ token: totpCode, window: 1 });
    if (delta === null) {
      return res.status(401).json({ message: 'Invalid TOTP code' });
    }

    await enableTotp(accountId);
    await setTotpLastVerified(accountId);

    // Generate 8 backup codes
    const plainCodes = Array.from({ length: 8 }, () =>
      crypto.randomBytes(5).toString('hex').toUpperCase()
    );
    const hashed = await Promise.all(plainCodes.map((c) => bcrypt.hash(c, 10)));
    await insertBackupCodes(accountId, hashed);

    return res.json({ backupCodes: plainCodes });
  } catch (err) {
    return res.status(500).json({ error: `Failed to confirm 2FA: ${err.message}` });
  }
};

// POST /auth/2fa/disable
const disable = async (req, res) => {
  const auth = requireAccountToken(req);
  if (auth.error) return res.status(auth.error.status).json({ message: auth.error.message });

  const { accountId } = auth.decoded;
  const { password, totpCode } = req.body;
  if (!password || !totpCode) {
    return res.status(400).json({ message: 'Password and TOTP code are required' });
  }

  try {
    const [accountPw, status] = await Promise.all([
      getAccountPasswordById(accountId),
      getTotpStatus(accountId),
    ]);

    if (!accountPw) return res.status(404).json({ message: 'Account not found' });
    if (!status || !status.totp_enabled) {
      return res.status(400).json({ message: '2FA is not enabled' });
    }

    const validPassword = await bcrypt.compare(password, accountPw.password_hash);
    if (!validPassword) return res.status(401).json({ message: 'Invalid credentials' });

    if (isWithinReplayWindow(status.totp_last_verified_at)) {
      return res.status(429).json({ message: 'Code already used, wait 90 seconds' });
    }

    const account = await getAccountById(accountId);
    const totp = buildTotp(status.totp_secret, account.username);
    const delta = totp.validate({ token: totpCode.trim(), window: 1 });
    if (delta === null) return res.status(401).json({ message: 'Invalid TOTP code' });

    await disableTotp(accountId);
    await deleteBackupCodes(accountId);

    return res.json({ message: '2FA disabled' });
  } catch (err) {
    return res.status(500).json({ error: `Failed to disable 2FA: ${err.message}` });
  }
};

// POST /auth/2fa/verify
const verify = async (req, res) => {
  const auth = requirePendingToken(req);
  if (auth.error) return res.status(auth.error.status).json({ message: auth.error.message });

  const { accountId, identityId, isAdmin } = auth.decoded;
  const totpCode = (req.body.totpCode || '').trim();
  if (!totpCode) return res.status(400).json({ message: 'TOTP code is required' });

  const rateKey = `2fa-verify:${accountId}:${req.ip}`;
  const rate = hitRateLimit(rateKey);
  if (!rate.allowed) {
    return res.status(429).json({ message: `Too many attempts. Try again in ${Math.ceil(rate.retryAfterMs / 1000)}s.` });
  }

  try {
    const status = await getTotpStatus(accountId);
    if (!status || !status.totp_enabled || !status.totp_secret) {
      return res.status(400).json({ message: '2FA is not enabled' });
    }
    if (isWithinReplayWindow(status.totp_last_verified_at)) {
      return res.status(429).json({ message: 'Code already used, wait 90 seconds' });
    }

    const account = await getAccountById(accountId);
    const totp = buildTotp(status.totp_secret, account.username);
    const delta = totp.validate({ token: totpCode, window: 1 });
    if (delta === null) return res.status(401).json({ message: 'Invalid TOTP code' });

    await setTotpLastVerified(accountId);
    const token = issueFullJwt(accountId, identityId, isAdmin);

    return res.json({
      message: 'Welcome back to Dwahfy',
      user: { id: account.id, email: account.email, username: account.username },
      token,
      redirectTo: '/feed',
    });
  } catch (err) {
    return res.status(500).json({ error: `Failed to verify 2FA: ${err.message}` });
  }
};

// POST /auth/2fa/recover/email
const recoverEmail = async (req, res) => {
  const auth = requirePendingToken(req);
  if (auth.error) return res.status(auth.error.status).json({ message: auth.error.message });

  const { identityId } = auth.decoded;
  try {
    const identity = await getIdentityById(identityId);
    if (!identity) return res.status(404).json({ message: 'Account not found' });

    const otp = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);
    await createEmailOtp(identity.email, otpHash(otp), expiresAt);
    await sendEmail({
      to: identity.email,
      subject: 'Your Dwahfy 2FA recovery code',
      text: `Your 2FA recovery code is ${otp}. It expires in 10 minutes.`,
      html: buildOtpEmail({
        heading: 'Two-factor recovery code',
        otp,
        description: 'Use this code to recover access to your Dwahfy account.',
      }),
    });

    return res.json({ message: 'Recovery code sent to your email' });
  } catch (err) {
    return res.status(500).json({ error: `Failed to send recovery email: ${err.message}` });
  }
};

// POST /auth/2fa/recover/email/verify
const recoverEmailVerify = async (req, res) => {
  const auth = requirePendingToken(req);
  if (auth.error) return res.status(auth.error.status).json({ message: auth.error.message });

  const { accountId, identityId, isAdmin } = auth.decoded;
  const otp = (req.body.otp || '').trim();
  if (!otp || otp.length !== 6) return res.status(400).json({ message: 'OTP is required' });

  const rateKey = `2fa-recover-email:${accountId}:${req.ip}`;
  const rate = hitRateLimit(rateKey);
  if (!rate.allowed) {
    return res.status(429).json({ message: `Too many attempts. Try again in ${Math.ceil(rate.retryAfterMs / 1000)}s.` });
  }

  try {
    const identity = await getIdentityById(identityId);
    if (!identity) return res.status(404).json({ message: 'Account not found' });

    const record = await getLatestEmailOtp(identity.email);
    if (!record) return res.status(400).json({ message: 'OTP is invalid or expired' });
    if (new Date(record.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ message: 'OTP is invalid or expired' });
    }
    if (otpHash(otp) !== record.otp_hash) {
      return res.status(400).json({ message: 'OTP is invalid or expired' });
    }

    await consumeEmailOtp(record.id);
    const account = await getAccountById(accountId);
    const token = issueFullJwt(accountId, identityId, isAdmin);

    return res.json({
      message: 'Welcome back to Dwahfy',
      user: { id: account.id, email: account.email, username: account.username },
      token,
      redirectTo: '/feed',
    });
  } catch (err) {
    return res.status(500).json({ error: `Failed to verify recovery OTP: ${err.message}` });
  }
};

// POST /auth/2fa/recover/backup
const recoverBackup = async (req, res) => {
  const auth = requirePendingToken(req);
  if (auth.error) return res.status(auth.error.status).json({ message: auth.error.message });

  const { accountId, identityId, isAdmin } = auth.decoded;
  const backupCode = (req.body.backupCode || '').trim().toUpperCase();
  if (!backupCode) return res.status(400).json({ message: 'Backup code is required' });

  const rateKey = `2fa-recover-backup:${accountId}:${req.ip}`;
  const rate = hitRateLimit(rateKey);
  if (!rate.allowed) {
    return res.status(429).json({ message: `Too many attempts. Try again in ${Math.ceil(rate.retryAfterMs / 1000)}s.` });
  }

  try {
    const codes = await getBackupCodes(accountId);
    let matchedId = null;
    for (const row of codes) {
      const match = await bcrypt.compare(backupCode, row.code_hash);
      if (match) { matchedId = row.id; break; }
    }
    if (!matchedId) return res.status(401).json({ message: 'Invalid backup code' });

    await markBackupCodeUsed(matchedId);
    const account = await getAccountById(accountId);
    const token = issueFullJwt(accountId, identityId, isAdmin);

    return res.json({
      message: 'Welcome back to Dwahfy',
      user: { id: account.id, email: account.email, username: account.username },
      token,
      redirectTo: '/feed',
    });
  } catch (err) {
    return res.status(500).json({ error: `Failed to verify backup code: ${err.message}` });
  }
};

// POST /auth/2fa/disable-via-email
const disableViaEmail = async (req, res) => {
  const auth = requireAccountToken(req);
  if (auth.error) return res.status(auth.error.status).json({ message: auth.error.message });

  const { identityId } = auth.decoded;
  try {
    const identity = await getIdentityById(identityId);
    if (!identity) return res.status(404).json({ message: 'Account not found' });

    const otp = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);
    await createEmailOtp(identity.email, otpHash(otp), expiresAt);
    await sendEmail({
      to: identity.email,
      subject: 'Disable 2FA on your Dwahfy account',
      text: `Your code to disable 2FA is ${otp}. It expires in 10 minutes.`,
      html: buildOtpEmail({
        heading: 'Disable two-factor authentication',
        otp,
        description: 'Enter this code to turn off two-factor authentication on your Dwahfy account.',
      }),
    });

    return res.json({ message: 'Code sent to your email' });
  } catch (err) {
    return res.status(500).json({ error: `Failed to send disable email: ${err.message}` });
  }
};

// POST /auth/2fa/confirm-disable
const confirmDisable = async (req, res) => {
  const auth = requireAccountToken(req);
  if (auth.error) return res.status(auth.error.status).json({ message: auth.error.message });

  const { accountId, identityId } = auth.decoded;
  const otp = (req.body.otp || '').trim();
  if (!otp || otp.length !== 6) return res.status(400).json({ message: 'OTP is required' });

  try {
    const identity = await getIdentityById(identityId);
    if (!identity) return res.status(404).json({ message: 'Account not found' });

    const record = await getLatestEmailOtp(identity.email);
    if (!record) return res.status(400).json({ message: 'OTP is invalid or expired' });
    if (new Date(record.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ message: 'OTP is invalid or expired' });
    }
    if (otpHash(otp) !== record.otp_hash) {
      return res.status(400).json({ message: 'OTP is invalid or expired' });
    }

    await consumeEmailOtp(record.id);
    await disableTotp(accountId);
    await deleteBackupCodes(accountId);

    return res.json({ message: '2FA disabled' });
  } catch (err) {
    return res.status(500).json({ error: `Failed to confirm disable: ${err.message}` });
  }
};

module.exports = {
  setup,
  confirm,
  disable,
  verify,
  recoverEmail,
  recoverEmailVerify,
  recoverBackup,
  disableViaEmail,
  confirmDisable,
};
