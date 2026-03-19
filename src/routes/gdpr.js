const express = require('express');
const { deleteAccount, exportData } = require('../controllers/gdprController');
const router = express.Router();

router.post('/delete-account', deleteAccount);
router.get('/export-data', exportData);

module.exports = router;
