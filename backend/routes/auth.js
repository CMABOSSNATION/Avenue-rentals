// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { sendOTP, verifyOTP } = require('../services/otp');
const { generateToken, generateRefreshToken, verifyTokenSync } = require('../middleware/auth');
const { validateUgandaPhone } = require('../config/ugandaLocations');
const { checkDeviceFingerprint } = require('../middleware/deviceFingerprint');

/**
 * POST /auth/send-otp
 * Body: { phone: "0771234567" }
 */
router.post('/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number required' });

    // Validate Uganda number
    const { valid, normalized, network } = validateUgandaPhone(phone);
    if (!valid) {
      return res.status(400).json({
        error: 'Please enter a valid Uganda mobile number (MTN or Airtel)',
      });
    }

    // Check blacklist
    const { data: blacklisted } = await supabase
      .from('blacklist')
      .select('id')
      .eq('phone', normalized)
      .single();

    if (blacklisted) {
      // Generic message — don't reveal why
      return res.status(403).json({
        error: 'This number cannot be used. Contact support at support@nyumba.ug',
      });
    }

    // Check device fingerprint blacklist
    const deviceId = req.headers['x-device-id'];
    if (deviceId) {
      const { data: deviceBlacklisted } = await supabase
        .from('blacklist')
        .select('id')
        .eq('device_fingerprint', deviceId)
        .single();

      if (deviceBlacklisted) {
        return res.status(403).json({
          error: 'This device cannot be used. Contact support.',
        });
      }
    }

    await sendOTP(normalized);

    res.json({
      message: `Verification code sent to ${normalized}`,
      network,
      // In dev, also return code
      ...(process.env.NODE_ENV === 'development' && { dev_note: 'Check server logs for OTP' }),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /auth/verify-otp
 * Body: { phone, code, role?, name? }
 * role & name required only for new users
 */
router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, code, role, name } = req.body;

    if (!phone || !code) {
      return res.status(400).json({ error: 'Phone and code required' });
    }

    const { valid: phoneValid, normalized } = validateUgandaPhone(phone);
    if (!phoneValid) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }

    // Verify OTP
    const { valid, reason } = await verifyOTP(normalized, code);
    if (!valid) {
      return res.status(400).json({ error: reason });
    }

    // Find or create user
    let { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('phone', normalized)
      .single();

    const isNewUser = !user;

    if (isNewUser) {
      // New user — require role and name
      if (!role || !['landlord', 'tenant'].includes(role)) {
        return res.status(400).json({ error: 'Role required for new users (landlord or tenant)' });
      }
      if (!name || name.trim().length < 2) {
        return res.status(400).json({ error: 'Name required for new users' });
      }

      const { data: newUser, error } = await supabase
        .from('users')
        .insert({
          phone: normalized,
          name: name.trim(),
          role,
          device_fingerprint: req.headers['x-device-id'] || null,
        })
        .select()
        .single();

      if (error) throw error;
      user = newUser;
    } else {
      // Update last active + device fingerprint
      await supabase
        .from('users')
        .update({
          last_active: new Date(),
          device_fingerprint: req.headers['x-device-id'] || user.device_fingerprint,
        })
        .eq('id', user.id);

      // Check device fingerprint across accounts
      if (req.headers['x-device-id']) {
        await checkDeviceFingerprint(user.id, req.headers['x-device-id']);
      }
    }

    const tokenPayload = { userId: user.id, role: user.role };
    const token = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    res.json({
      token,
      refreshToken,
      isNewUser,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        avatar_url: user.avatar_url,
        is_verified: user.is_verified,
        national_id_verified: user.national_id_verified,
      },
    });
  } catch (err) {
    console.error('[Auth] verify-otp error:', err);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

/**
 * POST /auth/refresh
 * Body: { refreshToken }
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

    const decoded = verifyTokenSync(refreshToken);
    const token = generateToken({ userId: decoded.userId, role: decoded.role });

    res.json({ token });
  } catch (err) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

module.exports = router;
