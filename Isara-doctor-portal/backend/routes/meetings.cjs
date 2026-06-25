/**
 * Meeting-server proxy routes for doctor portal (same-origin BFF).
 * Uses req.sessionToken from authenticateToken — never stale client-only tokens.
 */
const { resolveSessionTokenFromRequest } = require('../sessionAuth.cjs');

function getMeetingServerBase() {
  return (process.env.MEETING_SERVER_URL || process.env.VITE_MEETING_SERVER_URL || '').replace(/\/$/, '');
}

function resolveUpstreamAuth(req) {
  return req.sessionToken || resolveSessionTokenFromRequest(req);
}

async function proxyMeetingServerRequest(req, res, method, pathSuffix) {
  const base = getMeetingServerBase();
  if (!base) {
    return res.status(503).json({ success: false, error: 'Meeting server not configured' });
  }

  const token = resolveUpstreamAuth(req);
  if (!token) {
    return res.status(401).json({ error: 'Authentication required', code: 'SESSION_INVALID' });
  }

  try {
    const init = {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };
    if (req.headers.cookie) {
      init.headers.Cookie = String(req.headers.cookie);
    }
    if (method !== 'GET' && method !== 'HEAD' && req.body && Object.keys(req.body).length > 0) {
      init.body = JSON.stringify(req.body);
    }
    const upstream = await fetch(`${base}${pathSuffix}`, init);
    const text = await upstream.text();
    res.status(upstream.status).type(upstream.headers.get('content-type') || 'application/json').send(text);
  } catch (err) {
    console.error('[MEETING PROXY]', method, pathSuffix, err.message);
    res.status(502).json({ success: false, error: 'Meeting server unavailable' });
  }
}

