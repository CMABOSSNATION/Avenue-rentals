// middleware/rateLimiter.js
// Uses Cloudflare KV for rate limiting (no Redis needed)

export async function rateLimiter(c, next) {
  // Skip if KV not bound (dev mode)
  if (!c.env.RATE_LIMIT_KV) return await next();

  const ip = c.req.header('cf-connecting-ip') || 'unknown';
  const key = `rl:${ip}`;
  const windowMs = parseInt(c.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;
  const max = parseInt(c.env.RATE_LIMIT_MAX) || 100;

  try {
    const raw = await c.env.RATE_LIMIT_KV.get(key);
    const count = raw ? parseInt(raw) : 0;

    if (count >= max) {
      return c.json({ error: 'Too many requests, please slow down.' }, 429);
    }

    // Increment counter, expire after window
    await c.env.RATE_LIMIT_KV.put(key, String(count + 1), {
      expirationTtl: Math.ceil(windowMs / 1000),
    });
  } catch (e) {
    // Don't block requests if KV fails
    console.error('[RateLimit] KV error:', e.message);
  }

  await next();
}

export async function authRateLimiter(c, next) {
  if (!c.env.RATE_LIMIT_KV) return await next();

  const ip = c.req.header('cf-connecting-ip') || 'unknown';
  const key = `rl:auth:${ip}`;

  try {
    const raw = await c.env.RATE_LIMIT_KV.get(key);
    const count = raw ? parseInt(raw) : 0;

    if (count >= 10) {
      return c.json({ error: 'Too many login attempts. Try again in an hour.' }, 429);
    }

    await c.env.RATE_LIMIT_KV.put(key, String(count + 1), {
      expirationTtl: 3600, // 1 hour
    });
  } catch (e) {
    console.error('[AuthRateLimit] KV error:', e.message);
  }

  await next();
}
