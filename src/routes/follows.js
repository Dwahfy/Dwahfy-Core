const express = require('express');
const { followHandler, unfollowHandler, followStatusHandler } = require('../controllers/followController');

const router = express.Router();

router.post('/:username', followHandler);
router.delete('/:username', unfollowHandler);
router.get('/:username/status', followStatusHandler);

module.exports = router;
