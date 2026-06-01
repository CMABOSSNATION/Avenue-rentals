// ============================================================
//  NYUMBA BACKEND — Main Entry Point
//  Node.js + Express + Socket.io
// ============================================================

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { verifyToken } = require('./middleware/auth');
const { deviceFingerprint } = require('./middleware/deviceFingerprint');

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const propertyRoutes = require('./routes/properties');
const inquiryRoutes = require('./routes/inquiries');
const messageRoutes = require('./routes/messages');
const dealRoutes = require('./routes/deals');
const reviewRoutes = require('./routes/reviews');
const adminRoutes = require('./routes/admin');
const locationRoutes = require('./routes/locations');

const app = express();
const server = http.createServer(app);

// ─── Socket.io Setup ─────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST'],
  },
});

// Store io instance for use in routes
app.set('io', io);

// Connected sockets map: userId → socketId
const connectedUsers = new Map();

io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication required'));
  try {
    const { verifyToken: verify } = require('./middleware/auth');
    const decoded = verify(token);
    socket.userId = decoded.userId;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  console.log(`[Socket] User ${socket.userId} connected`);
  connectedUsers.set(socket.userId, socket.id);

  // Join inquiry rooms
  socket.on('join_inquiry', (inquiryId) => {
    socket.join(`inquiry_${inquiryId}`);
  });

  socket.on('leave_inquiry', (inquiryId) => {
    socket.leave(`inquiry_${inquiryId}`);
  });

  socket.on('typing', ({ inquiryId }) => {
    socket.to(`inquiry_${inquiryId}`).emit('user_typing', {
      userId: socket.userId,
    });
  });

  socket.on('disconnect', () => {
    connectedUsers.delete(socket.userId);
    console.log(`[Socket] User ${socket.userId} disconnected`);
  });
});

app.set('connectedUsers', connectedUsers);

// ─── Middleware ───────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(deviceFingerprint);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: { error: 'Too many requests, please slow down.' },
});
app.use(limiter);

// Strict limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { error: 'Too many login attempts. Try again in an hour.' },
});

// ─── Routes ──────────────────────────────────────────────────
app.use('/auth', authLimiter, authRoutes);
app.use('/users', verifyToken, userRoutes);
app.use('/properties', propertyRoutes);
app.use('/inquiries', verifyToken, inquiryRoutes);
app.use('/inquiries', verifyToken, messageRoutes);
app.use('/deals', verifyToken, dealRoutes);
app.use('/reviews', verifyToken, reviewRoutes);
app.use('/admin', verifyToken, adminRoutes);
app.use('/locations', locationRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Nyumba API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[Error]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// ─── Start ───────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n🏠 Nyumba API running on port ${PORT}`);
  console.log(`🌍 Uganda-wide marketplace ready\n`);
});

module.exports = { app, io };
