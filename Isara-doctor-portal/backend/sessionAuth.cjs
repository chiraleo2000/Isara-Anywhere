/**
 * Unified PostgreSQL session authentication (replaces JWT for API auth).
 * Used by doctor portal auth, main API, and GCS API.
 */
const crypto = require('node:crypto');

const SESSION_VALIDATE_SQL = `
  SELECT s.*, u.id AS uid, u.email, u.role, u.name, u.name_thai, u.is_admin,
         u.doctor_id, u.patient_id, u.admin_privileges, u.specialty
  FROM sessions s
  JOIN users u ON s.user_id = u.id
  WHERE s.token = $1
    AND s.expires_at > NOW()
    AND s.logged_out_at IS NULL
`;

/** Map session+user row to req.user shape used across Izara services. */
function sessionRowToReqUser(row) {
  if (!row) return null;
  return {
    id: row.uid || row.user_id,
    userId: row.uid || row.user_id,
    email: row.email,
    role: row.role || 'doctor',
    name: row.name,
    nameThai: row.name_thai,
    doctorId: row.doctor_id || null,
    patientId: row.patient_id || null,
    isAdmin: Boolean(row.is_admin) || row.role === 'admin',
    adminPrivileges: row.admin_privileges,
    specialty: row.specialty,
  };
}

async function validateSessionToken(pool, token) {
  if (!pool || !token) return null;
  try {
    const result = await pool.query(SESSION_VALIDATE_SQL, [token]);
    return result.rows[0] || null;
  } catch (err) {
    console.error('[sessionAuth] validate error:', err.message);
    return null;
  }
}

function createAuthenticateSession(pool) {
  return async function authenticateSession(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const row = await validateSessionToken(pool, token);
    if (!row) {
      return res.status(403).json({ error: 'Session expired or invalid', code: 'SESSION_INVALID' });
    }
    req.user = sessionRowToReqUser(row);
    req.sessionToken = token;
    return next();
  };
}

function createOptionalSessionAuth(pool) {
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

function requireRole(...allowedRoles) {
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

/** Opaque token for guest invites / recording shares (no JWT). */
function generateOpaqueToken() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = {
  SESSION_VALIDATE_SQL,
  sessionRowToReqUser,
  validateSessionToken,
  createAuthenticateSession,
  createOptionalSessionAuth,
  requireRole,
  generateOpaqueToken,
};
