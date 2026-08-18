const express = require('express');
const { requireAdminKey } = require('../utils/adminAuth');
const { listFlagsHandler, createFlagHandler, patchFlagHandler, deleteFlagHandler } = require('../controllers/flagsController');

const router = express.Router();

router.use(requireAdminKey);
router.get('/', listFlagsHandler);
router.post('/', createFlagHandler);
router.patch('/:key', patchFlagHandler);
router.delete('/:key', deleteFlagHandler);

module.exports = router;
