const express = require('express');
const { requireAdminKey } = require('../utils/adminAuth');
const {
  listBadgesHandler,
  createBadgeHandler,
  updateBadgeHandler,
  deleteBadgeHandler,
  grantBadgeHandler,
  revokeBadgeHandler,
} = require('../controllers/adminBadgeController');

const router = express.Router();

router.use(requireAdminKey);
router.get('/badges', listBadgesHandler);
router.post('/badges', createBadgeHandler);
router.patch('/badges/:badgeId', updateBadgeHandler);
router.delete('/badges/:badgeId', deleteBadgeHandler);
router.post('/badges/:badgeId/grant', grantBadgeHandler);
router.post('/badges/:badgeId/revoke', revokeBadgeHandler);

module.exports = router;
