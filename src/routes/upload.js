const express = require('express');
const { uploadAvatarHandler, uploadBannerHandler } = require('../controllers/uploadController');

const router = express.Router();

router.post('/avatar', uploadAvatarHandler);
router.post('/banner', uploadBannerHandler);

module.exports = router;
