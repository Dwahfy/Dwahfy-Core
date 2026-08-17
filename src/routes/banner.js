const express = require('express');
const { requireAdminKey } = require('../utils/adminAuth');
const {
  getActiveBanner,
  listBanners,
  createBanner,
  updateBanner,
  activateBanner,
  deactivateBanner,
  deleteBanner,
} = require('../controllers/bannerController');

const publicBannerRouter = express.Router();
publicBannerRouter.get('/', getActiveBanner);

const adminBannerRouter = express.Router();
adminBannerRouter.use(requireAdminKey);
adminBannerRouter.get('/', listBanners);
adminBannerRouter.post('/', createBanner);
adminBannerRouter.patch('/:id', updateBanner);
adminBannerRouter.patch('/:id/activate', activateBanner);
adminBannerRouter.patch('/:id/deactivate', deactivateBanner);
adminBannerRouter.delete('/:id', deleteBanner);

module.exports = { publicBannerRouter, adminBannerRouter };
