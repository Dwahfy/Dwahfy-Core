const express = require('express');
const { requireAdminKey } = require('../utils/adminAuth');
const { listBannersHandler, createBannerHandler, activateBannerHandler, deactivateBannerHandler, deleteBannerHandler } = require('../controllers/bannersController');

const router = express.Router();

router.use(requireAdminKey);
router.get('/', listBannersHandler);
router.post('/', createBannerHandler);
router.patch('/:id/activate', activateBannerHandler);
router.patch('/:id/deactivate', deactivateBannerHandler);
router.delete('/:id', deleteBannerHandler);

module.exports = router;
