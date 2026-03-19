const {
  createPost,
  getPostById,
  getPostWithCounts,
  listPosts,
  listReplies,
  setReaction,
} = require('../models/postModel');
const { requireAccountToken } = require('../utils/authToken');
const { isBadWordsEnabled, containsBadWords } = require('../utils/badWords');
const { getBadWordsEnabledByAccountId } = require('../models/profileModel');

const MAX_CONTENT_LENGTH = 1000;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const normalizeContent = (content) => (content || '').trim();

const parseLimit = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return DEFAULT_LIMIT;
  }
  return Math.min(parsed, MAX_LIMIT);
};

const parseId = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

const resolveBadWordsEnabled = async (accountId) => {
  const preference = await getBadWordsEnabledByAccountId(accountId);
  if (preference === null || preference === undefined) {
    return isBadWordsEnabled();
  }
  return preference;
};

const rejectBadWords = async (accountId, content, res) => {
  const enabled = await resolveBadWordsEnabled(accountId);
  if (!enabled) {
    return false;
  }
  if (!containsBadWords(content)) {
    return false;
  }
  res.status(400).json({ message: 'Content contains disallowed language' });
  return true;
};

const createPostHandler = async (req, res) => {
  try {
    const auth = requireAccountToken(req);
    if (auth.error) {
      return res.status(auth.error.status).json({ message: auth.error.message });
    }

    const content = normalizeContent(req.body.content);
    if (!content) {
      return res.status(400).json({ message: 'Post content is required' });
    }
    if (content.length > MAX_CONTENT_LENGTH) {
      return res.status(400).json({
        message: `Post content must be ${MAX_CONTENT_LENGTH} characters or fewer`,
      });
    }
    if (await rejectBadWords(auth.decoded.accountId, content, res)) {
      return null;
    }

    const post = await createPost(auth.decoded.accountId, content, null);
    const fullPost = await getPostWithCounts(post.id);
    return res.status(201).json({ post: fullPost });
  } catch (error) {
    return res
      .status(500)
      .json({ error: `Failed to create post: ${error.message}` });
  }
};

const listPostsHandler = async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit);
    const posts = await listPosts(limit);
    return res.json({ posts, limit });
  } catch (error) {
    return res
      .status(500)
      .json({ error: `Failed to list posts: ${error.message}` });
  }
};

const createReplyHandler = async (req, res) => {
  try {
    const auth = requireAccountToken(req);
    if (auth.error) {
      return res.status(auth.error.status).json({ message: auth.error.message });
    }

    const parentPostId = parseId(req.params.postId);
    if (!parentPostId) {
      return res.status(400).json({ message: 'Valid post ID is required' });
    }

    const parent = await getPostById(parentPostId);
    if (!parent) {
      return res.status(404).json({ message: 'Post not found' });
    }
    if (parent.parent_post_id) {
      return res.status(400).json({ message: 'Replies can only target posts' });
    }

    const content = normalizeContent(req.body.content);
    if (!content) {
      return res.status(400).json({ message: 'Reply content is required' });
    }
    if (content.length > MAX_CONTENT_LENGTH) {
      return res.status(400).json({
        message: `Reply content must be ${MAX_CONTENT_LENGTH} characters or fewer`,
      });
    }
    if (await rejectBadWords(auth.decoded.accountId, content, res)) {
      return null;
    }

    const reply = await createPost(auth.decoded.accountId, content, parentPostId);
    const fullReply = await getPostWithCounts(reply.id);
    return res.status(201).json({ reply: fullReply });
  } catch (error) {
    return res
      .status(500)
      .json({ error: `Failed to create reply: ${error.message}` });
  }
};

const listRepliesHandler = async (req, res) => {
  try {
    const parentPostId = parseId(req.params.postId);
    if (!parentPostId) {
      return res.status(400).json({ message: 'Valid post ID is required' });
    }

    const parent = await getPostById(parentPostId);
    if (!parent) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const limit = parseLimit(req.query.limit);
    const replies = await listReplies(parentPostId, limit);
    return res.json({ replies, limit, postId: parentPostId });
  } catch (error) {
    return res
      .status(500)
      .json({ error: `Failed to list replies: ${error.message}` });
  }
};

const reactToPostHandler = async (req, res) => {
  try {
    const auth = requireAccountToken(req);
    if (auth.error) {
      return res.status(auth.error.status).json({ message: auth.error.message });
    }

    const postId = parseId(req.params.postId);
    if (!postId) {
      return res.status(400).json({ message: 'Valid post ID is required' });
    }

    const reaction = (req.body.reaction || '').trim().toLowerCase();
    if (!['like', 'dislike'].includes(reaction)) {
      return res
        .status(400)
        .json({ message: 'Reaction must be like or dislike' });
    }

    const result = await setReaction(auth.decoded.accountId, postId, reaction);
    if (result.error) {
      return res.status(result.error.status).json({ message: result.error.message });
    }

    const post = await getPostWithCounts(postId);
    return res.json({
      postId,
      likeCount: post.like_count,
      dislikeCount: post.dislike_count,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ error: `Failed to react to post: ${error.message}` });
  }
};

module.exports = {
  createPostHandler,
  listPostsHandler,
  createReplyHandler,
  listRepliesHandler,
  reactToPostHandler,
};
