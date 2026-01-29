/**
 * Master Startup Script for Izara Doctor Portal
 *
 * Starts all required servers in the correct order:
 * 1. GCS API Server (port 3012) - Internal storage operations
 * 2. Auth Server (port 3011) - Authentication and storage proxy
 * 3. Main API Server (port 3009) - Clinical operations
 */

const { spawn } = require('node:child_process');
const path = require('node:path');

const servers = [
  {
    name: 'GCS API Server',
    script: path.join(__dirname, 'gcsApiServer.cjs'),
    port: 3012,
    color: '\x1b[36m' // Cyan
  },
  {
    name: 'Auth Server',
    script: path.join(__dirname, 'authServer.cjs'),
    port: 3011,
    color: '\x1b[33m' // Yellow
  },
  {
    name: 'Main API Server',
    script: path.join(__dirname, 'mainApiServer.cjs'),
    port: 3009,
    color: '\x1b[35m' // Magenta
  }
];

const resetColor = '\x1b[0m';
const processes = [];

function log(serverName, message, color) {
  const timestamp = new Date().toISOString().substring(11, 19);
  console.log(`${color}[${timestamp}] [${serverName}]${resetColor} ${message}`);
}

function startServer(server) {
  return new Promise((resolve, reject) => {
    log(server.name, `Starting on port ${server.port}...`, server.color);

    const child = spawn('node', [server.script], {
      stdio: ['inherit', 'pipe', 'pipe'],
      env: { ...process.env, PORT: server.port.toString() }
    });

    processes.push({ name: server.name, process: child });

    child.stdout.on('data', (data) => {
      const lines = data.toString().split('\n');
      lines.forEach(line => {
        if (line.trim()) {
          log(server.name, line.trim(), server.color);
        }
      });
    });

    child.stderr.on('data', (data) => {
      const lines = data.toString().split('\n');
      lines.forEach(line => {
        if (line.trim()) {
          log(server.name, `ERROR: ${line.trim()}`, '\x1b[31m'); // Red
        }
      });
    });

    child.on('error', (error) => {
      log(server.name, `Failed to start: ${error.message}`, '\x1b[31m');
      reject(error);
    });

    child.on('exit', (code) => {
      if (code !== 0) {
        log(server.name, `Exited with code ${code}`, '\x1b[31m');
      }
    });

    // Wait for the server to start
    // GCS API server needs more time to initialize storage connection
    const delay = server.name === 'GCS API Server' ? 3000 : 2000;
    setTimeout(() => {
      log(server.name, 'Started successfully ✓', server.color);
      resolve();
    }, delay);
  });
}

async function startAllServers() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🚀 STARTING IZARA DOCTOR PORTAL BACKEND SERVICES');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    // Start servers sequentially
    for (const server of servers) {
      await startServer(server);
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ ALL SERVERS STARTED SUCCESSFULLY');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('\n📡 Backend Services:');
    console.log('   • GCS API Server:  http://localhost:3012 (Internal)');
    console.log('   • Auth Server:     http://localhost:3011');
    console.log('   • Main API Server: http://localhost:3009');
    console.log('\n🔌 WebSockets:');
    console.log('   • Auth:     ws://localhost:3011/ws');
    console.log('   • Main API: ws://localhost:3009/ws');
    console.log('\n📦 GCS Buckets:');
    console.log('   • izara-users-credentials');
    console.log('   • izara-doctors-data');
    console.log('   • izara-patients-data');
    console.log('   • izara-appointments');
    console.log('   • izara-meta-data');
    console.log('\n💡 Frontend URL:');
    console.log('   • http://localhost:3010 (Vite dev server)');
    console.log('\n═══════════════════════════════════════════════════════════════\n');
    console.log('Press Ctrl+C to stop all servers\n');
  } catch (error) {
    console.error('\n❌ Failed to start servers:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down all servers...\n');

  processes.forEach(({ name, process }) => {
    log(name, 'Stopping...', '\x1b[31m');
    process.kill();
  });

  setTimeout(() => {
    console.log('\n✅ All servers stopped\n');
    process.exit(0);
  }, 1000);
});

process.on('SIGTERM', () => {
  console.log('\n\n🛑 Received SIGTERM, shutting down...\n');
  processes.forEach(({ name, process }) => {
    process.kill();
  });
  process.exit(0);
});

// Start all servers
startAllServers();
