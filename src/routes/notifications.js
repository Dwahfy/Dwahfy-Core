const express = require('express');
const { getNotificationsHandler, markReadHandler } = require('../controllers/notificationController');

const router = express.Router();

router.get('/', getNotificationsHandler);
router.post('/read', markReadHandler);

module.exports = router;
