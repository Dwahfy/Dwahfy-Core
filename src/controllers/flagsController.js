const { listFlags, createFlag, updateFlag, deleteFlag, getPublicFlags } = require('../models/flagsModel');

// Public: GET /flags → { key: boolean }
const publicFlagsHandler = async (req, res) => {
  try {
    const flags = await getPublicFlags();
    const map = {};
    flags.forEach((f) => { map[f.key] = f.status === 'permanent' || f.enabled; });
    return res.json(map);
  } catch (error) {
    return res.status(500).json({ error: `Failed to fetch flags: ${error.message}` });
  }
};

// Admin: GET /admin/flags
const listFlagsHandler = async (req, res) => {
  try {
    const flags = await listFlags();
    return res.json({ flags });
  } catch (error) {
    return res.status(500).json({ error: `Failed to list flags: ${error.message}` });
  }
};

// Admin: POST /admin/flags
const createFlagHandler = async (req, res) => {
  try {
    const { key, description, beta_only } = req.body;
    if (!key || !/^[a-z0-9-]+$/.test(key.trim())) {
      return res.status(400).json({ message: 'Key is required and must be lowercase alphanumeric with hyphens' });
    }
    const flag = await createFlag(key.trim(), { description: description || null, beta_only: !!beta_only });
    return res.status(201).json({ flag });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'A flag with that key already exists' });
    }
    return res.status(500).json({ error: `Failed to create flag: ${error.message}` });
  }
};

// Admin: PATCH /admin/flags/:key
const patchFlagHandler = async (req, res) => {
  try {
    const { key } = req.params;
    const { enabled, beta_only, status } = req.body;
    const fields = {};
    if (enabled !== undefined) fields.enabled = !!enabled;
    if (beta_only !== undefined) fields.beta_only = !!beta_only;
    if (status !== undefined) fields.status = status;

    const flag = await updateFlag(key, fields);
    if (!flag) return res.status(404).json({ message: 'Flag not found' });
    return res.json({ flag });
  } catch (error) {
    return res.status(500).json({ error: `Failed to update flag: ${error.message}` });
  }
};

// Admin: DELETE /admin/flags/:key
const deleteFlagHandler = async (req, res) => {
  try {
    const deleted = await deleteFlag(req.params.key);
    if (!deleted) return res.status(404).json({ message: 'Flag not found' });
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: `Failed to delete flag: ${error.message}` });
  }
};

module.exports = { publicFlagsHandler, listFlagsHandler, createFlagHandler, patchFlagHandler, deleteFlagHandler };
