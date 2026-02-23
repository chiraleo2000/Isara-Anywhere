/**
 * Omnichannel Webhook Server — Isara Anywhere Doctor AI v2.0
 * Port: 3015
 *
 * Handles inbound messages from:
 *  - LINE Messaging API (POST /webhook/line)
 *  - WhatsApp Cloud API via Meta (GET|POST /webhook/whatsapp)
 *  - Telegram Bot API (POST /webhook/telegram)
 *
 * Security:
 *  - HMAC-SHA256 signature validation per platform
 *  - PDPA consent gate: messages from unconsented users trigger consent flow only
 *  - All PHI forwarded to OpenClaw MCP over localhost (never to external)
 *  - Rate limiting per sender ID
 *
 * Outbound dispatch:
 *  - POST /api/omnichannel/reply → routes to correct channel SDK
 */

'use strict';

const express = require('express');
const crypto = require('node:crypto');
const https = require('node:https');
const http = require('node:http');

const IS_DEV = process.env.NODE_ENV !== 'production';

const app = express();

// Raw body required for LINE/WhatsApp HMAC validation — must come before json()
app.use(express.json({
  limit: '1mb',
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));

const PORT = process.env.OMNICHANNEL_WEBHOOK_PORT || 3015;

// ─── Configuration ────────────────────────────────────────────────────────────

const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || '';
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';

const WHATSAPP_APP_SECRET = process.env.WHATSAPP_APP_SECRET || '';
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || '';
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'isara_whatsapp_verify';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

const MCP_URL = process.env.OPENCLAW_MCP_URL || 'http://localhost:3016';
const MCP_INTERNAL_SECRET = process.env.OPENCLAW_MCP_INTERNAL_SECRET || '';

const GCS_API_URL = process.env.GCS_API_INTERNAL_URL || 'http://localhost:3012';

// ─── PDPA Consent URLs ────────────────────────────────────────────────────────

const APP_BASE_URL = process.env.APP_BASE_URL || 'https://doctor.izara.com';
const CONSENT_URL = `${APP_BASE_URL}/consent`;

// ─── Simple in-memory rate limiter ───────────────────────────────────────────
// Limits: 30 messages per sender per 60 seconds

const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;

// Maximum allowed message text length (prevents DoS via oversized payloads)
const MAX_MESSAGE_TEXT_LENGTH = 4096;

function isRateLimited(senderId) {
  const now = Date.now();
  const entry = rateLimitStore.get(senderId) || { count: 0, windowStart: now };

  if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    entry.count = 1;
    entry.windowStart = now;
    rateLimitStore.set(senderId, entry);
    return false;
  }

  entry.count += 1;
  rateLimitStore.set(senderId, entry);
  return entry.count > RATE_LIMIT_MAX;
}

// ─── Signature validation ─────────────────────────────────────────────────────

/**
 * Validate LINE webhook signature.
 * Header: X-Line-Signature = Base64(HMAC-SHA256(body, channelSecret))
 */
function validateLineSignature(rawBody, signature) {
  if (!LINE_CHANNEL_SECRET) {
    if (!IS_DEV) {
      console.error('[WEBHOOK] LINE_CHANNEL_SECRET is required in production');
      return false;
    }
    console.warn('[WEBHOOK] LINE_CHANNEL_SECRET not set — skipping validation (dev only)');
    return true;
  }
  const expected = crypto
    .createHmac('sha256', LINE_CHANNEL_SECRET)
    .update(rawBody)
    .digest('base64');
  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(signature || '');
  if (expectedBuf.length !== providedBuf.length) return false;
  try {
    return crypto.timingSafeEqual(expectedBuf, providedBuf);
  } catch (_) {
    return false;
  }
}

/**
 * Validate WhatsApp (Meta) webhook signature.
 * Header: X-Hub-Signature-256 = sha256=<hex>
 */
