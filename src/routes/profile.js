const express = require('express');
const {
  getProfileHandler,
  updateProfileHandler,
  getPublicProfileHandler,
} = require('../controllers/profileController');

const router = express.Router();

router.get('/', getProfileHandler);
router.patch('/', updateProfileHandler);
router.get('/:username', getPublicProfileHandler);

module.exports = router;
