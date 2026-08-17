const express = require('express');
const { requireAdminKey } = require('../utils/adminAuth');
const { listUsers, toggleAdmin, deleteAccount, toggleBeta } = require('../controllers/adminUserController');

const router = express.Router();

router.use(requireAdminKey);
router.get('/', listUsers);
router.patch('/:accountId/admin', toggleAdmin);
router.patch('/:accountId/beta', toggleBeta);
router.delete('/:accountId', deleteAccount);

module.exports = router;
