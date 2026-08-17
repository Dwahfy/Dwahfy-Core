const express = require('express');
const {
  getProfileHandler,
  updateProfileHandler,
  getPublicProfileHandler,
  pinPostHandler,
  unpinPostHandler,
} = require('../controllers/profileController');

const router = express.Router();

router.get('/', getProfileHandler);
router.patch('/', updateProfileHandler);
router.put('/pin', pinPostHandler);
router.delete('/pin', unpinPostHandler);
router.get('/:username', getPublicProfileHandler);

module.exports = router;
