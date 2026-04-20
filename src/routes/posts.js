const express = require('express');
const {
  createPostHandler,
  listPostsHandler,
  getPostHandler,
  createReplyHandler,
  listRepliesHandler,
  reactToPostHandler,
} = require('../controllers/postController');

const router = express.Router();

router.post('/', createPostHandler);
router.get('/', listPostsHandler);
router.get('/:postId', getPostHandler);
router.post('/:postId/replies', createReplyHandler);
router.get('/:postId/replies', listRepliesHandler);
router.post('/:postId/react', reactToPostHandler);

module.exports = router;
