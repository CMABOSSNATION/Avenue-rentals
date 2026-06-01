// routes/auth.js — Hono
import { Hono } from 'hono';
import { getSupabase } from '../config/supabase.js';
import { sendOTP, verifyOTP } from '../services/otp.js';
import { generateToken, generateRefreshToken, verifyTokenSync } from '../middleware/auth.js';
import { validateUgandaPhone } from '../config/ugandaLocations.js';
import { checkDeviceFingerprint } from '../middleware/deviceFingerprint.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

const auth = new Hono();

// POST /auth/send-otp
auth.post('/send-otp', authRateLimiter, async (c) => {
  try {
    const { phone } = await c.req.json();
    if (!phone) return c.json({ error: 'Phone number required' }, 400);

    const { valid, normalized, network } = validateUgandaPhone(phone);
    if (!valid) {
      return c.json({ error: 'Please enter a valid Uganda mobile number (MTN or Airtel)' }, 400);
    }

    const supabase = getSupabase(c.env);

    const { data: blacklisted } = await supabase
      .from('blacklist').select('id').eq('phone', normalized).single();
    if (blacklisted) {
      return c.json({ error: 'This number cannot be used. Contact support at support@nyumba.ug' }, 403);
    }

    const deviceId = c.req.header('x-device-id');
    if (deviceId) {
      const { data: deviceBlacklisted } = await supabase
        .from('blacklist').select('id').eq('device_fingerprint', deviceId).single();
      if (deviceBlacklisted) {
        return c.json({ error: 'This device cannot be used. Contact support.' }, 403);
      }
    }

    await sendOTP(normalized, c.env);

    return c.json({
      message: `Verification code sent to ${normalized}`,
      network,
      ...(c.env.NODE_ENV === 'development' && { dev_note: 'Check server logs for OTP' }),
    });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// POST /auth/verify-otp
auth.post('/verify-otp', authRateLimiter, async (c) => {
  try {
    const { phone, code, role, name } = await c.req.json();
    if (!phone || !code) return c.json({ error: 'Phone and code required' }, 400);

    const { valid: phoneValid, normalized } = validateUgandaPhone(phone);
    if (!phoneValid) return c.json({ error: 'Invalid phone number' }, 400);

    const { valid, reason } = await verifyOTP(normalized, code, c.env);
    if (!valid) return c.json({ error: reason }, 400);

    const supabase = getSupabase(c.env);
    let { data: user } = await supabase.from('users').select('*').eq('phone', normalized).single();
    const isNewUser = !user;

    if (isNewUser) {
      if (!role || !['landlord', 'tenant'].includes(role)) {
        return c.json({ error: 'Role required for new users (landlord or tenant)' }, 400);
      }
      if (!name || name.trim().length < 2) {
        return c.json({ error: 'Name required for new users' }, 400);
      }
      const { data: newUser, error } = await supabase
        .from('users')
        .insert({ phone: normalized, name: name.trim(), role, device_fingerprint: c.req.header('x-device-id') || null })
        .select().single();
      if (error) throw error;
      user = newUser;
    } else {
      await supabase.from('users').update({
        last_active: new Date(),
        device_fingerprint: c.req.header('x-device-id') || user.device_fingerprint,
      }).eq('id', user.id);

      if (c.req.header('x-device-id')) {
        await checkDeviceFingerprint(user.id, c.req.header('x-device-id'), c.env);
      }
    }

    const tokenPayload = { userId: user.id, role: user.role };
    const token = await generateToken(tokenPayload, c.env);
    const refreshToken = await generateRefreshToken(tokenPayload, c.env);

    return c.json({
      token, refreshToken, isNewUser,
      user: { id: user.id, name: user.name, phone: user.phone, role: user.role, avatar_url: user.avatar_url, is_verified: user.is_verified, national_id_verified: user.national_id_verified },
    });
  } catch (err) {
    console.error('[Auth] verify-otp error:', err);
    return c.json({ error: 'Authentication failed' }, 500);
  }
});

// POST /auth/refresh
auth.post('/refresh', async (c) => {
  try {
    const { refreshToken } = await c.req.json();
    if (!refreshToken) return c.json({ error: 'Refresh token required' }, 400);
    const decoded = await verifyTokenSync(refreshToken, c.env);
    const token = await generateToken({ userId: decoded.userId, role: decoded.role }, c.env);
    return c.json({ token });
  } catch (err) {
    return c.json({ error: 'Invalid refresh token' }, 401);
  }
});

export default auth;
