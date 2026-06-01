// middleware/auth.js — JWT for Cloudflare Workers
// Workers don't have Node's 'jsonwebtoken'. We use jose (Web Crypto API).
import * as jose from 'jose';
import { getSupabase } from '../config/supabase.js';

export async function generateToken(payload, env) {
  const secret = new TextEncoder().encode(env.JWT_SECRET);
  return await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(env.JWT_EXPIRES_IN || '7d')
    .sign(secret);
}

export async function generateRefreshToken(payload, env) {
  const secret = new TextEncoder().encode(env.JWT_SECRET);
  return await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(env.JWT_REFRESH_EXPIRES_IN || '30d')
    .sign(secret);
}

export async function verifyTokenSync(token, env) {
  const secret = new TextEncoder().encode(env.JWT_SECRET);
  const { payload } = await jose.jwtVerify(token, secret);
  return payload;
}

// Hono middleware
export function verifyToken(c, next) {
  return authMiddleware(c, next);
}

async function authMiddleware(c, next) {
  const authHeader = c.req.header('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'No token provided' }, 401);
  }

  const token = authHeader.slice(7);
  try {
    const decoded = await verifyTokenSync(token, c.env);
    c.set('userId', decoded.userId);
    c.set('userRole', decoded.role);

    // Check if user is banned
    const supabase = getSupabase(c.env);
    const { data: user } = await supabase
      .from('users')
      .select('id, role, is_banned, is_flagged')
      .eq('id', decoded.userId)
      .single();

    if (!user) return c.json({ error: 'User not found' }, 401);
    if (user.is_banned) {
      return c.json({ error: 'Your account has been suspended. Contact support.' }, 403);
    }

    c.set('user', user);
    await next();
  } catch (err) {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }
}

export function requireRole(...roles) {
  return async (c, next) => {
    const role = c.get('userRole');
    if (!roles.includes(role)) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }
    await next();
  };
}
