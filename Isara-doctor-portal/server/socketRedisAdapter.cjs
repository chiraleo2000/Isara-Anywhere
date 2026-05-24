/**
 * Optional Socket.IO Redis adapter for multi-instance Cloud Run.
 * Set REDIS_URL (e.g. redis://host:6379) to enable cross-instance room broadcast.
 */
async function attachRedisAdapter(io) {
  const redisUrl = process.env.REDIS_URL || process.env.SOCKETIO_REDIS_URL;
  if (!redisUrl) {
    console.log('[WS] Redis adapter skipped (REDIS_URL not set); use min-instances=1 or set REDIS_URL');
    return false;
  }
  try {
    const { createAdapter } = require('@socket.io/redis-adapter');
    const { createClient } = require('redis');
    const pubClient = createClient({ url: redisUrl });
    const subClient = pubClient.duplicate();
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
    console.log('[WS] Socket.IO Redis adapter attached');
    return true;
  } catch (err) {
    console.warn('[WS] Redis adapter unavailable:', err.message);
    return false;
  }
}

module.exports = { attachRedisAdapter };
