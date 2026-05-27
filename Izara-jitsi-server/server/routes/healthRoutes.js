/**
 * Health and config routes extracted from index.js (incremental refactor).
 */
export function registerHealthRoutes(app, deps) {
  const dbOk = () => deps.dbAvailable;
  const {
    genAI,
    JITSI_DOMAIN,
    GEMINI_MODEL,
    activeMeetings,
    activeTranscriptions,
    pool,
    setDbAvailable,
    RECORDINGS_DIR,
    postMeeting,
    fs,
    path,
  } = deps;

  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'izara-jitsi-server',
      version: '1.7.3',
      timestamp: new Date().toISOString(),
      database: dbOk() ? 'connected' : 'disconnected',
      features: {
        jitsi: true,
        transcription: 'web-speech-api',
        ai: !!genAI,
        chat: true,
        guestInvites: true,
        lobby: true,
        consent: true,
        shareLinks: true,
        recording: true,
        recordingStorage: 'filesystem',
      },
    });
  });

  app.get('/api/health', (req, res) => {
    res.json({
      status: dbOk() ? 'healthy' : 'degraded',
      service: 'izara-jitsi-server',
      version: '1.7.3',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      jitsiDomain: JITSI_DOMAIN,
      aiEnabled: !!genAI,
      aiModel: GEMINI_MODEL,
      database: dbOk() ? 'connected' : 'disconnected',
      activeMeetings: activeMeetings.size,
      activeTranscriptions: activeTranscriptions.size,
    });
  });

  app.get('/api/health/stability', (req, res) => {
    let recordingsBytes = 0;
    let recordingsFiles = 0;
    try {
      const walk = (dir) => {
        if (!fs.existsSync(dir)) return;
        for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
          const p = path.join(dir, ent.name);
          if (ent.isDirectory()) walk(p);
          else {
            recordingsFiles += 1;
            recordingsBytes += fs.statSync(p).size;
          }
        }
      };
      walk(RECORDINGS_DIR);
    } catch {
      /* ignore */
    }
    res.json({
      status: 'ok',
      service: 'izara-jitsi-server',
      timestamp: new Date().toISOString(),
      recordingsDir: RECORDINGS_DIR,
      recordingsFiles,
      recordingsBytes,
      recordingLocalRetention:
        process.env.RECORDING_LOCAL_RETENTION ||
        (process.env.NODE_ENV === 'production' ? 'delete_after_persist' : 'keep'),
      pipelineJobs: postMeeting.getPipelineStatus ? 'available' : 'n/a',
      memoryRss: process.memoryUsage().rss,
    });
  });

  app.get('/api/health/db', async (req, res) => {
    try {
      await pool.query('SELECT 1');
      if (setDbAvailable) setDbAvailable(true);
      res.json({ status: 'healthy', database: 'connected' });
    } catch (error) {
      if (setDbAvailable) setDbAvailable(false);
      res.status(503).json({ status: 'degraded', database: 'disconnected', error: error.message });
    }
  });

  app.get('/api/config', (req, res) => {
    res.json({
      jitsiDomain: JITSI_DOMAIN,
      prejoinEnabled: true,
      enableRecording: true,
      enableTranscription: true,
      aiEnabled: !!genAI,
      aiModel: GEMINI_MODEL,
      features: {
        videoConferencing: true,
        screenSharing: true,
        chat: true,
        recording: true,
        transcription: true,
        aiSummary: !!genAI,
      },
    });
  });
}
