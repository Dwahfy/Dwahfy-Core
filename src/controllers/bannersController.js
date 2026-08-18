const { listBanners, createBanner, activateBanner, deactivateBanner, deleteBanner, getActiveBanner } = require('../models/bannersModel');

const VALID_SCOPES = ['landing', 'global'];
const VALID_PRESETS = ['info', 'success', 'warning', 'error', 'neutral'];

// Public: GET /banner → active banner or null
const publicBannerHandler = async (req, res) => {
  try {
    const banner = await getActiveBanner();
    return res.json(banner);
  } catch (error) {
    return res.status(500).json({ error: `Failed to fetch banner: ${error.message}` });
  }
};

// Admin: GET /admin/banners
const listBannersHandler = async (req, res) => {
  try {
    const banners = await listBanners();
    return res.json({ banners });
  } catch (error) {
    return res.status(500).json({ error: `Failed to list banners: ${error.message}` });
  }
};

// Admin: POST /admin/banners
const createBannerHandler = async (req, res) => {
  try {
    const { message, scope = 'global', preset = 'info', bg_color, text_color, dismissible = true } = req.body;
    if (!message?.trim()) return res.status(400).json({ message: 'Message is required' });
    if (!VALID_SCOPES.includes(scope)) return res.status(400).json({ message: `Scope must be one of: ${VALID_SCOPES.join(', ')}` });
    if (!VALID_PRESETS.includes(preset)) return res.status(400).json({ message: `Preset must be one of: ${VALID_PRESETS.join(', ')}` });

    const banner = await createBanner({ message: message.trim(), scope, preset, bg_color: bg_color || null, text_color: text_color || null, dismissible: !!dismissible });
    return res.status(201).json({ banner });
  } catch (error) {
    return res.status(500).json({ error: `Failed to create banner: ${error.message}` });
  }
};

// Admin: PATCH /admin/banners/:id/activate
const activateBannerHandler = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ message: 'Valid banner ID is required' });
    const banner = await activateBanner(id);
    if (!banner) return res.status(404).json({ message: 'Banner not found' });
    return res.json({ banner });
  } catch (error) {
    return res.status(500).json({ error: `Failed to activate banner: ${error.message}` });
  }
};

// Admin: PATCH /admin/banners/:id/deactivate
const deactivateBannerHandler = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ message: 'Valid banner ID is required' });
    const banner = await deactivateBanner(id);
    if (!banner) return res.status(404).json({ message: 'Banner not found' });
    return res.json({ banner });
  } catch (error) {
    return res.status(500).json({ error: `Failed to deactivate banner: ${error.message}` });
  }
};

// Admin: DELETE /admin/banners/:id
const deleteBannerHandler = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ message: 'Valid banner ID is required' });
    const deleted = await deleteBanner(id);
    if (!deleted) return res.status(404).json({ message: 'Banner not found' });
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: `Failed to delete banner: ${error.message}` });
  }
};

module.exports = { publicBannerHandler, listBannersHandler, createBannerHandler, activateBannerHandler, deactivateBannerHandler, deleteBannerHandler };
