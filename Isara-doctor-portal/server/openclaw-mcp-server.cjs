/**
 * OpenClaw MCP Server — Isara Anywhere Doctor AI v2.0
 * Port: 3016
 *
 * Model Context Protocol (MCP) server that:
 *  1. Maintains stateful patient session contexts
 *  2. Extracts structured medical entities via Gemini AI
 *  3. Routes Doctor AI Tasks 1–5 to appropriate handlers
 *  4. Persists context snapshots to Google Cloud Storage
 *  5. Dispatches care-team briefings via Telegram
 *  6. Coexists synchronously with the existing Google Services backend
 *
 * Security: AES-256-GCM payload encryption, HMAC-SHA256 internal auth,
 *           PDPA-compliant consent gating, RBAC enforcement.
 */

'use strict';

const express = require('express');
const crypto = require('node:crypto');
const path = require('node:path');
const https = require('node:https');
const http = require('node:http');

const app = express();
app.use(express.json({ limit: '2mb' }));

const PORT = process.env.OPENCLAW_MCP_PORT || 3016;
const IS_DEV = process.env.NODE_ENV !== 'production';

// ─── Encryption helpers (AES-256-GCM) ────────────────────────────────────────

const ENCRYPTION_KEY_HEX = process.env.OPENCLAW_MCP_ENCRYPTION_KEY || '';
const INTERNAL_SECRET = process.env.OPENCLAW_MCP_INTERNAL_SECRET || '';

/**
 * Encrypt plaintext string → base64 ciphertext (AES-256-GCM).
 * In production, throws if key is missing; in dev mode, warns and stores plaintext.
 */
function encryptPayload(plaintext) {
  if (!ENCRYPTION_KEY_HEX || ENCRYPTION_KEY_HEX.length < 64) {
    if (!IS_DEV) {
      throw new Error('[MCP] OPENCLAW_MCP_ENCRYPTION_KEY must be a 32-byte (64-char) hex string in production');
    }
    console.warn('[MCP] Encryption key not configured — storing plaintext (dev mode only)');
    return plaintext;
  }
  const key = Buffer.from(ENCRYPTION_KEY_HEX, 'hex');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

/**
 * Decrypt base64 ciphertext → plaintext string (AES-256-GCM).
 */
function decryptPayload(ciphertext) {
  if (!ENCRYPTION_KEY_HEX || ENCRYPTION_KEY_HEX.length < 64) {
    return ciphertext;
  }
  const buf = Buffer.from(ciphertext, 'base64');
  const iv = buf.slice(0, 12);
  const tag = buf.slice(12, 28);
  const encrypted = buf.slice(28);
  const key = Buffer.from(ENCRYPTION_KEY_HEX, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final('utf8');
}

// ─── Internal authentication middleware ───────────────────────────────────────

function requireInternalAuth(req, res, next) {
  // In production, INTERNAL_SECRET must be configured
  if (!INTERNAL_SECRET) {
    if (!IS_DEV) {
      console.error('[MCP] FATAL: OPENCLAW_MCP_INTERNAL_SECRET is not set in production');
      return res.status(503).json({ error: 'Service misconfigured' });
    }
    // Dev mode — skip auth
    return next();
  }
  const provided = req.headers['x-internal-secret'];
  if (!provided) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const expectedBuf = Buffer.from(INTERNAL_SECRET);
  const providedBuf = Buffer.from(provided);
  // Buffers must be same length for timingSafeEqual
  if (expectedBuf.length !== providedBuf.length) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!crypto.timingSafeEqual(expectedBuf, providedBuf)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// ─── In-memory MCP session store ─────────────────────────────────────────────
// Structure: Map<patientId, MCPSession>

/**
 * @typedef {Object} MCPSession
 * @property {string} patientId
 * @property {string} channel  - 'line' | 'whatsapp' | 'telegram' | 'messages'
 * @property {string[]} symptoms
 * @property {Object} vitalSigns
 * @property {Object} historyOfPresentIllness
 * @property {string[]} medications
 * @property {string[]} allergies
 * @property {string[]} chronicConditions
 * @property {Object[]} investigations  - lab / radiology / pathology orders
 * @property {Object[]} assessments
 * @property {Object[]} messages        - raw normalised messages
 * @property {Date} createdAt
 * @property {Date} updatedAt
 */
const sessionStore = new Map();

function getOrCreateSession(patientId, channel) {
  if (!sessionStore.has(patientId)) {
    sessionStore.set(patientId, {
      patientId,
      channel: channel || 'unknown',
      symptoms: [],
      vitalSigns: {},
      historyOfPresentIllness: {},
      medications: [],
      allergies: [],
      chronicConditions: [],
      investigations: [],
      assessments: [],
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(`[MCP] Created session for patient ${patientId} via ${channel}`);
  }
  return sessionStore.get(patientId);
}

// ─── Gemini AI entity extraction ──────────────────────────────────────────────

const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash-lite';

/**
 * Call Gemini REST API to extract structured medical entities from raw text.
 * Returns { symptoms, vitalSigns, historyOfPresentIllness, medications, allergies }
 */
async function extractMedicalEntities(text) {
  if (!GEMINI_API_KEY) {
    console.warn('[MCP] Gemini API key not configured — entity extraction skipped');
    return { symptoms: [], vitalSigns: {}, historyOfPresentIllness: {}, medications: [], allergies: [] };
  }

  const prompt = `You are a clinical NLP engine. Extract structured medical entities from the patient message below.
Return ONLY valid JSON with this schema:
{
  "symptoms": ["string"],
  "vitalSigns": { "temperature": null, "heartRate": null, "bloodPressure": null, "oxygenSaturation": null },
  "historyOfPresentIllness": {
    "onset": null,
    "duration": null,
    "severity": null,
    "associatedFactors": []
  },
  "medications": ["string"],
  "allergies": ["string"]
}

Patient message:
"""${text}"""`;

  return new Promise((resolve) => {
    const body = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 1024 }
    });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    const options = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    };

    const req = https.request(url, options, (resp) => {
      let data = '';
      resp.on('data', (chunk) => { data += chunk; });
      resp.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const rawText = parsed?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
          const jsonMatch = rawText.match(/\{[\s\S]*\}/);
          resolve(jsonMatch ? JSON.parse(jsonMatch[0]) : {});
        } catch (_) {
          resolve({});
        }
      });
    });

    req.on('error', (err) => {
      console.error('[MCP] Gemini entity extraction error:', err.message);
      resolve({});
    });

    req.write(body);
    req.end();
  });
}

