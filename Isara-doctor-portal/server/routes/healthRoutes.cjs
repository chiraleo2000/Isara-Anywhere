/**
 * Doctor portal health routes (extracted from mainApiServer.cjs).
 */
function registerDoctorHealthRoutes(app, deps) {
  const { PORT, DB_AVAILABLE, PostgresDataService } = deps;

  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'Izara Doctor Portal API',
      version: '1.7.37',
      port: PORT,
      features: {
        videoMeeting: 'Jitsi Meet (FREE)',
        transcription: 'Web Speech API (FREE)',
        aiAssistant: 'Gemini 2.5 Flash Lite (FREE)',
        aiClinicalCopilot: 'Gemini-powered CDS',
        storage: 'PostgreSQL + pgvector',
        realtime: 'Socket.IO WebSocket',
      },
    });
  });

  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'Izara Doctor Portal API',
      version: '1.7.37',
      port: PORT,
    });
  });

  app.get('/health/db', async (req, res) => {
    try {
      if (DB_AVAILABLE && PostgresDataService?.pool) {
        await PostgresDataService.pool.query('SELECT 1');
      }
      res.json({
        status: DB_AVAILABLE ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        database: 'PostgreSQL',
        connected: DB_AVAILABLE,
      });
    } catch (error) {
      console.warn('[HEALTH] /health/db check failed:', error.message);
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: 'PostgreSQL',
        connected: false,
        error: 'Database unavailable',
      });
    }
  });

  app.get('/api/health/db', async (req, res) => {
    try {
      if (DB_AVAILABLE && PostgresDataService?.pool) {
        await PostgresDataService.pool.query('SELECT 1');
      }
      res.json({
        status: DB_AVAILABLE ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        database: 'PostgreSQL',
        connected: DB_AVAILABLE,
      });
    } catch (error) {
      console.warn('[HEALTH] /api/health/db check failed:', error.message);
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: 'PostgreSQL',
        connected: false,
        error: 'Database unavailable',
      });
    }
  });
}

module.exports = { registerDoctorHealthRoutes };
