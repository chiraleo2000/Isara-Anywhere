/**
 * Thin proxy — legacy /api/video-meeting/* forwards to Izara meeting-server (:3020).
 * Canonical meeting API: meeting-server /api/meetings/*
 */
import { Router, type Request, type Response } from 'express';
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const MEETING_SERVER_URL = (
  process.env.MEETING_SERVER_URL || process.env.VITE_MEETING_SERVER_URL || 'http://localhost:3020'
).replace(/\/$/, '');

const SESSION_COOKIE_NAMES = ['auth_token', 'izara_session', 'session', 'izara_auth_token'];

function parseCookieHeader(cookieHeader: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1);
    try {
      out[key] = decodeURIComponent(value);
    } catch {
      out[key] = value;
    }
  }
  return out;
}

function resolveUpstreamAuth(req: Request): string | null {
  const authReq = req as AuthenticatedRequest;
  if (authReq.sessionToken) return authReq.sessionToken;

  const header = req.headers.authorization || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7).trim() : header.trim();
  if (bearer) return bearer;

  const cookies = parseCookieHeader(req.headers.cookie);
  for (const name of SESSION_COOKIE_NAMES) {
    const value = cookies[name]?.trim();
    if (value) return value;
  }
  return null;
}

function buildUpstreamHeaders(req: Request): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = resolveUpstreamAuth(req);
  if (token) headers.Authorization = `Bearer ${token}`;
  if (req.headers.cookie) headers.Cookie = String(req.headers.cookie);
  return headers;
}

async function proxy(req: Request, res: Response, targetPath: string, method = req.method) {
  try {
    const upstream = await fetch(`${MEETING_SERVER_URL}${targetPath}`, {
      method,
      headers: buildUpstreamHeaders(req),
      body: method === 'GET' || method === 'HEAD' ? undefined : JSON.stringify(req.body ?? {}),
    });
    const text = await upstream.text();
    res.status(upstream.status).type(upstream.headers.get('content-type') || 'application/json').send(text);
  } catch (err) {
    console.error('[video-meeting proxy]', targetPath, err);
    res.status(502).json({ success: false, error: 'Meeting server unavailable' });
  }
}

router.get('/health', (req, res) => proxy(req, res, '/health'));
router.get('/config', (req, res) => proxy(req, res, '/api/config'));

router.post('/create', authMiddleware, (req, res) => proxy(req, res, '/api/meetings/create', 'POST'));
router.get('/:appointmentId', authMiddleware, (req, res) =>
  proxy(req, res, `/api/meetings/${req.params.appointmentId}`, 'GET'));
router.post('/:appointmentId/join', authMiddleware, (req, res) =>
  proxy(req, res, `/api/meetings/${req.params.appointmentId}/lobby/join`, 'POST'));
router.post('/:appointmentId/end', authMiddleware, (req, res) =>
  proxy(req, res, `/api/meetings/${req.params.appointmentId}/end`, 'POST'));
router.get('/:appointmentId/transcript', authMiddleware, (req, res) =>
  proxy(req, res, `/api/meetings/${req.params.appointmentId}/transcript`, 'GET'));
router.post('/:appointmentId/summarize', authMiddleware, (req, res) =>
  proxy(req, res, `/api/meetings/${req.params.appointmentId}/generate-summary`, 'POST'));
router.get('/:appointmentId/consultation-result', authMiddleware, (req, res) =>
  proxy(req, res, `/api/meetings/${req.params.appointmentId}/consultation-result`, 'GET'));

export default router;
