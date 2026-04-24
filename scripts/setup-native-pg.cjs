/**
 * Setup native PostgreSQL for local development
 * Run when Docker is not available
 */
const { Pool } = require('pg');

async function setup() {
  // Connect with trust auth (pg_hba.conf temporarily set to trust)
  const adminPool = new Pool({
    host: '127.0.0.1',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'anything',  // trust auth ignores password
    connectionTimeoutMillis: 10000,
  });

  try {
    console.log('Connecting to native PostgreSQL...');
    await adminPool.query('SELECT 1');
    console.log('✅ Connected!');

    // Set the postgres password to match Docker config
    await adminPool.query("ALTER USER postgres WITH PASSWORD 'IzaraDb2024'");
    console.log('✅ Password set to IzaraDb2024');

    // Create database if not exists
    const dbCheck = await adminPool.query(
      "SELECT datname FROM pg_database WHERE datname = 'izara_phase1'"
    );
    if (dbCheck.rows.length === 0) {
      await adminPool.query('CREATE DATABASE izara_phase1');
      console.log('✅ Database izara_phase1 created');
    } else {
      console.log('ℹ️  Database izara_phase1 already exists');
    }

    console.log('\n✅ Setup complete! Now reverting pg_hba.conf to scram-sha-256...');
  } catch (err) {
    console.error('❌ Error:', err.code, err.message);
    process.exit(1);
  } finally {
    await adminPool.end();
  }
}

setup();
