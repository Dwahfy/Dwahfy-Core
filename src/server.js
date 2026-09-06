const fs = require('fs');
require('dotenv').config({ path: fs.existsSync('.env.local') ? '.env.local' : '.env' });

const path = require('path');
const { createServer } = require('http');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { initDb, closeDb, pool } = require('./config/db');
const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const profileRoutes = require('./routes/profile');
const badgeRoutes = require('./routes/badges');
const adminBadgeRoutes = require('./routes/adminBadges');
const adminUserRoutes = require('./routes/adminUsers');
const adminPostRoutes = require('./routes/adminPosts');
const uploadRoutes = require('./routes/upload');
const followRoutes = require('./routes/follows');
const userRoutes = require('./routes/users');
const notificationRoutes = require('./routes/notifications');
const gdprRoutes = require('./routes/gdpr');
const twoFactorRoutes = require('./routes/twoFactor');
const gifRoutes = require('./routes/gifs');
const adminFlagRoutes = require('./routes/adminFlags');
const adminBannerRoutes = require('./routes/adminBanners');
const { publicFlagsHandler } = require('./controllers/flagsController');
const { publicBannerHandler } = require('./controllers/bannersController');
const { initSocketServer } = require('./socket/index');
const app = express();
const PORT = process.env.PORT || 3000;

const CORS_ORIGIN = (process.env.CORS_ORIGIN || 'http://localhost:3001')
  .split(',').map(s => s.trim());
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use('/uploads', express.static(path.join('/app/uploads')));

app.use('/auth', authRoutes);
app.use('/posts', postRoutes);
app.use('/profile', profileRoutes);
app.use('/badges', badgeRoutes);
app.use('/admin', adminBadgeRoutes);
app.use('/admin/users', adminUserRoutes);
app.use('/admin/posts', adminPostRoutes);
app.use('/follows', followRoutes);
app.use('/users', userRoutes);
app.use('/notifications', notificationRoutes);
app.use('/auth', gdprRoutes);
app.use('/auth', twoFactorRoutes);
app.use('/upload', uploadRoutes);
app.use('/gifs', gifRoutes);
app.use('/admin/flags', adminFlagRoutes);
app.use('/admin/banners', adminBannerRoutes);
app.get('/flags', publicFlagsHandler);
app.get('/banner', publicBannerHandler);

app.get('/', (req, res) => {
  res.json({ message: 'Server is running!' });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});
 
const bootstrapAdmin = async () => {
  const username = (process.env.BOOTSTRAP_ADMIN_USERNAME || '').trim().toLowerCase();
  if (!username) return;

  const result = await pool.query(
    'UPDATE accounts SET is_admin = TRUE WHERE username = $1 AND is_admin = FALSE RETURNING username',
    [username]
  );

  if (result.rowCount > 0) {
    console.log(`Bootstrap: promoted "${username}" to admin`);
  } else {
    const exists = await pool.query('SELECT 1 FROM accounts WHERE username = $1', [username]);
    if (exists.rowCount === 0) {
      console.warn(`Bootstrap: account "${username}" not found — create the account first then restart`);
    } else {
      console.log(`Bootstrap: "${username}" is already admin, nothing to do`);
    }
  }
};

const start = async () => {
  await initDb();
  await bootstrapAdmin();
  const httpServer = createServer(app);
  initSocketServer(httpServer);
  httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

const shutdown = async () => {
  await closeDb();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
