const express = require('express');
const { uploadAvatarHandler } = require('../controllers/uploadController');

const router = express.Router();

router.post('/avatar', uploadAvatarHandler);

module.exports = router;