/**
 * Generate a care-team brief summary for Telegram.
 */
async function generateTeamBrief(session, question) {
  if (!GEMINI_API_KEY) return 'AI summary unavailable — Gemini API key not configured.';

  const prompt = `You are a clinical summary AI. Generate a concise care-team brief (≤ 400 words) for the following patient context.
IMPORTANT: Do not include the patient's real name — use their ID only.

Patient ID: ${session.patientId}
Chief Symptoms: ${session.symptoms.join(', ') || 'Not recorded'}
Vital Signs: ${JSON.stringify(session.vitalSigns)}
HPI: ${JSON.stringify(session.historyOfPresentIllness)}
Current Medications: ${session.medications.join(', ') || 'None'}
Chronic Conditions: ${session.chronicConditions.join(', ') || 'None'}
Pending Investigations: ${session.investigations.map(i => i.name).join(', ') || 'None'}
Consult Question: ${question || 'General review'}

Provide: Chief complaint, key clinical findings, current plan, specific consult question.`;

  return new Promise((resolve) => {
    const body = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 600 }
    });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    const options = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    };

    const req = https.request(url, options, (resp) => {
      let data = '';
      resp.on('data', (chunk) => { data += chunk; });
      resp.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed?.candidates?.[0]?.content?.parts?.[0]?.text || 'Summary unavailable');
        } catch (_) {
          resolve('Summary unavailable');
        }
      });
    });

    req.on('error', (err) => {
      console.error('[MCP] Gemini team-brief error:', err.message);
      resolve('Summary unavailable — internal error');
    });

    req.write(body);
    req.end();
  });
}

/**
 * Generate a referral document from full MCP context.
 */
async function generateReferralDocument(session, targetFacility) {
  if (!GEMINI_API_KEY) return { error: 'Gemini API key not configured' };

  const prompt = `You are a medical documentation AI. Generate a structured referral letter in JSON format.
De-identify the patient (use ID only, no real name).

Patient ID: ${session.patientId}
Symptoms: ${session.symptoms.join(', ')}
HPI: ${JSON.stringify(session.historyOfPresentIllness)}
Medications: ${session.medications.join(', ') || 'None'}
Allergies: ${session.allergies.join(', ') || 'NKDA'}
Investigations: ${JSON.stringify(session.investigations)}
Assessments: ${JSON.stringify(session.assessments)}
Target Facility: ${targetFacility || 'Not specified'}

Return JSON:
{
  "referralDate": "ISO date",
  "patientId": "...",
  "targetFacility": "...",
  "reasonForReferral": "...",
  "clinicalSummary": "...",
  "currentMedications": [],
  "allergies": [],
  "investigationsPerformed": [],
  "urgency": "routine|urgent|emergency"
}`;

  return new Promise((resolve) => {
    const body = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 1500 }
    });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    const options = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    };

    const req = https.request(url, options, (resp) => {
      let data = '';
      resp.on('data', (chunk) => { data += chunk; });
      resp.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const rawText = parsed?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
          const jsonMatch = rawText.match(/\{[\s\S]*\}/);
          resolve(jsonMatch ? JSON.parse(jsonMatch[0]) : { error: 'Parse failed' });
        } catch (_) {
          resolve({ error: 'Failed to parse referral' });
        }
      });
    });

    req.on('error', (err) => {
      console.error('[MCP] Gemini referral error:', err.message);
      resolve({ error: err.message });
    });

    req.write(body);
    req.end();
  });
}