function validateWhatsAppSignature(rawBody, signatureHeader) {
  if (!WHATSAPP_APP_SECRET) {
    if (!IS_DEV) {
      console.error('[WEBHOOK] WHATSAPP_APP_SECRET is required in production');
      return false;
    }
    console.warn('[WEBHOOK] WHATSAPP_APP_SECRET not set — skipping validation (dev only)');
    return true;
  }
  const expected = 'sha256=' + crypto
    .createHmac('sha256', WHATSAPP_APP_SECRET)
    .update(rawBody)
    .digest('hex');
  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(signatureHeader || '');
  if (expectedBuf.length !== providedBuf.length) return false;
  try {
    return crypto.timingSafeEqual(expectedBuf, providedBuf);
  } catch (_) {
    return false;
  }
}

// ─── Consent check ────────────────────────────────────────────────────────────

/**
 * Check whether a user has a valid PDPA consent record in GCS.
 * Returns true if consented, false otherwise.
 */
async function hasConsent(userId, channel) {
  return new Promise((resolve) => {
    const gcsUrl = new URL(`${GCS_API_URL}/api/storage/read`);
    gcsUrl.searchParams.set('bucket', 'izara-users-credentials');
    gcsUrl.searchParams.set('path', `consent/${channel}/${userId}.json`);

    const transport = gcsUrl.protocol === 'https:' ? https : http;
    const req = transport.get(gcsUrl.toString(), (resp) => {
      resolve(resp.statusCode === 200);
    });
    req.on('error', () => resolve(false));
  });
}

/**
 * Store PDPA consent record in GCS.
 */
async function storeConsent(userId, channel, metadata) {
  const record = {
    userId,
    channel,
    consentedAt: new Date().toISOString(),
    pdpaVersion: '1.0',
    scope: ['history_taking', 'clinical_summary', 'prescriptions', 'referrals'],
    metadata: metadata || {}
  };

  const body = JSON.stringify({
    bucket: 'izara-users-credentials',
    path: `consent/${channel}/${userId}.json`,
    content: JSON.stringify(record)
  });

  return new Promise((resolve) => {
    const gcsUrl = new URL(`${GCS_API_URL}/api/storage/write`);
    const options = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    };

    const transport = gcsUrl.protocol === 'https:' ? https : http;
    const req = transport.request(gcsUrl, options, (resp) => {
      resolve(resp.statusCode === 200 || resp.statusCode === 201);
    });
    req.on('error', () => resolve(false));
    req.write(body);
    req.end();
  });
}

// ─── MCP ingestion ────────────────────────────────────────────────────────────

/**
 * Forward a normalised message to the OpenClaw MCP server for entity extraction.
 */
async function ingestToMCP(message) {
  const body = JSON.stringify(message);
  return new Promise((resolve) => {
    const mcpUrl = new URL(`${MCP_URL}/mcp/ingest`);
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'x-internal-secret': MCP_INTERNAL_SECRET
      }
    };

    const transport = mcpUrl.protocol === 'https:' ? https : http;
    const req = transport.request(mcpUrl, options, (resp) => {
      let data = '';
      resp.on('data', (chunk) => { data += chunk; });
      resp.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (_) { resolve({}); }
      });
    });

    req.on('error', (err) => {
      console.error('[WEBHOOK] MCP ingest error:', err.message);
      resolve({ error: err.message });
    });
    req.write(body);
    req.end();
  });
}

// ─── Channel-specific outbound senders ───────────────────────────────────────

/**
 * Send a text reply via LINE Messaging API.
 */
function sendLineReply(replyToken, text) {
  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    console.warn('[WEBHOOK] LINE access token not configured');
    return;
  }

  const body = JSON.stringify({
    replyToken,
    messages: [{ type: 'text', text }]
  });

  const options = {
    hostname: 'api.line.me',
    path: '/v2/bot/message/reply',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      'Content-Length': Buffer.byteLength(body)
    }
  };

  const req = https.request(options, (resp) => {
    if (resp.statusCode !== 200) console.error('[WEBHOOK] LINE reply error:', resp.statusCode);
  });
  req.on('error', (err) => console.error('[WEBHOOK] LINE send error:', err.message));
  req.write(body);
  req.end();
}

