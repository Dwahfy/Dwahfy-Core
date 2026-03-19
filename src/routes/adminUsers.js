const express = require('express');
const { requireAdminKey } = require('../utils/adminAuth');
const { listUsers, toggleAdmin, deleteAccount } = require('../controllers/adminUserController');

const router = express.Router();

router.use(requireAdminKey);
router.get('/', listUsers);
router.patch('/:accountId/admin', toggleAdmin);
router.delete('/:accountId', deleteAccount);

module.exports = router;
