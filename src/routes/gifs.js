const express = require('express');
const { getTrending, searchGifs } = require('../controllers/gifsController');

const router = express.Router();
router.get('/trending', getTrending);
router.get('/search', searchGifs);

module.exports = router;
