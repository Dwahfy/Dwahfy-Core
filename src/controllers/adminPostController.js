const { pool } = require('../config/db');

const getStats = async (req, res) => {
  try {
    const [userCount, postCount, recentUsers, recentPosts] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM accounts'),
      pool.query('SELECT COUNT(*) FROM posts'),
      pool.query(
        'SELECT id, username, created_at FROM accounts ORDER BY created_at DESC LIMIT 5'
      ),
      pool.query(`
        SELECT p.id, p.content_text, p.created_at, a.username
        FROM posts p
        JOIN accounts a ON a.id = p.author_id
        ORDER BY p.created_at DESC
        LIMIT 5
      `),
    ]);

    return res.json({
      userCount: parseInt(userCount.rows[0].count, 10),
      postCount: parseInt(postCount.rows[0].count, 10),
      recentUsers: recentUsers.rows,
      recentPosts: recentPosts.rows,
    });
  } catch (error) {
    return res.status(500).json({ error: `Failed to get stats: ${error.message}` });
  }
};

const listAllPosts = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const offset = parseInt(req.query.offset, 10) || 0;

    const [posts, countResult] = await Promise.all([
      pool.query(
        `
        SELECT p.id, p.content_text, p.created_at, p.parent_post_id,
               a.id AS author_id, a.username
        FROM posts p
        JOIN accounts a ON a.id = p.author_id
        ORDER BY p.created_at DESC
        LIMIT $1 OFFSET $2
        `,
        [limit, offset]
      ),
      pool.query('SELECT COUNT(*) FROM posts'),
    ]);

    return res.json({
      posts: posts.rows,
      total: parseInt(countResult.rows[0].count, 10),
    });
  } catch (error) {
    return res.status(500).json({ error: `Failed to list posts: ${error.message}` });
  }
};

const deletePost = async (req, res) => {
  try {
    const postId = parseInt(req.params.postId, 10);
    if (!Number.isInteger(postId)) {
      return res.status(400).json({ message: 'Valid postId is required' });
    }

    const result = await pool.query(
      'DELETE FROM posts WHERE id = $1 RETURNING id',
      [postId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ message: 'Post not found' });
    }

    return res.json({ message: 'Post deleted' });
  } catch (error) {
    return res.status(500).json({ error: `Failed to delete post: ${error.message}` });
  }
};

module.exports = { getStats, listAllPosts, deletePost };
