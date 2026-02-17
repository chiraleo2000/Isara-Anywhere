/**
 * Phase 2 Database Migration Runner
 * Connects to cloud dev PostgreSQL and runs the Phase 2 migration.
 * 
 * Usage: node scripts/cloud-run/run-phase2-migration.cjs
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const PG_HOST = '35.240.162.227';
const PG_PORT = 5432;
const PG_DB = 'izara_phase1';
const PG_USER = 'postgres';
const PG_PASSWORD = 'IzaraDb2024';

const MIGRATION_FILE = path.join(__dirname, '..', 'database', 'migrations', 'v2.0.0-phase2-tables.sql');

async function main() {
    console.log('Connecting to cloud PostgreSQL...');
    
    const client = new Client({
        host: PG_HOST,
        port: PG_PORT,
        database: PG_DB,
        user: PG_USER,
        password: PG_PASSWORD,
        ssl: false
    });

    try {
        await client.connect();
        console.log('Connected to', PG_DB, 'at', PG_HOST);

        let sql = fs.readFileSync(MIGRATION_FILE, 'utf8');

        // Remove psql-only commands (\echo, etc.)
        sql = sql.split('\n')
            .filter(line => !line.trim().startsWith('\\'))
            .join('\n');

        // Execute the entire migration as one transaction
        console.log('Executing Phase 2 migration...');
        await client.query('BEGIN');
        try {
            await client.query(sql);
            await client.query('COMMIT');
            console.log('Migration executed successfully!');
        } catch (e) {
            await client.query('ROLLBACK');
            // If it fails as a whole, try statement by statement
            console.log('Batch execution failed:', e.message.substring(0, 80));
            console.log('Retrying individual statements...');
            
            // Smarter splitting: handle $$ blocks
            const stmts = [];
            let current = '';
            let inDollarQuote = false;
            
            for (const line of sql.split('\n')) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('--')) {
                    current += line + '\n';
                    continue;
                }
                
                // Track $$ blocks
                const dollarMatches = (line.match(/\$\$/g) || []).length;
                if (dollarMatches % 2 === 1) {
                    inDollarQuote = !inDollarQuote;
                }
                
                current += line + '\n';
                
                if (!inDollarQuote && trimmed.endsWith(';')) {
                    const cleaned = current.trim();
                    if (cleaned && !cleaned.startsWith('--')) {
                        stmts.push(cleaned);
                    }
                    current = '';
                }
            }
            if (current.trim()) stmts.push(current.trim());
            
            let success = 0;
            let skipped = 0;
            
            for (const stmt of stmts) {
                try {
                    await client.query(stmt);
                    const preview = stmt.replace(/\s+/g, ' ').substring(0, 70);
                    console.log('  OK:', preview + '...');
                    success++;
                } catch (err) {
                    if (err.message.includes('already exists') || err.message.includes('duplicate')) {
                        console.log('  SKIP:', err.message.substring(0, 60));
                    } else {
                        console.log('  WARN:', err.message.substring(0, 80));
                    }
                    skipped++;
                }
            }
            
            console.log('\nExecution summary: ' + success + ' succeeded, ' + skipped + ' skipped');
        }

        // Verify Phase 2 tables exist
        const result = await client.query(
            "SELECT table_name FROM information_schema.tables " +
            "WHERE table_schema = 'public' " +
            "AND table_name IN ('device_tokens', 'biometric_credentials', 'refresh_tokens', " +
            "'push_subscriptions', 'notification_preferences', 'user_api_connections', " +
            "'api_connection_audit', 'sync_queue', 'user_settings') " +
            "ORDER BY table_name"
        );

        console.log('\nPhase 2 tables found:', result.rows.length, '/ 9');
        result.rows.forEach(r => console.log('  ✓', r.table_name));

        if (result.rows.length < 9) {
            const found = result.rows.map(r => r.table_name);
            const expected = ['device_tokens', 'biometric_credentials', 'refresh_tokens',
                'push_subscriptions', 'notification_preferences', 'user_api_connections',
                'api_connection_audit', 'sync_queue', 'user_settings'];
            const missing = expected.filter(t => !found.includes(t));
            if (missing.length > 0) {
                console.log('  Missing:', missing.join(', '));
            }
        }

        // Count rows in Phase 2 tables
        const tables = ['device_tokens', 'push_subscriptions', 'user_api_connections', 
                       'user_settings', 'notification_preferences'];
        console.log('\nSeed data counts:');
        for (const table of tables) {
            try {
                const countResult = await client.query('SELECT COUNT(*) as cnt FROM ' + table);
                console.log('  ' + table + ':', countResult.rows[0].cnt, 'rows');
            } catch (e) {
                console.log('  ' + table + ': (table not found)');
            }
        }

    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    } finally {
        await client.end();
        console.log('\nDone.');
    }
}

main();
