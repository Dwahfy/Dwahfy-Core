const {
  createPost,
  getPostById,
  getPostWithCounts,
  listPosts,
  listFollowingPosts,
  listReplies,
  setReaction,
} = require('../models/postModel');
const { requireAccountToken } = require('../utils/authToken');
const { isBadWordsEnabled, censorBadWords } = require('../utils/badWords');
const { getBadWordsEnabledByAccountId } = require('../models/profileModel');
const { createNotification } = require('../models/notificationModel');

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

const resolveViewerCensorship = async (accountId) => {
  if (accountId) {
    const preference = await getBadWordsEnabledByAccountId(accountId);
    if (preference !== null && preference !== undefined) {
      return preference;
    }
  }
  return isBadWordsEnabled();
};

const censorPost = (post, enabled) => {
  if (!enabled || !post) return post;
  return { ...post, content_text: censorBadWords(post.content_text) };
};

const getViewerAccountId = (req) => {
  const header = (req.headers.authorization || '').trim();
  if (!header.startsWith('Bearer ')) return null;
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(
      header.slice('Bearer '.length).trim(),
      process.env.JWT_SECRET,
    );
    return decoded?.accountId ?? null;
  } catch {
    return null;
  }
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

    // Store raw content — censorship is applied at read time
    const post = await createPost(auth.decoded.accountId, content, null);
    const fullPost = await getPostWithCounts(post.id);
    const enabled = await resolveViewerCensorship(auth.decoded.accountId);
    return res.status(201).json({ post: censorPost(fullPost, enabled) });
  } catch (error) {
    return res
      .status(500)
      .json({ error: `Failed to create post: ${error.message}` });
  }
};

const listPostsHandler = async (req, res) => {
  try {
    const viewerId = getViewerAccountId(req);
    const enabled = await resolveViewerCensorship(viewerId);
    const limit = parseLimit(req.query.limit);

    if (req.query.feed === 'following') {
      if (!viewerId) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      const posts = await listFollowingPosts(viewerId, limit);
      return res.json({ posts: posts.map((p) => censorPost(p, enabled)), limit });
    }

    const author = (req.query.author || '').trim().toLowerCase() || null;
    const posts = await listPosts(limit, author);
    return res.json({ posts: posts.map((p) => censorPost(p, enabled)), limit });
  } catch (error) {
    return res
      .status(500)
      .json({ error: `Failed to list posts: ${error.message}` });
  }
};

const getPostHandler = async (req, res) => {
  try {
    const postId = parseId(req.params.postId);
    if (!postId) return res.status(400).json({ message: 'Valid post ID is required' });
    const post = await getPostWithCounts(postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    const viewerId = getViewerAccountId(req);
    const enabled = await resolveViewerCensorship(viewerId);
    return res.json({ post: censorPost(post, enabled) });
  } catch (error) {
    return res.status(500).json({ error: `Failed to get post: ${error.message}` });
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
    const content = normalizeContent(req.body.content);
    if (!content) {
      return res.status(400).json({ message: 'Reply content is required' });
    }
    if (content.length > MAX_CONTENT_LENGTH) {
      return res.status(400).json({
        message: `Reply content must be ${MAX_CONTENT_LENGTH} characters or fewer`,
      });
    }

    // Store raw content — censorship is applied at read time
    const reply = await createPost(auth.decoded.accountId, content, parentPostId);

    if (parent.author_id !== auth.decoded.accountId) {
      try {
        await createNotification(parent.author_id, auth.decoded.accountId, 'reply', reply.id);
      } catch (err) {
        console.error('Failed to create reply notification:', err.message);
      }
    }

    const fullReply = await getPostWithCounts(reply.id);
    const enabled = await resolveViewerCensorship(auth.decoded.accountId);
    return res.status(201).json({ reply: censorPost(fullReply, enabled) });
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

    const viewerId = getViewerAccountId(req);
    const enabled = await resolveViewerCensorship(viewerId);
    const limit = parseLimit(req.query.limit);
    const replies = await listReplies(parentPostId, limit);
    return res.json({
      replies: replies.map((r) => censorPost(r, enabled)),
      limit,
      postId: parentPostId,
    });
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
  getPostHandler,
  createReplyHandler,
  listRepliesHandler,
  reactToPostHandler,
};
