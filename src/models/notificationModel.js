const { pool } = require('../config/db');

const createNotification = async (recipientId, actorId, type, postId = null) => {
  const actorRes = await pool.query(
    `SELECT a.username, p.avatar_url
     FROM accounts a LEFT JOIN profiles p ON p.account_id = a.id
     WHERE a.id = $1`,
    [actorId]
  );
  const actor = actorRes.rows[0];
  const result = await pool.query(
    `INSERT INTO notifications (recipient_id, actor_id, type, post_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id, created_at`,
    [recipientId, actorId, type, postId]
  );
  const row = result.rows[0];
  return {
    id: row.id,
    type,
    read: false,
    created_at: row.created_at,
    post_id: postId,
    actor_id: actorId,
    actor_username: actor?.username ?? null,
    actor_avatar_url: actor?.avatar_url ?? null,
  };
};

const listNotifications = async (accountId) => {
  const result = await pool.query(
    `SELECT
       n.id,
       n.type,
       n.is_read AS read,
       n.created_at,
       n.post_id,
       n.actor_id,
       a.username AS actor_username,
       p.avatar_url AS actor_avatar_url
     FROM notifications n
     JOIN accounts a ON a.id = n.actor_id
     LEFT JOIN profiles p ON p.account_id = n.actor_id
     WHERE n.recipient_id = $1
     ORDER BY n.created_at DESC
     LIMIT 50`,
    [accountId]
  );
  return result.rows;
};

const markAllRead = async (accountId) => {
  await pool.query(
    `UPDATE notifications SET is_read = TRUE
     WHERE recipient_id = $1 AND is_read = FALSE`,
    [accountId]
  );
};

const getUnreadCount = async (accountId) => {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS count FROM notifications
     WHERE recipient_id = $1 AND is_read = FALSE`,
    [accountId]
  );
  return result.rows[0].count;
};

module.exports = { createNotification, listNotifications, markAllRead, getUnreadCount };
