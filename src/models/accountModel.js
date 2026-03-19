const { pool } = require('../config/db');

const getAccountsByIdentityId = async (identityId) => {
  const result = await pool.query(
    `
    SELECT id, username
    FROM accounts
    WHERE identity_id = $1
    ORDER BY created_at ASC
  `,
    [identityId]
  );
  return result.rows;
};

const getAccountByUsername = async (username) => {
  const result = await pool.query(
    `
    SELECT accounts.id, accounts.username, accounts.password_hash,
      identities.id AS identity_id, identities.email
    FROM accounts
    JOIN identities ON identities.id = accounts.identity_id
    WHERE accounts.username = $1
  `,
    [username]
  );
  return result.rows[0] || null;
};

const getAccountById = async (accountId) => {
  const result = await pool.query(
    `
    SELECT accounts.id, accounts.username, identities.email,
      identities.id AS identity_id
    FROM accounts
    JOIN identities ON identities.id = accounts.identity_id
    WHERE accounts.id = $1
  `,
    [accountId]
  );
  return result.rows[0] || null;
};

const getAccountWithIdentityById = async (accountId, identityId) => {
  const result = await pool.query(
    `
    SELECT accounts.id, accounts.username, identities.email,
      identities.id AS identity_id
    FROM accounts
    JOIN identities ON identities.id = accounts.identity_id
    WHERE accounts.id = $1 AND identities.id = $2
  `,
    [accountId, identityId]
  );
  return result.rows[0] || null;
};

const getAccountByUsernameAndEmail = async (username, email) => {
  const result = await pool.query(
    `
    SELECT accounts.id, accounts.username, identities.email,
      identities.id AS identity_id
    FROM accounts
    JOIN identities ON identities.id = accounts.identity_id
    WHERE accounts.username = $1 AND identities.email = $2
  `,
    [username, email]
  );
  return result.rows[0] || null;
};

const createAccount = async (identityId, username, passwordHash) => {
  const result = await pool.query(
    `
    INSERT INTO accounts (identity_id, username, password_hash)
    VALUES ($1, $2, $3)
    RETURNING id, username
  `,
    [identityId, username, passwordHash]
  );
  return result.rows[0];
};

const isUsernameTaken = async (username) => {
  const result = await pool.query(
    'SELECT 1 FROM accounts WHERE username = $1 LIMIT 1',
    [username]
  );
  return result.rowCount > 0;
};

const getAccountPasswordById = async (accountId) => {
  const result = await pool.query(
    'SELECT id, password_hash FROM accounts WHERE id = $1',
    [accountId]
  );
  return result.rows[0] || null;
};

const updatePassword = async (accountId, passwordHash) => {
  await pool.query('UPDATE accounts SET password_hash = $1 WHERE id = $2', [
    passwordHash,
    accountId,
  ]);
};

const updateAccountIdentity = async (accountId, identityId) => {
  await pool.query('UPDATE accounts SET identity_id = $1 WHERE id = $2', [
    identityId,
    accountId,
  ]);
};

module.exports = {
  getAccountsByIdentityId,
  getAccountByUsername,
  getAccountById,
  getAccountWithIdentityById,
  getAccountByUsernameAndEmail,
  createAccount,
  isUsernameTaken,
  getAccountPasswordById,
  updatePassword,
  updateAccountIdentity,
};
