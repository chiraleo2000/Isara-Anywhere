/**
 * Unified JWT verification — align with doctor portal mainApiServer.
 */
import jwt from 'jsonwebtoken';

export const JWT_ISSUER = 'izara-telemedicine';
export const JWT_ALGORITHMS = ['HS256'];

export function verifyAccessToken(token, secret) {
  try {
    return jwt.verify(token, secret, {
      issuer: JWT_ISSUER,
      algorithms: JWT_ALGORITHMS,
    });
  } catch (err) {
    if (process.env.IZARA_DEV_TESTING === '1') {
      return jwt.verify(token, secret, { algorithms: JWT_ALGORITHMS });
    }
    throw err;
  }
}

/** Share / guest-invite tokens (no issuer claim). */
export function verifyScopedToken(token, secret) {
  return jwt.verify(token, secret, { algorithms: JWT_ALGORITHMS });
}

export function signScopedToken(payload, secret, options = {}) {
  return jwt.sign(payload, secret, {
    algorithm: 'HS256',
    ...options,
  });
}

export function createAuthenticateToken(secret) {
  return (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    try {
      req.user = verifyAccessToken(token, secret);
      next();
    } catch (error) {
      const name = error?.name || 'Error';
      if (name === 'TokenExpiredError') {
        return res.status(403).json({ error: 'Token expired' });
      }
      return res.status(403).json({ error: 'Invalid token' });
    }
  };
}

export function requireRole(...allowedRoles) {
  const set = new Set(allowedRoles);
  return (req, res, next) => {
    const role = req.user?.role;
    if (role && set.has(role)) return next();
    if (set.has('admin') && (req.user?.isAdmin || role === 'admin')) return next();
    if (set.has('doctor') && (role === 'doctor' || role === 'moderator' || req.user?.doctorId)) {
      return next();
    }
    return res.status(403).json({ error: 'Insufficient role' });
  };
}