async function proxyMeetingServerBinary(req, res, pathSuffix) {
  const base = getMeetingServerBase();
  if (!base) {
    return res.status(503).json({ success: false, error: 'Meeting server not configured' });
  }

  const token = resolveUpstreamAuth(req);
  if (!token) {
    return res.status(401).json({ error: 'Authentication required', code: 'SESSION_INVALID' });
  }

  try {
    const upstream = await fetch(`${base}${pathSuffix}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    res.status(upstream.status);
    const contentType = upstream.headers.get('content-type');
    if (contentType) res.type(contentType);
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.send(buf);
  } catch (err) {
    console.error('[MEETING PROXY] binary', pathSuffix, err.message);
    res.status(502).json({ success: false, error: 'Meeting server unavailable' });
  }
}

function registerMeetingProxyRoutes(app, { authenticateToken }) {
  // Static paths MUST precede /:id — otherwise "recording-stream" is treated as meeting id.
  app.get('/api/meetings/recording-stream', authenticateToken, (req, res) => {
    const relPath = req.query.path;
    if (!relPath || typeof relPath !== 'string' || !relPath.startsWith('/api/recordings/')) {
      return res.status(400).json({ success: false, error: 'Invalid recording path' });
    }
    proxyMeetingServerBinary(req, res, relPath);
  });

  // Read
  app.get('/api/meetings/:id', authenticateToken, (req, res) => {
    proxyMeetingServerRequest(req, res, 'GET', `/api/meetings/${req.params.id}`);
  });
  app.get('/api/meetings/:id/results', authenticateToken, (req, res) => {
    proxyMeetingServerRequest(req, res, 'GET', `/api/meetings/${req.params.id}/results`);
  });
  app.get('/api/meetings/:id/pipeline-status', authenticateToken, (req, res) => {
    proxyMeetingServerRequest(req, res, 'GET', `/api/meetings/${req.params.id}/pipeline-status`);
  });
  app.get('/api/meetings/:id/lobby', authenticateToken, (req, res) => {
    proxyMeetingServerRequest(req, res, 'GET', `/api/meetings/${req.params.id}/lobby`);
  });
  app.get('/api/meetings/:id/join-config', authenticateToken, (req, res) => {
    const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    proxyMeetingServerRequest(req, res, 'GET', `/api/meetings/${req.params.id}/join-config${qs}`);
  });

  // Write — meeting lifecycle (recording save must not hit :3020 cross-origin with stale token)
  app.post('/api/meetings/create', authenticateToken, (req, res) => {
    proxyMeetingServerRequest(req, res, 'POST', '/api/meetings/create');
  });
  app.post('/api/meetings/:id/save-recording', authenticateToken, (req, res) => {
    proxyMeetingServerRequest(req, res, 'POST', `/api/meetings/${req.params.id}/save-recording`);
  });
  app.post('/api/meetings/:id/end', authenticateToken, (req, res) => {
    proxyMeetingServerRequest(req, res, 'POST', `/api/meetings/${req.params.id}/end`);
  });
  app.post('/api/meetings/:id/host-present', authenticateToken, (req, res) => {
    proxyMeetingServerRequest(req, res, 'POST', `/api/meetings/${req.params.id}/host-present`);
  });
  app.post('/api/meetings/:id/host-absent', authenticateToken, (req, res) => {
    proxyMeetingServerRequest(req, res, 'POST', `/api/meetings/${req.params.id}/host-absent`);
  });
  app.post('/api/meetings/:id/process-embeddings', authenticateToken, (req, res) => {
    proxyMeetingServerRequest(req, res, 'POST', `/api/meetings/${req.params.id}/process-embeddings`);
  });
  app.post('/api/meetings/:id/generate-summary', authenticateToken, (req, res) => {
    proxyMeetingServerRequest(req, res, 'POST', `/api/meetings/${req.params.id}/generate-summary`);
  });
  app.post('/api/meetings/:id/validate', authenticateToken, (req, res) => {
    proxyMeetingServerRequest(req, res, 'POST', `/api/meetings/${req.params.id}/validate`);
  });
  app.post('/api/meetings/:id/patient-instruction', authenticateToken, (req, res) => {
    proxyMeetingServerRequest(req, res, 'POST', `/api/meetings/${req.params.id}/patient-instruction`);
  });
  app.post('/api/meetings/:id/auto-record', authenticateToken, (req, res) => {
    proxyMeetingServerRequest(req, res, 'POST', `/api/meetings/${req.params.id}/auto-record`);
  });
  app.post('/api/meetings/:id/stop-recording', authenticateToken, (req, res) => {
    proxyMeetingServerRequest(req, res, 'POST', `/api/meetings/${req.params.id}/stop-recording`);
  });
  app.post('/api/meetings/:id/start-transcription', authenticateToken, (req, res) => {
    proxyMeetingServerRequest(req, res, 'POST', `/api/meetings/${req.params.id}/start-transcription`);
  });
  app.post('/api/meetings/:id/pause-transcription', authenticateToken, (req, res) => {
    proxyMeetingServerRequest(req, res, 'POST', `/api/meetings/${req.params.id}/pause-transcription`);
  });
  app.post('/api/meetings/:id/resume-transcription', authenticateToken, (req, res) => {
    proxyMeetingServerRequest(req, res, 'POST', `/api/meetings/${req.params.id}/resume-transcription`);
  });
  app.post('/api/meetings/:id/stop-transcription', authenticateToken, (req, res) => {
    proxyMeetingServerRequest(req, res, 'POST', `/api/meetings/${req.params.id}/stop-transcription`);
  });
  app.post('/api/meetings/:id/transcript', authenticateToken, (req, res) => {
    proxyMeetingServerRequest(req, res, 'POST', `/api/meetings/${req.params.id}/transcript`);
  });
  app.post('/api/meetings/:id/chat', authenticateToken, (req, res) => {
    proxyMeetingServerRequest(req, res, 'POST', `/api/meetings/${req.params.id}/chat`);
  });
  app.post('/api/meetings/:id/consent', authenticateToken, (req, res) => {
    proxyMeetingServerRequest(req, res, 'POST', `/api/meetings/${req.params.id}/consent`);
  });
  app.post('/api/meetings/:id/guest-invite', authenticateToken, (req, res) => {
    proxyMeetingServerRequest(req, res, 'POST', `/api/meetings/${req.params.id}/guest-invite`);
  });
  app.post('/api/meetings/:id/lobby/admit', authenticateToken, (req, res) => {
    proxyMeetingServerRequest(req, res, 'POST', `/api/meetings/${req.params.id}/lobby/admit`);
  });
  app.post('/api/meetings/:id/lobby/reject', authenticateToken, (req, res) => {
    proxyMeetingServerRequest(req, res, 'POST', `/api/meetings/${req.params.id}/lobby/reject`);
  });
  app.post('/api/meetings/:id/lobby/admit-all', authenticateToken, (req, res) => {
    proxyMeetingServerRequest(req, res, 'POST', `/api/meetings/${req.params.id}/lobby/admit-all`);
  });
}

module.exports = {
  registerMeetingProxyRoutes,
  getMeetingServerBase,
  proxyMeetingServerRequest,
  proxyMeetingServerBinary,
};
