// ============================================================
//  NYUMBA BACKEND — Cloudflare Workers Entry Point
//  Hono framework (Express-compatible syntax)
// ============================================================

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { rateLimiter } from './middleware/rateLimiter.js';
import { deviceFingerprint } from './middleware/deviceFingerprint.js';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import propertyRoutes from './routes/properties.js';
import inquiryRoutes from './routes/inquiries.js';
import messageRoutes from './routes/messages.js';
import dealRoutes from './routes/deals.js';
import reviewRoutes from './routes/reviews.js';
import adminRoutes from './routes/admin.js';
import locationRoutes from './routes/locations.js';

const app = new Hono();

// ─── Middleware ───────────────────────────────────────────────
app.use('*', cors({ origin: '*' }));
app.use('*', logger());
app.use('*', deviceFingerprint);
app.use('*', rateLimiter);

// ─── Routes ──────────────────────────────────────────────────
app.route('/auth', authRoutes);
app.route('/users', userRoutes);
app.route('/properties', propertyRoutes);
app.route('/inquiries', inquiryRoutes);
app.route('/deals', dealRoutes);
app.route('/reviews', reviewRoutes);
app.route('/admin', adminRoutes);
app.route('/locations', locationRoutes);

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    app: 'Nyumba API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// 404
app.notFound((c) => c.json({ error: 'Route not found' }, 404));

// Error handler
app.onError((err, c) => {
  console.error('[Error]', err);
  return c.json({ error: err.message || 'Internal server error' }, err.status || 500);
});

// ─── Cloudflare Workers export ───────────────────────────────
export default app;
