const express = require('express');
const { listUsersHandler } = require('../controllers/userController');

const router = express.Router();

router.get('/', listUsersHandler);

module.exports = router;
