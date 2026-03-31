/**
 * ═══════════════════════════════════════════════════════════════════════
 * IZARA TELEMEDICINE — MOBILE LOCAL DATABASE CLIENT
 * ═══════════════════════════════════════════════════════════════════════
 * Wraps expo-sqlite for typed, async operations.
 * Initializes the local SQLite database with the schema on first access.
 * 
 * Usage:
 *   import { localDb } from '@izara/shared/db/localDb';
 *   await localDb.initialize();
 *   const rows = await localDb.query('SELECT * FROM appointments');
 * ═══════════════════════════════════════════════════════════════════════
 */
import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES_SQL } from './schema';

const DB_NAME = 'izara_local.db';

class LocalDatabase {
  private db: SQLite.SQLiteDatabase | null = null;
  private initialized = false;

  /**
   * Open the database and create tables if needed.
   * Safe to call multiple times — only initializes once.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    this.db = await SQLite.openDatabaseAsync(DB_NAME);

    // Create all tables
    await this.db.execAsync(CREATE_TABLES_SQL);

    // Initialize sync metadata for all entities
    await this.db.execAsync(`
      INSERT OR IGNORE INTO sync_metadata (entity, last_synced_at, last_server_version, sync_count)
      VALUES
        ('appointments', NULL, 0, 0),
        ('vital_signs', NULL, 0, 0),
        ('medications', NULL, 0, 0),
        ('medication_logs', NULL, 0, 0),
        ('phr_cache', NULL, 0, 0),
        ('notifications', NULL, 0, 0);
    `);

    this.initialized = true;
    console.log('[LocalDB] Database initialized successfully');
  }

  /**
   * Execute a read query, returning all rows.
   */
  async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    this.ensureOpen();
    return this.db!.getAllAsync<T>(sql, params);
  }

  /**
   * Execute a read query, returning first row only.
   */
  async queryFirst<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T | null> {
    this.ensureOpen();
    return this.db!.getFirstAsync<T>(sql, params);
  }

  /**
   * Execute a write statement (INSERT, UPDATE, DELETE).
   */
  async execute(sql: string, params: unknown[] = []): Promise<SQLite.SQLiteRunResult> {
    this.ensureOpen();
    return this.db!.runAsync(sql, params);
  }

  /**
   * Execute multiple statements in a transaction.
   * Rolls back on error.
   */
  async transaction(fn: (db: SQLite.SQLiteDatabase) => Promise<void>): Promise<void> {
    this.ensureOpen();
    await this.db!.withTransactionAsync(async () => {
      await fn(this.db!);
    });
  }

  /**
   * Upsert a record (INSERT OR REPLACE).
   */
  async upsert(table: string, record: Record<string, unknown>): Promise<void> {
    const keys = Object.keys(record);
    const placeholders = keys.map(() => '?').join(', ');
    const values = Object.values(record);

    await this.execute(
      `INSERT OR REPLACE INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`,
      values,
    );
  }

  /**
   * Delete a record by ID.
   */
  async deleteById(table: string, id: string): Promise<void> {
    await this.execute(`DELETE FROM ${table} WHERE id = ?`, [id]);
  }

  /**
   * Count records in table with optional WHERE.
   */
  async count(table: string, where?: string, params?: unknown[]): Promise<number> {
    const sql = where ? `SELECT COUNT(*) as count FROM ${table} WHERE ${where}` : `SELECT COUNT(*) as count FROM ${table}`;
    const result = await this.queryFirst<{ count: number }>(sql, params || []);
    return result?.count ?? 0;
  }

  /**
   * Clear all data (for logout).
   */
  async clearAll(): Promise<void> {
    this.ensureOpen();
    const tables = [
      'sync_queue', 'medication_logs', 'medications',
      'vital_signs', 'appointments', 'notifications',
      'phr_cache', 'user_profile', 'sync_metadata',
    ];
    for (const table of tables) {
      await this.execute(`DELETE FROM ${table}`);
    }
    console.log('[LocalDB] All data cleared');
  }

  /**
   * Close the database connection.
   */
  async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
      this.initialized = false;
    }
  }

  private ensureOpen(): void {
    if (!this.db || !this.initialized) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
  }
}

/** Singleton database instance */
export const localDb = new LocalDatabase();