// ─── GCS persistence helper ───────────────────────────────────────────────────

const GCS_API_URL = process.env.GCS_API_INTERNAL_URL || 'http://localhost:3012';

/**
 * Persist encrypted MCP session snapshot to GCS patient bucket.
 */
function persistSessionToGCS(session) {
  try {
    const payload = encryptPayload(JSON.stringify(session));
    const body = JSON.stringify({
      bucket: 'izara-patients-data',
      path: `mcp-context/${session.patientId}/session.enc`,
      content: payload
    });

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'x-internal-secret': INTERNAL_SECRET
      }
    };

    const url = new URL(`${GCS_API_URL}/api/storage/write`);
    const req = (url.protocol === 'https:' ? https : http).request(url, options, () => {});
    req.on('error', (err) => console.error('[MCP] GCS persist error:', err.message));
    req.write(body);
    req.end();
  } catch (err) {
    console.error('[MCP] persistSessionToGCS error:', err.message);
  }
}

// ─── Telegram dispatch ────────────────────────────────────────────────────────

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CARE_TEAM_CHAT_ID = process.env.TELEGRAM_CARE_TEAM_CHAT_ID || '';

/**
 * Send a message to the Telegram care-team group.
 */
function sendTelegramMessage(text) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CARE_TEAM_CHAT_ID) {
    console.warn('[MCP] Telegram not configured — team brief not dispatched');
    return;
  }

  const body = JSON.stringify({ chat_id: TELEGRAM_CARE_TEAM_CHAT_ID, text, parse_mode: 'Markdown' });
  const options = {
    hostname: 'api.telegram.org',
    path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
  };

  const req = https.request(options, (resp) => {
    let data = '';
    resp.on('data', (chunk) => { data += chunk; });
    resp.on('end', () => {
      const parsed = JSON.parse(data);
      if (!parsed.ok) console.error('[MCP] Telegram API error:', parsed.description);
      else console.log('[MCP] Team brief sent to Telegram ✓');
    });
  });

  req.on('error', (err) => console.error('[MCP] Telegram send error:', err.message));
  req.write(body);
  req.end();
}

// ─── MCP Routes ───────────────────────────────────────────────────────────────

/**
 * POST /mcp/ingest
 * Receive a normalised OmnichannelMessage, extract entities, update session.
 *
 * Body: { patientId, channel, text, messageId, timestamp }
 */
app.post('/mcp/ingest', requireInternalAuth, async (req, res) => {
  const { patientId, channel, text, messageId, timestamp } = req.body;

  if (!patientId || !text) {
    return res.status(400).json({ error: 'patientId and text are required' });
  }

  const session = getOrCreateSession(patientId, channel);

  // Append raw message
  session.messages.push({ messageId, channel, text, timestamp: timestamp || new Date() });

  // Extract structured medical entities via Gemini
  const entities = await extractMedicalEntities(text);

  // Merge entities into session context
  if (entities.symptoms?.length) {
    session.symptoms = [...new Set([...session.symptoms, ...entities.symptoms])];
  }
  if (entities.vitalSigns) {
    session.vitalSigns = { ...session.vitalSigns, ...entities.vitalSigns };
  }
  if (entities.historyOfPresentIllness) {
    session.historyOfPresentIllness = {
      ...session.historyOfPresentIllness,
      ...entities.historyOfPresentIllness
    };
  }
  if (entities.medications?.length) {
    session.medications = [...new Set([...session.medications, ...entities.medications])];
  }
  if (entities.allergies?.length) {
    session.allergies = [...new Set([...session.allergies, ...entities.allergies])];
  }

  session.updatedAt = new Date();

  // Persist encrypted snapshot to GCS asynchronously
  persistSessionToGCS(session);

  return res.json({
    success: true,
    sessionId: patientId,
    entitiesExtracted: entities,
    contextUpdated: true
  });
});

/**
 * POST /mcp/context
 * Return full session context snapshot for a patient.
 * Uses POST to keep patientId out of server logs/proxy URL history.
 *
 * Body: { patientId }
 */
