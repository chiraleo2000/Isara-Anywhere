/**
 * ═══════════════════════════════════════════════════════════════════════
 * IZARA TELEMEDICINE — MOBILE LOCAL DATABASE SCHEMA
 * ═══════════════════════════════════════════════════════════════════════
 * SQLite schema for offline-first mobile app.
 * All user data is cached locally for instant access, then synced
 * with the cloud PostgreSQL database.
 * 
 * Architecture: SQLite (expo-sqlite) → SyncEngine → PostgreSQL (cloud)
 * ═══════════════════════════════════════════════════════════════════════
 */

// ─── Table Definitions ───

/**
 * SQL statements to create the local SQLite database.
 * These mirror the cloud PostgreSQL schema but with SQLite-compatible types.
 */
export const CREATE_TABLES_SQL = `
  -- User profile (cached from cloud)
  CREATE TABLE IF NOT EXISTS user_profile (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'patient',
    date_of_birth TEXT,
    gender TEXT,
    blood_type TEXT,
    national_id TEXT,
    synced_at TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
  );

  -- Appointments (bidirectional sync)
  CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    doctor_id TEXT NOT NULL,
    doctor_name TEXT,
    specialty TEXT,
    appointment_date TEXT NOT NULL,
    appointment_time TEXT NOT NULL,
    type TEXT DEFAULT 'video',
    status TEXT DEFAULT 'pending',
    notes TEXT,
    meet_link TEXT,
    location TEXT,
    synced_at TEXT,
    updated_at TEXT DEFAULT (datetime('now')),
    version INTEGER DEFAULT 1
  );

  -- Vital signs (bidirectional sync)
  CREATE TABLE IF NOT EXISTS vital_signs (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    type TEXT NOT NULL,
    value TEXT NOT NULL,
    unit TEXT NOT NULL,
    recorded_at TEXT NOT NULL,
    notes TEXT,
    synced_at TEXT,
    updated_at TEXT DEFAULT (datetime('now')),
    version INTEGER DEFAULT 1
  );

  -- Medications (read from cloud, mark-taken locally)
  CREATE TABLE IF NOT EXISTS medications (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    name TEXT NOT NULL,
    dosage TEXT,
    frequency TEXT,
    start_date TEXT,
    end_date TEXT,
    status TEXT DEFAULT 'active',
    prescribed_by TEXT,
    notes TEXT,
    synced_at TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
  );

  -- Medication reminders & taken logs (local + sync)
  CREATE TABLE IF NOT EXISTS medication_logs (
    id TEXT PRIMARY KEY,
    medication_id TEXT NOT NULL,
    scheduled_time TEXT NOT NULL,
    taken_at TEXT,
    skipped INTEGER DEFAULT 0,
    skip_reason TEXT,
    synced_at TEXT,
    FOREIGN KEY (medication_id) REFERENCES medications(id)
  );

  -- PHR summary (cached from cloud)
  CREATE TABLE IF NOT EXISTS phr_cache (
    patient_id TEXT PRIMARY KEY,
    data_json TEXT NOT NULL,
    synced_at TEXT NOT NULL,
    version INTEGER DEFAULT 1
  );

  -- Notifications (downloaded from cloud)
  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    body TEXT,
    type TEXT,
    is_read INTEGER DEFAULT 0,
    data_json TEXT,
    created_at TEXT NOT NULL,
    synced_at TEXT
  );

  -- Offline sync queue (outbound changes)
  CREATE TABLE IF NOT EXISTS sync_queue (
    id TEXT PRIMARY KEY,
    entity TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
    payload_json TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'syncing', 'synced', 'conflict', 'failed')),
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    error_message TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    last_attempt TEXT
  );

  -- Sync metadata (tracks last sync per entity)
  CREATE TABLE IF NOT EXISTS sync_metadata (
    entity TEXT PRIMARY KEY,
    last_synced_at TEXT,
    last_server_version INTEGER DEFAULT 0,
    sync_count INTEGER DEFAULT 0
  );

  -- Indexes for common queries
  CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
  CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
  CREATE INDEX IF NOT EXISTS idx_vital_signs_date ON vital_signs(recorded_at);
  CREATE INDEX IF NOT EXISTS idx_medications_status ON medications(status);
  CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
  CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
`;

// ─── Entity Names ───

export const SYNC_ENTITIES = [
  'appointments',
  'vital_signs',
  'medications',
  'medication_logs',
  'phr_cache',
  'notifications',
] as const;

export type SyncEntity = (typeof SYNC_ENTITIES)[number];

// ─── Sync Queue Item Type ───

export interface SyncQueueItem {
  id: string;
  entity: SyncEntity;
  entity_id: string;
  operation: 'create' | 'update' | 'delete';
  payload_json: string;
  status: 'pending' | 'syncing' | 'synced' | 'conflict' | 'failed';
  retry_count: number;
  max_retries: number;
  error_message?: string;
  created_at: string;
  last_attempt?: string;
}

// ─── Sync Metadata Type ───

export interface SyncMetadata {
  entity: SyncEntity;
  last_synced_at: string | null;
  last_server_version: number;
  sync_count: number;
}
