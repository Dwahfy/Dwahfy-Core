const { requireAccountToken } = require('../utils/authToken');
const { listNotifications, markAllRead } = require('../models/notificationModel');

const getNotificationsHandler = async (req, res) => {
  try {
    const auth = requireAccountToken(req);
    if (auth.error) {
      return res.status(auth.error.status).json({ message: auth.error.message });
    }

    const notifications = await listNotifications(auth.decoded.accountId);
    const unreadCount = notifications.filter((n) => !n.read).length;
    return res.json({ notifications, unreadCount });
  } catch (error) {
    return res
      .status(500)
      .json({ error: `Failed to get notifications: ${error.message}` });
  }
};

const markReadHandler = async (req, res) => {
  try {
    const auth = requireAccountToken(req);
    if (auth.error) {
      return res.status(auth.error.status).json({ message: auth.error.message });
    }

    await markAllRead(auth.decoded.accountId);
    return res.json({ success: true });
  } catch (error) {
    return res
      .status(500)
      .json({ error: `Failed to mark notifications read: ${error.message}` });
  }
};

module.exports = { getNotificationsHandler, markReadHandler };
