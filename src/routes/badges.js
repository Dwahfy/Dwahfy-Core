const express = require('express');
const { listBadgesHandler } = require('../controllers/badgeController');

const router = express.Router();

router.get('/', listBadgesHandler);

module.exports = router;
