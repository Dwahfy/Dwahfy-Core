const { pool } = require('../config/db');

const createEmailOtp = async (email, otpHash, expiresAt) => {
  await pool.query(
    `
    INSERT INTO email_otps (email, otp_hash, expires_at)
    VALUES ($1, $2, $3)
  `,
    [email, otpHash, expiresAt]
  );
};

const getLatestEmailOtp = async (email) => {
  const result = await pool.query(
    `
    SELECT id, otp_hash, expires_at
    FROM email_otps
    WHERE email = $1 AND consumed_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1
  `,
    [email]
  );
  return result.rows[0] || null;
};

const consumeEmailOtp = async (otpId) => {
  await pool.query('UPDATE email_otps SET consumed_at = NOW() WHERE id = $1', [
    otpId,
  ]);
};

const createEmailChangeOtp = async (accountId, newEmail, otpHash, expiresAt) => {
  await pool.query(
    `
    INSERT INTO email_change_otps (account_id, new_email, otp_hash, expires_at)
    VALUES ($1, $2, $3, $4)
  `,
    [accountId, newEmail, otpHash, expiresAt]
  );
};

const getLatestEmailChangeOtp = async (accountId, newEmail) => {
  const result = await pool.query(
    `
    SELECT id, otp_hash, expires_at
    FROM email_change_otps
    WHERE account_id = $1 AND new_email = $2 AND consumed_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1
  `,
    [accountId, newEmail]
  );
  return result.rows[0] || null;
};

const consumeEmailChangeOtp = async (otpId) => {
  await pool.query(
    'UPDATE email_change_otps SET consumed_at = NOW() WHERE id = $1',
    [otpId]
  );
};

const createPasswordResetOtp = async (accountId, otpHash, expiresAt) => {
  await pool.query(
    `
    INSERT INTO password_reset_otps (account_id, otp_hash, expires_at)
    VALUES ($1, $2, $3)
  `,
    [accountId, otpHash, expiresAt]
  );
};

const getLatestPasswordResetOtp = async (accountId) => {
  const result = await pool.query(
    `
    SELECT id, otp_hash, expires_at
    FROM password_reset_otps
    WHERE account_id = $1 AND consumed_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1
  `,
    [accountId]
  );
  return result.rows[0] || null;
};

const consumePasswordResetOtp = async (otpId) => {
  await pool.query(
    'UPDATE password_reset_otps SET consumed_at = NOW() WHERE id = $1',
    [otpId]
  );
};

module.exports = {
  createEmailOtp,
  getLatestEmailOtp,
  consumeEmailOtp,
  createEmailChangeOtp,
  getLatestEmailChangeOtp,
  consumeEmailChangeOtp,
  createPasswordResetOtp,
  getLatestPasswordResetOtp,
  consumePasswordResetOtp,
};
