require('dotenv').config();

const express = require('express');
const { initDb, closeDb } = require('./config/db');
const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const profileRoutes = require('./routes/profile');
const badgeRoutes = require('./routes/badges');
const adminBadgeRoutes = require('./routes/adminBadges');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use('/auth', authRoutes);
app.use('/posts', postRoutes);
app.use('/profile', profileRoutes);
app.use('/badges', badgeRoutes);
app.use('/admin', adminBadgeRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Server is running!' });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});
 
const start = async () => {
  await initDb();
  app.listen(PORT, () => {
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
