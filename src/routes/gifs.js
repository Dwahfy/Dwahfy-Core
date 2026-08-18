const express = require('express');
const { trendingGifsHandler, searchGifsHandler } = require('../controllers/gifsController');

const router = express.Router();

router.get('/trending', trendingGifsHandler);
router.get('/search', searchGifsHandler);

module.exports = router;
