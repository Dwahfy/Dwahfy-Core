const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const { isTokenBlocked } = require('../utils/tokenBlocklist');

let io = null;

const initSocketServer = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: (process.env.CORS_ORIGIN || 'http://localhost:3001')
        .split(',').map(s => s.trim()),
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const cookies = cookie.parse(socket.handshake.headers.cookie || '');
    const token = cookies.token;
    if (!token) return next(new Error('No token'));
    if (isTokenBlocked(token)) return next(new Error('Token revoked'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (!decoded?.accountId || decoded.type === '2fa-pending')
        return next(new Error('Invalid token'));
      socket.data.accountId = decoded.accountId;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.data.accountId}`);
    socket.on('watch:post', (postId) => {
      if (typeof postId === 'number') socket.join(`post:${postId}`);
    });
    socket.on('unwatch:post', (postId) => {
      socket.leave(`post:${postId}`);
    });
  });

  console.log('Socket.IO initialized');
  return io;
};

const getIo = () => {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
};

module.exports = { initSocketServer, getIo };
