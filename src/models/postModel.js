const { pool } = require('../config/db');

const createPost = async (authorId, contentText, parentPostId = null) => {
  const result = await pool.query(
    `
    INSERT INTO posts (author_id, content_text, parent_post_id)
    VALUES ($1, $2, $3)
    RETURNING id, author_id, content_text, parent_post_id, created_at, updated_at
  `,
    [authorId, contentText, parentPostId]
  );
  return result.rows[0];
};

const getPostById = async (postId) => {
  const result = await pool.query(
    `
    SELECT id, author_id, content_text, parent_post_id, created_at, updated_at
    FROM posts
    WHERE id = $1
  `,
    [postId]
  );
  return result.rows[0] || null;
};

const getPostWithCounts = async (postId) => {
  const result = await pool.query(
    `
    SELECT
      posts.id,
      posts.content_text,
      posts.parent_post_id,
      posts.created_at,
      posts.updated_at,
      accounts.id AS author_id,
      accounts.username AS author_username,
      COALESCE(like_counts.like_count, 0) AS like_count,
      COALESCE(dislike_counts.dislike_count, 0) AS dislike_count,
      COALESCE(reply_counts.reply_count, 0) AS reply_count
    FROM posts
    JOIN accounts ON accounts.id = posts.author_id
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS like_count
      FROM post_reactions
      WHERE post_id = posts.id AND reaction = 'like'
    ) like_counts ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS dislike_count
      FROM post_reactions
      WHERE post_id = posts.id AND reaction = 'dislike'
    ) dislike_counts ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS reply_count
      FROM posts replies
      WHERE replies.parent_post_id = posts.id
    ) reply_counts ON true
    WHERE posts.id = $1
  `,
    [postId]
  );
  return result.rows[0] || null;
};

const listPosts = async (limit) => {
  const result = await pool.query(
    `
    SELECT
      posts.id,
      posts.content_text,
      posts.parent_post_id,
      posts.created_at,
      posts.updated_at,
      accounts.id AS author_id,
      accounts.username AS author_username,
      COALESCE(like_counts.like_count, 0) AS like_count,
      COALESCE(dislike_counts.dislike_count, 0) AS dislike_count,
      COALESCE(reply_counts.reply_count, 0) AS reply_count
    FROM posts
    JOIN accounts ON accounts.id = posts.author_id
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS like_count
      FROM post_reactions
      WHERE post_id = posts.id AND reaction = 'like'
    ) like_counts ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS dislike_count
      FROM post_reactions
      WHERE post_id = posts.id AND reaction = 'dislike'
    ) dislike_counts ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS reply_count
      FROM posts replies
      WHERE replies.parent_post_id = posts.id
    ) reply_counts ON true
    WHERE posts.parent_post_id IS NULL
    ORDER BY posts.created_at DESC
    LIMIT $1
  `,
    [limit]
  );
  return result.rows;
};

const listReplies = async (parentPostId, limit) => {
  const result = await pool.query(
    `
    SELECT
      posts.id,
      posts.content_text,
      posts.parent_post_id,
      posts.created_at,
      posts.updated_at,
      accounts.id AS author_id,
      accounts.username AS author_username,
      COALESCE(like_counts.like_count, 0) AS like_count,
      COALESCE(dislike_counts.dislike_count, 0) AS dislike_count,
      0::int AS reply_count
    FROM posts
    JOIN accounts ON accounts.id = posts.author_id
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS like_count
      FROM post_reactions
      WHERE post_id = posts.id AND reaction = 'like'
    ) like_counts ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS dislike_count
      FROM post_reactions
      WHERE post_id = posts.id AND reaction = 'dislike'
    ) dislike_counts ON true
    WHERE posts.parent_post_id = $1
    ORDER BY posts.created_at ASC
    LIMIT $2
  `,
    [parentPostId, limit]
  );
  return result.rows;
};

const setReaction = async (accountId, postId, reaction) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const postResult = await client.query(
      'SELECT id FROM posts WHERE id = $1',
      [postId]
    );
    if (postResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return { error: { status: 404, message: 'Post not found' } };
    }

    const existing = await client.query(
      `
      SELECT id, reaction
      FROM post_reactions
      WHERE post_id = $1 AND account_id = $2
    `,
      [postId, accountId]
    );

    if (existing.rowCount === 0) {
      await client.query(
        `
        INSERT INTO post_reactions (post_id, account_id, reaction)
        VALUES ($1, $2, $3)
      `,
        [postId, accountId, reaction]
      );
    } else if (existing.rows[0].reaction === reaction) {
      await client.query('DELETE FROM post_reactions WHERE id = $1', [
        existing.rows[0].id,
      ]);
    } else {
      await client.query(
        `
        UPDATE post_reactions
        SET reaction = $1, updated_at = NOW()
        WHERE id = $2
      `,
        [reaction, existing.rows[0].id]
      );
    }

    await client.query('COMMIT');
    return { success: true };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  createPost,
  getPostById,
  getPostWithCounts,
  listPosts,
  listReplies,
  setReaction,
};
