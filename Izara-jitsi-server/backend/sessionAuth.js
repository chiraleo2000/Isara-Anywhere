/**
 * Session-based API auth for meeting server (replaces jwtPolicy access tokens).
 */
import crypto from 'node:crypto';

const SESSION_VALIDATE_SQL = `
  SELECT s.*, u.id AS uid, u.email, u.role, u.name, u.name_thai, u.is_admin,
         u.doctor_id, u.patient_id, u.admin_privileges, u.specialty
  FROM sessions s
  JOIN users u ON s.user_id = u.id
  WHERE s.token = $1
    AND s.expires_at > NOW()
    AND s.logged_out_at IS NULL
`;

export function sessionRowToReqUser(row) {
  if (!row) return null;
  return {
    id: row.uid || row.user_id,
    userId: row.uid || row.user_id,
    email: row.email,
    role: row.role || 'doctor',
    name: row.name,
    doctorId: row.doctor_id || null,
    patientId: row.patient_id || null,
    isAdmin: Boolean(row.is_admin) || row.role === 'admin',
  };
}

export async function validateSessionToken(pool, token) {
  if (!pool || !token) return null;
  try {
    const result = await pool.query(SESSION_VALIDATE_SQL, [token]);
    return result.rows[0] || null;
  } catch (err) {
    console.error('[sessionAuth] validate error:', err.message);
    return null;
  }
}

/** Resolve opaque session token from Authorization header or session cookies. */
export function resolveSessionTokenFromRequest(req) {
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    const bearer = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : authHeader.split(' ')[1]?.trim();
    if (bearer) return bearer;
  }
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;
  for (const part of String(cookieHeader).split(';')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!['auth_token', 'izara_session', 'session', 'izara_auth_token', 'token'].includes(key)) continue;
    const value = trimmed.slice(eq + 1);
    try {
      const decoded = decodeURIComponent(value).trim();
      if (decoded) return decoded;
    } catch {
      if (value.trim()) return value.trim();
    }
  }
  return null;
}

export function createAuthenticateSession(pool) {
  return async function authenticateSession(req, res, next) {
    const token = resolveSessionTokenFromRequest(req);
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const row = await validateSessionToken(pool, token);
    if (!row) {
      return res.status(403).json({ error: 'Session expired or invalid', code: 'SESSION_INVALID' });
    }
    req.user = sessionRowToReqUser(row);
    req.sessionToken = token;
    if (pool?.query) {
      pool.query(
        `UPDATE sessions SET expires_at = NOW() + INTERVAL '3 hours'
         WHERE token = $1 AND logged_out_at IS NULL`,
        [token],
      ).catch(() => {});
    }
    return next();
  };
}

export function createOptionalSessionAuth(pool) {
  return async function optionalSessionAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];
    if (token) {
      const row = await validateSessionToken(pool, token);
      if (row) {
        req.user = sessionRowToReqUser(row);
        req.sessionToken = token;
      }
    }
    return next();
  };
}

export function requireRole(...allowedRoles) {
  const set = new Set(allowedRoles);
  return (req, res, next) => {
    const role = req.user?.role;
    if (role && set.has(role)) return next();
    if (set.has('admin') && (req.user?.isAdmin || role === 'admin')) return next();
    if (set.has('doctor') && (role === 'doctor' || req.user?.doctorId)) return next();
    return res.status(403).json({ error: 'Insufficient role' });
  };
}

export function generateOpaqueToken() {
  return crypto.randomBytes(32).toString('hex');
}

/** Guest invite validation via opaque DB token (lookup done in index.js). */
export function validateGuestJoinAccess({ authenticated, requestedRole, inviteValid }) {
  const role = String(requestedRole || '').toLowerCase();
  if (role !== 'guest' || authenticated) return { allowed: true };
  if (inviteValid) return { allowed: true };
  return {
    allowed: false,
    code: 'GUEST_AUTH_REQUIRED',
    error: 'Anonymous guest access disabled — valid invite token required',
  };
}

/** Jitsi room JWT removed — roles enforced via Izara lobby + configOverwrite.moderator. */
export function createJitsiRoleJwt() {
  return null;
}