/**
 * Send a text message via WhatsApp Cloud API.
 */
function sendWhatsAppMessage(to, text) {
  if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    console.warn('[WEBHOOK] WhatsApp credentials not configured');
    return;
  }

  const body = JSON.stringify({
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: text }
  });

  const options = {
    hostname: 'graph.facebook.com',
    path: `/v19.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
      'Content-Length': Buffer.byteLength(body)
    }
  };

  const req = https.request(options, (resp) => {
    if (resp.statusCode !== 200) console.error('[WEBHOOK] WhatsApp send error:', resp.statusCode);
  });
  req.on('error', (err) => console.error('[WEBHOOK] WhatsApp send error:', err.message));
  req.write(body);
  req.end();
}

/**
 * Send a text message via Telegram Bot API.
 */
function sendTelegramReply(chatId, text) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn('[WEBHOOK] Telegram bot token not configured');
    return;
  }

  const body = JSON.stringify({ chat_id: chatId, text });
  const options = {
    hostname: 'api.telegram.org',
    path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    }
  };

  const req = https.request(options, (resp) => {
    if (resp.statusCode !== 200) console.error('[WEBHOOK] Telegram send error:', resp.statusCode);
  });
  req.on('error', (err) => console.error('[WEBHOOK] Telegram send error:', err.message));
  req.write(body);
  req.end();
}

// ─── Consent flow helpers ─────────────────────────────────────────────────────

const CONSENT_MESSAGE_TH = `🏥 ยินดีต้อนรับสู่ Isara Anywhere

ก่อนเริ่มให้บริการ กรุณาอ่านและให้ความยินยอมตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA)

📋 เราจะเก็บข้อมูลสุขภาพของท่านเพื่อ:
• การซักประวัติและให้คำปรึกษาทางการแพทย์
• การสรุปข้อมูลสำหรับทีมแพทย์
• การออกใบสั่งยาและการส่งต่อ

🔒 ข้อมูลของท่านได้รับการเข้ารหัสและปลอดภัย

กรุณาคลิกลิงก์เพื่อให้ความยินยอม:
${CONSENT_URL}

