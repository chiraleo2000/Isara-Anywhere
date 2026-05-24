/**
 * HTTP input validation — return 4xx instead of 500 on malformed client data.
 */

const CONTROL_CHARS = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/;

export function sanitizeRouteId(id) {
  if (id == null) {
    return { ok: false, status: 400, error: 'Missing route id', code: 'INVALID_ID' };
  }
  const trimmed = String(id).trim();
  if (!trimmed || trimmed.length > 128) {
    return { ok: false, status: 400, error: 'Invalid route id length', code: 'INVALID_ID' };
  }
  if (CONTROL_CHARS.test(trimmed) || trimmed.includes('..')) {
    return { ok: false, status: 400, error: 'Invalid characters in route id', code: 'INVALID_ID' };
  }
  return { ok: true, id: trimmed };
}

export function assertJsonObjectBody(body) {
  if (body === undefined) {
    return { ok: true };
  }
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, status: 400, error: 'Request body must be a JSON object', code: 'INVALID_BODY' };
  }
  return { ok: true };
}

export function parseBase64Payload(value, fieldName = 'payload') {
  if (value == null || value === '') {
    return { ok: false, status: 400, error: `${fieldName} is required`, code: 'MISSING_FIELD' };
  }
  if (typeof value !== 'string') {
    return { ok: false, status: 400, error: `${fieldName} must be a base64 string`, code: 'INVALID_FIELD' };
  }
  if (value.length > 70_000_000) {
    return { ok: false, status: 413, error: `${fieldName} too large`, code: 'PAYLOAD_TOO_LARGE' };
  }
  try {
    const buf = Buffer.from(value, 'base64');
    if (!buf.length && value.length > 0) {
      return { ok: false, status: 400, error: `Invalid ${fieldName} encoding`, code: 'INVALID_BASE64' };
    }
    return { ok: true, buffer: buf };
  } catch {
    return { ok: false, status: 400, error: `Invalid ${fieldName} encoding`, code: 'INVALID_BASE64' };
  }
}

export function sendValidationError(res, result) {
  return res.status(result.status || 400).json({
    error: result.error,
    code: result.code || 'VALIDATION_ERROR',
  });
}
