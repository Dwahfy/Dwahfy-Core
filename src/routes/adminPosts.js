const express = require('express');
const { requireAdminKey } = require('../utils/adminAuth');
const { getStats, listAllPosts, deletePost } = require('../controllers/adminPostController');

const router = express.Router();

router.use(requireAdminKey);
router.get('/stats', getStats);
router.get('/', listAllPosts);
router.delete('/:postId', deletePost);

module.exports = router;
