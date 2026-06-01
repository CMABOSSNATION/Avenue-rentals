// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');

function generateToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

function generateRefreshToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  });
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

// Express middleware
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.userRole = decoded.role;

    // Check if user is banned
    const { data: user } = await supabase
      .from('users')
      .select('id, role, is_banned, is_flagged')
      .eq('id', decoded.userId)
      .single();

    if (!user) return res.status(401).json({ error: 'User not found' });
    if (user.is_banned) {
      return res.status(403).json({
        error: 'Your account has been suspended. Contact support.',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

module.exports = {
  verifyToken: authMiddleware,
  generateToken,
  generateRefreshToken,
  verifyTokenSync: verifyToken,
  requireRole,
};
