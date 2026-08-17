const { requireAccountToken } = require('../utils/authToken');
const { pool } = require('../config/db');
const flagsModel = require('../models/flagsModel');

const resolveFlag = (flag, isBeta) => {
  if (flag.status === 'permanent') return true;
  if (!flag.enabled) return false;
  if (flag.beta_only && !isBeta) return false;
  return true;
};

const getFlags = async (req, res) => {
  try {
    const auth = requireAccountToken(req);
    if (auth.error) return res.json({});
    const account = await pool.query(
      'SELECT is_beta FROM accounts WHERE id = $1',
      [auth.decoded.accountId]
    );
    const isBeta = account.rows[0]?.is_beta || false;
    const flags = await flagsModel.getActiveFlags();
    const result = {};
    for (const flag of flags) {
      result[flag.key] = resolveFlag(flag, isBeta);
    }
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: `Failed to get flags: ${error.message}` });
  }
};

const listFlags = async (req, res) => {
  try {
    const flags = await flagsModel.getAllFlags();
    return res.json({ flags });
  } catch (error) {
    return res.status(500).json({ error: `Failed to list flags: ${error.message}` });
  }
};

const createFlag = async (req, res) => {
  try {
    const { key, description, beta_only } = req.body;
    if (!key || typeof key !== 'string' || !key.trim()) {
      return res.status(400).json({ message: 'key is required' });
    }
    const flag = await flagsModel.createFlag({ key: key.trim(), description, beta_only });
    return res.status(201).json({ flag });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'A flag with that key already exists' });
    }
    return res.status(500).json({ error: `Failed to create flag: ${error.message}` });
  }
};

const updateFlag = async (req, res) => {
  try {
    const { key } = req.params;
    const { enabled, beta_only, status } = req.body;
    const flag = await flagsModel.updateFlag(key, { enabled, beta_only, status });
    if (!flag) {
      return res.status(404).json({ message: 'Flag not found' });
    }
    return res.json({ flag });
  } catch (error) {
    return res.status(500).json({ error: `Failed to update flag: ${error.message}` });
  }
};

const deleteFlag = async (req, res) => {
  try {
    const { key } = req.params;
    const deleted = await flagsModel.deleteFlag(key);
    if (!deleted) {
      const existing = await flagsModel.getFlagByKey(key);
      if (!existing) return res.status(404).json({ message: 'Flag not found' });
      return res.status(403).json({ message: 'Cannot delete a permanent flag' });
    }
    return res.json({ message: 'Flag deleted' });
  } catch (error) {
    return res.status(500).json({ error: `Failed to delete flag: ${error.message}` });
  }
};

module.exports = { getFlags, listFlags, createFlag, updateFlag, deleteFlag };