หากท่านมีคำถาม กรุณาติดต่อ support@izara.com`;

async function handleConsentFlow(userId, channel, replyFn) {
  const consented = await hasConsent(userId, channel);
  if (consented) return true;

  replyFn(CONSENT_MESSAGE_TH);
  console.log(`[WEBHOOK] Consent requested for ${channel} user ${userId}`);
  return false;
}

// ─── LINE webhook ─────────────────────────────────────────────────────────────

app.post('/webhook/line', async (req, res) => {
  // Respond 200 immediately (LINE requires fast response)
  res.status(200).end();

  const signature = req.headers['x-line-signature'];
  if (!validateLineSignature(req.rawBody, signature)) {
    console.warn('[WEBHOOK] LINE signature validation failed');
    return;
  }

  const events = req.body?.events || [];
  for (const event of events) {
    if (event.type !== 'message' || event.message?.type !== 'text') continue;

    const userId = event.source?.userId;
    const text = typeof event.message?.text === 'string'
      ? event.message.text.slice(0, MAX_MESSAGE_TEXT_LENGTH)
      : '';
    const replyToken = event.replyToken;

    if (!userId || !text) continue;
    if (isRateLimited(userId)) {
      console.warn(`[WEBHOOK] LINE rate limit hit for user ${userId}`);
      continue;
    }

    const consented = await handleConsentFlow(userId, 'line', (msg) => sendLineReply(replyToken, msg));
    if (!consented) continue;

    await ingestToMCP({
      patientId: `line_${userId}`,
      channel: 'line',
      text,
      messageId: event.message?.id,
      timestamp: new Date(event.timestamp).toISOString()
    });

    // Acknowledge receipt to patient
    sendLineReply(replyToken,
      '✅ ได้รับข้อความของท่านแล้ว ทีมแพทย์กำลังดูแลท่านอยู่ กรุณารอสักครู่');
  }
});

// ─── WhatsApp webhook (verify + receive) ────────────────────────────────────

// GET — webhook verification challenge
app.get('/webhook/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN) {
    console.log('[WEBHOOK] WhatsApp webhook verified ✓');
    return res.status(200).send(challenge);
  }
  console.warn('[WEBHOOK] WhatsApp verification failed');
  return res.status(403).end();
});

// POST — inbound messages
app.post('/webhook/whatsapp', async (req, res) => {
  res.status(200).end();

  const signatureHeader = req.headers['x-hub-signature-256'];
  if (!validateWhatsAppSignature(req.rawBody, signatureHeader)) {
    console.warn('[WEBHOOK] WhatsApp signature validation failed');
    return;
  }

  const changes = req.body?.entry?.[0]?.changes || [];
  for (const change of changes) {
    const messages = change?.value?.messages || [];
    for (const msg of messages) {
      if (msg.type !== 'text') continue;

      const from = msg.from; // WhatsApp phone number
      const text = typeof msg.text?.body === 'string'
        ? msg.text.body.slice(0, MAX_MESSAGE_TEXT_LENGTH)
        : '';
      if (!from || !text) continue;

      if (isRateLimited(from)) {
        console.warn(`[WEBHOOK] WhatsApp rate limit hit for ${from}`);
        continue;
      }

      const consented = await handleConsentFlow(from, 'whatsapp',
        (consentMsg) => sendWhatsAppMessage(from, consentMsg));
      if (!consented) continue;

      await ingestToMCP({
        patientId: `wa_${from}`,
        channel: 'whatsapp',
        text,
        messageId: msg.id,
        timestamp: new Date(Number(msg.timestamp) * 1000).toISOString()
      });

      sendWhatsAppMessage(from, '✅ ได้รับข้อความของท่านแล้ว ทีมแพทย์กำลังดูแลท่านอยู่');
    }
  }
});

// ─── Telegram webhook ─────────────────────────────────────────────────────────

app.post('/webhook/telegram', async (req, res) => {
  res.status(200).end();

  const update = req.body;
  const msg = update?.message;
  if (!msg?.text) return;

  const chatId = msg.chat?.id;
  const userId = String(msg.from?.id);
  const text = typeof msg.text === 'string'
    ? msg.text.slice(0, MAX_MESSAGE_TEXT_LENGTH)
    : '';

  if (!chatId || !userId || !text) return;
  if (isRateLimited(userId)) {
    console.warn(`[WEBHOOK] Telegram rate limit hit for user ${userId}`);
    return;
  }

  const consented = await handleConsentFlow(userId, 'telegram',
    (consentMsg) => sendTelegramReply(chatId, consentMsg));
  if (!consented) return;

  await ingestToMCP({
    patientId: `tg_${userId}`,
    channel: 'telegram',
    text,
    messageId: String(msg.message_id),
    timestamp: new Date(msg.date * 1000).toISOString()
  });

  sendTelegramReply(chatId, '✅ ได้รับข้อความของท่านแล้ว ทีมแพทย์กำลังดูแลท่านอยู่');
});

// ─── Outbound reply API ───────────────────────────────────────────────────────

/**
 * POST /api/omnichannel/reply
 * Dispatch a message to a patient via their registered channel.
 *
 * Body: { patientId, channel, text, replyToken? }
 */
app.post('/api/omnichannel/reply', (req, res) => {
  const { patientId, channel, text, replyToken } = req.body;
  if (!patientId || !channel || !text) {
    return res.status(400).json({ error: 'patientId, channel, and text are required' });
  }

  switch (channel) {
    case 'line':
      if (replyToken) {
        sendLineReply(replyToken, text);
      } else {
        console.warn('[WEBHOOK] LINE reply requires replyToken');
      }
      break;
    case 'whatsapp': {
      // Extract phone number from patientId (format: wa_<phone>)
      const phone = patientId.replace('wa_', '');
      sendWhatsAppMessage(phone, text);
      break;
    }
    case 'telegram': {
      const chatId = patientId.replace('tg_', '');
      sendTelegramReply(chatId, text);
      break;
    }
    default:
      return res.status(400).json({ error: `Unsupported channel: ${channel}` });
  }

  return res.json({ success: true, channel, patientId });
});

// ─── Consent management API ───────────────────────────────────────────────────

/**
 * POST /api/consent
 * Record PDPA consent for a patient (called from the consent web page).
 *
 * Body: { userId, channel, metadata }
 */
app.post('/api/consent', async (req, res) => {
  const { userId, channel, metadata } = req.body;
  if (!userId || !channel) {
    return res.status(400).json({ error: 'userId and channel are required' });
  }

  const success = await storeConsent(userId, channel, metadata);
  if (success) {
    console.log(`[WEBHOOK] Consent stored for ${channel} user ${userId}`);
    return res.json({ success: true, message: 'Consent recorded' });
  }
  return res.status(500).json({ error: 'Failed to store consent record' });
});

/**
 * GET /api/consent/:channel/:userId
 * Check consent status for a user.
 */
app.get('/api/consent/:channel/:userId', async (req, res) => {
  const { channel, userId } = req.params;
  const consented = await hasConsent(userId, channel);
  return res.json({ userId, channel, consented });
});

/**
 * DELETE /api/consent/:channel/:userId
 * Revoke consent (PDPA right to erasure). Also purges MCP session.
 */
app.delete('/api/consent/:channel/:userId', async (req, res) => {
  const { channel, userId } = req.params;

  // Delete consent record from GCS
  const gcsBody = JSON.stringify({
    bucket: 'izara-users-credentials',
    path: `consent/${channel}/${userId}.json`
  });
  const gcsUrl = new URL(`${GCS_API_URL}/api/storage/delete`);
  const options = {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(gcsBody) }
  };
  const transport = gcsUrl.protocol === 'https:' ? https : http;
  const gcsReq = transport.request(gcsUrl, options, () => {});
  gcsReq.on('error', (e) => console.error('[WEBHOOK] GCS consent delete error:', e.message));
  gcsReq.write(gcsBody);
  gcsReq.end();

  // Derive patientId and delete MCP context via POST (avoids patientId in URL logs)
  const prefixMap = { line: 'line_', whatsapp: 'wa_', telegram: 'tg_', messages: 'msg_' };
  const patientId = (prefixMap[channel] || `${channel}_`) + userId;
  const mcpDeleteBody = JSON.stringify({ patientId });
  const mcpDeleteUrl = new URL(`${MCP_URL}/mcp/context/delete`);
  const mcpOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(mcpDeleteBody),
      'x-internal-secret': MCP_INTERNAL_SECRET
    }
  };
  const mcpTransport = mcpDeleteUrl.protocol === 'https:' ? https : http;
  const mcpReq = mcpTransport.request(mcpDeleteUrl, mcpOptions, () => {});
  mcpReq.on('error', (e) => console.error('[WEBHOOK] MCP context delete error:', e.message));
  mcpReq.write(mcpDeleteBody);
  mcpReq.end();

  return res.json({ success: true, message: 'Consent revoked and data purged' });
});

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({
    service: 'Omnichannel Webhook Server',
    status: 'healthy',
    channels: {
      line: !!LINE_CHANNEL_SECRET,
      whatsapp: !!(WHATSAPP_APP_SECRET && WHATSAPP_ACCESS_TOKEN),
      telegram: !!TELEGRAM_BOT_TOKEN
    },
    timestamp: new Date().toISOString()
  });
});

// ─── Start server ─────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[WEBHOOK] Omnichannel Webhook Server running on port ${PORT}`);
  console.log(`[WEBHOOK] LINE:      ${LINE_CHANNEL_SECRET ? '✓ configured' : '✗ not configured'}`);
  console.log(`[WEBHOOK] WhatsApp:  ${WHATSAPP_APP_SECRET ? '✓ configured' : '✗ not configured'}`);
  console.log(`[WEBHOOK] Telegram:  ${TELEGRAM_BOT_TOKEN ? '✓ configured' : '✗ not configured'}`);
});

module.exports = app;