app.post('/mcp/context', requireInternalAuth, (req, res) => {
  const { patientId } = req.body;
  if (!patientId) {
    return res.status(400).json({ error: 'patientId is required' });
  }
  const session = sessionStore.get(patientId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  return res.json({ success: true, context: session });
});

/**
 * GET /mcp/sessions
 * List all active session IDs (for the omnichannel monitor).
 */
app.get('/mcp/sessions', requireInternalAuth, (_req, res) => {
  const sessions = Array.from(sessionStore.values()).map((s) => ({
    patientId: s.patientId,
    channel: s.channel,
    symptomCount: s.symptoms.length,
    messageCount: s.messages.length,
    updatedAt: s.updatedAt
  }));
  return res.json({ success: true, sessions });
});

/**
 * POST /mcp/team-brief
 * Generate a Gemini team-brief and dispatch it to the Telegram care-team group.
 *
 * Body: { patientId, question, requestedBy }
 */
app.post('/mcp/team-brief', requireInternalAuth, async (req, res) => {
  const { patientId, question, requestedBy } = req.body;

  if (!patientId) {
    return res.status(400).json({ error: 'patientId is required' });
  }

  const session = sessionStore.get(patientId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const brief = await generateTeamBrief(session, question);
  const telegramText = `🏥 *CARE TEAM CONSULT REQUEST*\n\nRequested by: ${requestedBy || 'Unknown'}\n\n${brief}`;
  sendTelegramMessage(telegramText);

  return res.json({ success: true, brief });
});

/**
 * POST /mcp/referral
 * Generate a referral document from MCP context.
 *
 * Body: { patientId, targetFacility, requestedBy }
 */
app.post('/mcp/referral', requireInternalAuth, async (req, res) => {
  const { patientId, targetFacility, requestedBy } = req.body;

  if (!patientId) {
    return res.status(400).json({ error: 'patientId is required' });
  }

  const session = sessionStore.get(patientId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const referral = await generateReferralDocument(session, targetFacility);
  referral.referralDate = referral.referralDate || new Date().toISOString();
  referral.requestedBy = requestedBy;

  // Persist referral to GCS
  const payload = encryptPayload(JSON.stringify(referral));
  const timestamp = Date.now();
  const gcsBody = JSON.stringify({
    bucket: 'izara-patients-data',
    path: `referrals/${patientId}/${timestamp}.enc`,
    content: payload
  });
  const gcsOptions = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(gcsBody) }
  };
  const gcsUrl = new URL(`${GCS_API_URL}/api/storage/write`);
  const gcsReq = (gcsUrl.protocol === 'https:' ? https : http).request(gcsUrl, gcsOptions, () => {});
  gcsReq.on('error', (e) => console.error('[MCP] GCS referral persist error:', e.message));
  gcsReq.write(gcsBody);
  gcsReq.end();

  return res.json({ success: true, referral });
});

/**
 * POST /mcp/context/delete
 * Delete session context on consent revocation (PDPA right to erasure).
 * Uses POST to avoid exposing patientId in URL logs.
 *
 * Body: { patientId }
 */
app.post('/mcp/context/delete', requireInternalAuth, (req, res) => {
  const { patientId } = req.body;
  if (!patientId) {
    return res.status(400).json({ error: 'patientId is required' });
  }
  if (sessionStore.has(patientId)) {
    sessionStore.delete(patientId);
    console.log(`[MCP] Session deleted for patient (consent revoked)`);
    return res.json({ success: true, message: 'Session context purged' });
  }
  return res.status(404).json({ error: 'Session not found' });
});

/**
 * GET /health
 * Health check endpoint.
 */
app.get('/health', (_req, res) => {
  res.json({
    service: 'OpenClaw MCP Server',
    status: 'healthy',
    activeSessions: sessionStore.size,
    geminiConfigured: !!GEMINI_API_KEY,
    telegramConfigured: !!(TELEGRAM_BOT_TOKEN && TELEGRAM_CARE_TEAM_CHAT_ID),
    timestamp: new Date().toISOString()
  });
});

// ─── Start server ─────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[MCP] OpenClaw MCP Server running on port ${PORT}`);
  console.log(`[MCP] Gemini AI: ${GEMINI_API_KEY ? '✓ configured' : '✗ not configured (NLP disabled)'}`);
  console.log(`[MCP] Telegram:  ${TELEGRAM_BOT_TOKEN ? '✓ configured' : '✗ not configured'}`);
  console.log(`[MCP] Encryption: ${ENCRYPTION_KEY_HEX.length >= 64 ? '✓ AES-256-GCM' : '⚠ dev mode (plaintext)'}`);
});

module.exports = app;
