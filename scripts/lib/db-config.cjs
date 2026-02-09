/**
 * =============================================================================
 * IZARA TELEMEDICINE - DATABASE CONFIGURATION (SHARED)
 * =============================================================================
 * Version: 1.0.0
 * Updated: January 29, 2026
 * 
 * Centralized database configuration for all scripts.
 * Uses environment variables for sensitive data - DO NOT hardcode passwords!
 * 
 * Environment Variables:
 *   DB_HOST          - Database host (default: localhost)
 *   DB_PORT          - Database port (default: 5433 for local, 5432 for cloud)
 *   DB_USER          - Database user (default: postgres)
 *   DB_PASSWORD      - Database password (REQUIRED for cloud)
 *   DB_NAME          - Database name (default: izara_phase1)
 *   CLOUD_DB_HOST    - Cloud database host
 *   CLOUD_DB_PORT    - Cloud database port (default: 5432)
 * =============================================================================
 */

const { Pool, Client } = require('pg');

// =============================================================================
// PRE-COMPUTED PASSWORD HASHES (Safe to store - these are bcrypt hashes)
// =============================================================================

const PASSWORD_HASHES = {
    // P@ssw0rd (for patients)
    patient: '$2b$10$64bK0EpjyC7quRGJNvRqmuH/jX3mA4dzyzYa2vgA2q.H3ZxkQwAmy',
    // IzaraDoctor@2024
    doctor: '$2b$10$aPN6uhBrLoms36C8/017be2GWqUqaPJa6WaTaZ8LrnwAeaf3GajrO',
    // IzaraAdmin@2024
    admin: '$2b$10$fx5arkpb8YI7lEK5lcHdXeksczdG.qloim/uWghlBZXyxv.dNo/wq'
};

// =============================================================================
// DATABASE CONFIGURATION
// =============================================================================

/**
 * Get local database configuration
 * @returns {object} PostgreSQL Pool configuration
 */
function getLocalConfig() {
    return {
        host: process.env.DB_HOST || 'localhost',
        port: Number.parseInt(process.env.DB_PORT || '5433'),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || 'IzaraDb2024',
        database: process.env.DB_NAME || 'izara_phase1',
        ssl: false,
        connectionTimeoutMillis: 10000,
        max: 10
    };
}

/**
 * Get cloud database configuration
 * Requires DB_PASSWORD environment variable for security
 * @returns {object} PostgreSQL Pool configuration
 */
function getCloudConfig() {
    const password = process.env.DB_PASSWORD || process.env.CLOUD_DB_PASSWORD;

    if (!password) {
        console.error('❌ ERROR: DB_PASSWORD environment variable is required for cloud database connections.');
        console.error('   Set it using: $env:DB_PASSWORD="your_password"');
        process.exit(1);
    }

    return {
        host: process.env.CLOUD_DB_HOST || '34.143.228.135',
        port: Number.parseInt(process.env.CLOUD_DB_PORT || '5432'),
        user: process.env.DB_USER || 'postgres',
        password: password,
        database: process.env.DB_NAME || 'izara_phase1',
        ssl: false,
        connectionTimeoutMillis: 30000,
        max: 5
    };
}

/**
 * Get database configuration based on target
 * @param {'local' | 'cloud'} target - Target environment
 * @returns {object} PostgreSQL Pool configuration
 */
function getConfig(target = 'local') {
    return target === 'cloud' ? getCloudConfig() : getLocalConfig();
}

/**
 * Create a new Pool connection
 * @param {'local' | 'cloud'} target - Target environment
 * @returns {Pool} PostgreSQL Pool instance
 */
function createPool(target = 'local') {
    const config = getConfig(target);
    return new Pool(config);
}

/**
 * Create a new Client connection
 * @param {'local' | 'cloud'} target - Target environment
 * @returns {Client} PostgreSQL Client instance
 */
function createClient(target = 'local') {
    const config = getConfig(target);
    return new Client(config);
}

/**
 * Parse command line arguments
 * @returns {Set<string>} Set of arguments for efficient lookup
 */
function parseArgs() {
    return new Set(process.argv.slice(2));
}

/**
 * Determine target from args
 * @param {Set<string>} args - Parsed arguments
 * @returns {'local' | 'cloud'} Target environment
 */
function getTargetFromArgs(args) {
    if (args.has('--cloud') || args.has('-c')) {
        return 'cloud';
    }
    return 'local';
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
    PASSWORD_HASHES,
    getLocalConfig,
    getCloudConfig,
    getConfig,
    createPool,
    createClient,
    parseArgs,
    getTargetFromArgs
};
