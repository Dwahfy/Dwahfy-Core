const bannerModel = require('../models/bannerModel');

const getActiveBanner = async (req, res) => {
  try {
    const banner = await bannerModel.getActiveBanner();
    return res.json(banner);
  } catch (error) {
    return res.status(500).json({ error: `Failed to get banner: ${error.message}` });
  }
};

const listBanners = async (req, res) => {
  try {
    const banners = await bannerModel.getAllBanners();
    return res.json({ banners });
  } catch (error) {
    return res.status(500).json({ error: `Failed to list banners: ${error.message}` });
  }
};

const createBanner = async (req, res) => {
  try {
    const { message, scope, preset, bg_color, text_color, dismissible } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'message is required' });
    }
    const banner = await bannerModel.createBanner({
      message: message.trim(), scope, preset, bg_color, text_color, dismissible,
    });
    return res.status(201).json({ banner });
  } catch (error) {
    return res.status(500).json({ error: `Failed to create banner: ${error.message}` });
  }
};

const updateBanner = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'Valid id is required' });
    const banner = await bannerModel.updateBanner(id, req.body);
    if (!banner) return res.status(404).json({ message: 'Banner not found' });
    return res.json({ banner });
  } catch (error) {
    return res.status(500).json({ error: `Failed to update banner: ${error.message}` });
  }
};

const activateBanner = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'Valid id is required' });
    const banner = await bannerModel.activateBanner(id);
    if (!banner) return res.status(404).json({ message: 'Banner not found' });
    return res.json({ banner });
  } catch (error) {
    return res.status(500).json({ error: `Failed to activate banner: ${error.message}` });
  }
};

const deactivateBanner = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'Valid id is required' });
    const banner = await bannerModel.deactivateBanner(id);
    if (!banner) return res.status(404).json({ message: 'Banner not found' });
    return res.json({ banner });
  } catch (error) {
    return res.status(500).json({ error: `Failed to deactivate banner: ${error.message}` });
  }
};

const deleteBanner = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'Valid id is required' });
    const deleted = await bannerModel.deleteBanner(id);
    if (!deleted) return res.status(404).json({ message: 'Banner not found' });
    return res.json({ message: 'Banner deleted' });
  } catch (error) {
    return res.status(500).json({ error: `Failed to delete banner: ${error.message}` });
  }
};

module.exports = {
  getActiveBanner,
  listBanners,
  createBanner,
  updateBanner,
  activateBanner,
  deactivateBanner,
  deleteBanner,
};
