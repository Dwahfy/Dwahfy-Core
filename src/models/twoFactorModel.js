const { pool } = require('../config/db');

const getTotpStatus = async (accountId) => {
  const result = await pool.query(
    'SELECT totp_secret, totp_enabled, totp_last_verified_at FROM accounts WHERE id = $1',
    [accountId]
  );
  return result.rows[0] || null;
};

const saveTotpSecret = async (accountId, secret) => {
  await pool.query('UPDATE accounts SET totp_secret = $1 WHERE id = $2', [secret, accountId]);
};

const enableTotp = async (accountId) => {
  await pool.query('UPDATE accounts SET totp_enabled = TRUE WHERE id = $1', [accountId]);
};

const disableTotp = async (accountId) => {
  await pool.query(
    'UPDATE accounts SET totp_enabled = FALSE, totp_secret = NULL, totp_last_verified_at = NULL WHERE id = $1',
    [accountId]
  );
};

const setTotpLastVerified = async (accountId) => {
  await pool.query('UPDATE accounts SET totp_last_verified_at = NOW() WHERE id = $1', [accountId]);
};

const insertBackupCodes = async (accountId, codeHashes) => {
  const values = codeHashes.map((_, i) => `($1, $${i + 2})`).join(', ');
  await pool.query(
    `INSERT INTO totp_backup_codes (account_id, code_hash) VALUES ${values}`,
    [accountId, ...codeHashes]
  );
};

const getBackupCodes = async (accountId) => {
  const result = await pool.query(
    'SELECT id, code_hash FROM totp_backup_codes WHERE account_id = $1 AND used_at IS NULL',
    [accountId]
  );
  return result.rows;
};

const markBackupCodeUsed = async (codeId) => {
  await pool.query('UPDATE totp_backup_codes SET used_at = NOW() WHERE id = $1', [codeId]);
};

const deleteBackupCodes = async (accountId) => {
  await pool.query('DELETE FROM totp_backup_codes WHERE account_id = $1', [accountId]);
};

module.exports = {
  getTotpStatus,
  saveTotpSecret,
  enableTotp,
  disableTotp,
  setTotpLastVerified,
  insertBackupCodes,
  getBackupCodes,
  markBackupCodeUsed,
  deleteBackupCodes,
};
