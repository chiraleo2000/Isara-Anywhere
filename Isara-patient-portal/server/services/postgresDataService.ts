/**
 * PostgreSQL Data Service for Patient Portal
 * Replaces GCS bucket access with PostgreSQL queries
 * Phase 1: Full PostgreSQL migration for local development
 * 
 * @module postgresDataService
 * @version 1.0.0
 */

import pg from 'pg';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

const { Pool } = pg;

// Database Configuration - parse DATABASE_URL if available
const isDevelopment = process.env.NODE_ENV !== 'production';
const usePostgres = process.env.USE_POSTGRESQL === 'true' || process.env.VITE_USE_POSTGRESQL === 'true' || isDevelopment;

// Parse DATABASE_URL if available
interface DbConfig {
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
}

let dbConfig: DbConfig = {};
if (process.env.DATABASE_URL) {
  try {
    const url = new URL(process.env.DATABASE_URL);
    dbConfig = {
      host: url.hostname,
      port: Number.parseInt(url.port || '5432', 10),
      database: url.pathname.substring(1), // Remove leading '/'
      user: url.username,
      password: decodeURIComponent(url.password),
    };
    console.log(`📦 Using DATABASE_URL: ${url.hostname}:${url.port}/${url.pathname.substring(1)}`);
  } catch (e) {
    console.warn('⚠️ Failed to parse DATABASE_URL:', (e as Error).message);
  }
}

// PostgreSQL Docker service configuration (NO Cloud SQL)
const dbHost = dbConfig.host || process.env.DB_HOST || 'localhost';

// Build pool configuration
interface PoolConfig {
  database: string;
  user: string;
  password: string;
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
  host: string;
  port: number;
  ssl?: { rejectUnauthorized: boolean } | boolean;
}

const isProduction = process.env.NODE_ENV === 'production';
// Use DB_SSL env var to control SSL - default to false for Docker deployments
// Cloud SQL uses SSL but local Docker doesn't
const useSSL = process.env.DB_SSL === 'true' || process.env.DB_SSL === '1';

const poolConfig: PoolConfig = {
  database: dbConfig.database || process.env.DB_NAME || 'izara_phase1',
  user: dbConfig.user || process.env.DB_USER || 'postgres',
  password: dbConfig.password || process.env.DB_PASSWORD || '',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: isProduction ? 30000 : 5000, // 30s for Cloud SQL, 5s for local
  host: dbHost,
  port: dbConfig.port || Number.parseInt(process.env.DB_PORT || '5433', 10),
  ssl: useSSL ? { rejectUnauthorized: false } : false, // SSL only when explicitly enabled
};

console.log(`🔌 Using PostgreSQL TCP connection: ${dbHost}:${poolConfig.port}`);

const pool = new Pool(poolConfig);

// ========== CRITICAL: Pool error handler to prevent crashes ==========
let dbAvailable = true;
pool.on('error', (err: Error) => {
  console.error('❌ [Pool] Unexpected PostgreSQL error:', err.message);
  dbAvailable = false;
  // Attempt reconnection after 5 seconds
  setTimeout(async () => {
    try {
      await pool.query('SELECT 1');
      dbAvailable = true;
      console.log('✅ [Pool] Database reconnected');
    } catch (error_) {
      console.error('❌ [Pool] Reconnection failed:', (error_ as Error).message);
    }
  }, 5000);
});

// Run migrations to ensure schema is up-to-date
async function runMigrations() {
  try {
    // Add missing columns to phr table (for registration)
    await pool.query(`
      DO $$ 
      BEGIN
        -- Add columns if they don't exist
        ALTER TABLE phr ADD COLUMN IF NOT EXISTS blood_type VARCHAR(10);
        ALTER TABLE phr ADD COLUMN IF NOT EXISTS height_cm DECIMAL(5,1);
        ALTER TABLE phr ADD COLUMN IF NOT EXISTS weight_kg DECIMAL(5,1);
        ALTER TABLE phr ADD COLUMN IF NOT EXISTS bmi DECIMAL(4,1);
        ALTER TABLE phr ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(255);
        ALTER TABLE phr ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(50);
        ALTER TABLE phr ADD COLUMN IF NOT EXISTS emergency_contact_relation VARCHAR(100);
        ALTER TABLE phr ADD COLUMN IF NOT EXISTS vital_signs_history JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE phr ADD COLUMN IF NOT EXISTS vaccinations JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE phr ADD COLUMN IF NOT EXISTS family_history JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE phr ADD COLUMN IF NOT EXISTS surgical_history JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE phr ADD COLUMN IF NOT EXISTS social_history JSONB;
        ALTER TABLE phr ADD COLUMN IF NOT EXISTS latest_lab_results JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE phr ADD COLUMN IF NOT EXISTS clinical_decision_support JSONB;
        ALTER TABLE phr ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP;
      EXCEPTION WHEN OTHERS THEN
        -- Table might not exist yet, that's OK
        NULL;
      END $$;
    `);

    // ========================================================================
    // Phase 2 Migrations - Mobile App Support
    // ========================================================================

    // Device tokens for push notifications
    await pool.query(`
      CREATE TABLE IF NOT EXISTS device_tokens (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        device_token TEXT NOT NULL,
        platform VARCHAR(20) NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
        device_name VARCHAR(255),
        device_model VARCHAR(255),
        os_version VARCHAR(50),
        app_version VARCHAR(50),
        is_active BOOLEAN DEFAULT true,
        last_used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Biometric credentials
    await pool.query(`
      CREATE TABLE IF NOT EXISTS biometric_credentials (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        credential_type VARCHAR(20) NOT NULL CHECK (credential_type IN ('fingerprint', 'face_id', 'iris')),
        public_key TEXT NOT NULL,
        credential_id TEXT NOT NULL,
        device_id VARCHAR(255) NOT NULL,
        device_name VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        last_used_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Refresh tokens for token rotation
    await pool.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(255) NOT NULL,
        device_id VARCHAR(255),
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        is_revoked BOOLEAN DEFAULT false,
        revoked_at TIMESTAMP WITH TIME ZONE,
        replaced_by VARCHAR(50),
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Push notification subscriptions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        appointment_reminders BOOLEAN DEFAULT true,
        medication_reminders BOOLEAN DEFAULT true,
        health_tips BOOLEAN DEFAULT true,
        lab_results BOOLEAN DEFAULT true,
        doctor_messages BOOLEAN DEFAULT true,
        system_updates BOOLEAN DEFAULT true,
        quiet_hours_start TIME,
        quiet_hours_end TIME,
        language_preference VARCHAR(10) DEFAULT 'th',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Multi-API connections
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_api_connections (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        service_type VARCHAR(50) NOT NULL,
        service_url TEXT,
        access_token_encrypted TEXT,
        refresh_token_encrypted TEXT,
        token_expires_at TIMESTAMP WITH TIME ZONE,
        connection_status VARCHAR(20) DEFAULT 'active',
        last_sync_at TIMESTAMP WITH TIME ZONE,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // API connection audit log
    await pool.query(`
      CREATE TABLE IF NOT EXISTS api_connection_audit (
        id VARCHAR(50) PRIMARY KEY,
        connection_id VARCHAR(50),
        user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        action VARCHAR(50) NOT NULL,
        service_type VARCHAR(50) NOT NULL,
        details JSONB DEFAULT '{}'::jsonb,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Offline sync queue
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        entity_type VARCHAR(50) NOT NULL,
        entity_id VARCHAR(50) NOT NULL,
        operation VARCHAR(20) NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
        payload JSONB NOT NULL,
        client_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
        server_timestamp TIMESTAMP WITH TIME ZONE,
        sync_status VARCHAR(20) DEFAULT 'pending',
        conflict_resolution JSONB,
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 5,
        error_message TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Notification preferences
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notification_preferences (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        channel VARCHAR(20) NOT NULL CHECK (channel IN ('push', 'email', 'sms', 'in_app', 'line')),
        category VARCHAR(50) NOT NULL,
        enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // User settings (mobile + web)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_settings (
        user_id VARCHAR(50) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        theme VARCHAR(20) DEFAULT 'system',
        language VARCHAR(10) DEFAULT 'th',
        font_size VARCHAR(10) DEFAULT 'medium',
        biometric_enabled BOOLEAN DEFAULT false,
        auto_sync BOOLEAN DEFAULT true,
        sync_on_wifi_only BOOLEAN DEFAULT false,
        data_saver_mode BOOLEAN DEFAULT false,
        accessibility_high_contrast BOOLEAN DEFAULT false,
        accessibility_screen_reader BOOLEAN DEFAULT false,
        last_active_role VARCHAR(20) DEFAULT 'patient',
        onboarding_completed BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Database migrations completed (Phase 1 + Phase 2)');

    // ========================================================================
    // Phase 2 Indexes — ensure efficient queries
    // ========================================================================
    try {
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_device_tokens_user ON device_tokens(user_id);
        CREATE INDEX IF NOT EXISTS idx_device_tokens_active ON device_tokens(user_id, is_active);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_device_tokens_unique ON device_tokens(user_id, device_token);
        CREATE INDEX IF NOT EXISTS idx_biometric_user ON biometric_credentials(user_id);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_biometric_unique ON biometric_credentials(user_id, device_id);
        CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
        CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);
        CREATE INDEX IF NOT EXISTS idx_sync_queue_user_status ON sync_queue(user_id, sync_status);
        CREATE INDEX IF NOT EXISTS idx_notification_prefs_user ON notification_preferences(user_id);
        CREATE INDEX IF NOT EXISTS idx_api_connections_user ON user_api_connections(user_id);
      `);
      console.log('✅ Phase 2 indexes created');
    } catch (error_) {
      console.warn('⚠️ Index creation warning:', (error_ as Error).message);
    }
  } catch (err) {
    console.warn('⚠️ Migration warning:', (err as Error).message);
  }
}

// Test connection on init
try {
  await pool.query('SELECT NOW()');
  console.log('✅ PostgreSQL connected successfully');
  await runMigrations();
} catch (err) {
  console.error('❌ PostgreSQL connection error:', (err as Error).message);
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface User {
  id: string;
  email: string;
  password_hash?: string;
  role: 'patient' | 'doctor' | 'admin';
  name: string;
  name_thai?: string;
  avatar_url?: string;
  phone?: string;
  date_of_birth?: Date;
  gender?: string;
  national_id?: string;
  doctor_id?: string;
  medical_license_number?: string;
  specialty?: string;
  hospital_name?: string;
  patient_id?: string;
  is_active: boolean;
  is_verified: boolean;
  is_approved: boolean;
  approval_status: string;
  admin_privileges?: Record<string, boolean>;
  is_admin: boolean;
  preferences?: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
  last_login?: Date;
}

export interface Session {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  created_at: Date;
  ip_address?: string;
  user_agent?: string;
}

export interface PHR {
  id: string;
  patient_id: string;
  allergies: Array<{
    allergen: string;
    allergen_thai?: string;
    type: string;
    reaction: string;
    severity: string;
  }>;
  chronic_conditions: Array<{
    condition: string;
    condition_thai?: string;
    icd_code?: string;
    diagnosed_date: string;
    status: string;
  }>;
  medications: Array<{
    name: string;
    name_thai?: string;
    dosage: string;
    frequency: string;
    route: string;
  }>;
  lifestyle: Record<string, any>;
  demographics: Record<string, any>;
  emergency_contacts: Array<{
    name: string;
    phone: string;
    relationship: string;
  }>;
  created_at: Date;
  updated_at: Date;
}

export interface VitalSigns {
  id: string;
  patient_id: string;
  measured_at: Date;
  recorded_at?: Date; // alias for measured_at
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  heart_rate?: number;
  temperature?: number;
  weight?: number;
  height?: number;
  oxygen_saturation?: number;
  blood_glucose?: number;
  blood_glucose_type?: string;
  blood_glucose_timing?: string; // alias for blood_glucose_type
  notes?: string;
  bmi?: number;
  source?: string;
}

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  scheduled_date: Date;
  scheduled_time: string;
  duration_minutes: number;
  type: 'telemedicine' | 'in_person' | 'follow_up';
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  reason: string;
  symptoms?: string[];
  chief_complaint?: string;
  meeting_link?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// AUTHENTICATION SERVICE
// ============================================================================

export const AuthService = {
  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );
    return result.rows[0] || null;
  },

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Verify password
   */
  async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  },

  /**
   * Hash password
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  },

  /**
   * Create session
   */
  async createSession(userId: string, ipAddress?: string, userAgent?: string): Promise<Session> {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const result = await pool.query(
      `INSERT INTO sessions (id, user_id, token, expires_at, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [crypto.randomUUID(), userId, token, expiresAt, ipAddress, userAgent]
    );

    // Update last login
    await pool.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [userId]
    );

    return result.rows[0];
  },

  /**
   * Validate session
   */
  async validateSession(token: string): Promise<{ user: User; session: Session } | null> {
    const result = await pool.query(
      `SELECT s.*, u.*
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.token = $1 AND s.expires_at > NOW()`,
      [token]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    const session: Session = {
      id: row.id,
      user_id: row.user_id,
      token: row.token,
      expires_at: row.expires_at,
      created_at: row.created_at,
      ip_address: row.ip_address,
      user_agent: row.user_agent,
    };

    const user: User = {
      id: row.user_id,
      email: row.email,
      role: row.role,
      name: row.name,
      name_thai: row.name_thai,
      avatar_url: row.avatar_url,
      phone: row.phone,
      date_of_birth: row.date_of_birth,
      gender: row.gender,
      national_id: row.national_id,
      doctor_id: row.doctor_id,
      patient_id: row.patient_id,
      is_active: row.is_active,
      is_verified: row.is_verified,
      is_approved: row.is_approved,
      approval_status: row.approval_status,
      admin_privileges: row.admin_privileges,
      is_admin: row.is_admin,
      preferences: row.preferences,
      created_at: row.created_at,
      updated_at: row.updated_at,
      last_login: row.last_login,
    };

    return { user, session };
  },

  /**
   * Invalidate session (logout)
   */
  async invalidateSession(token: string): Promise<void> {
    await pool.query('DELETE FROM sessions WHERE token = $1', [token]);
  },

  /**
   * Register new patient
   */
  async registerPatient(data: {
    email: string;
    password: string;
    name: string;
    nameThai?: string;
    phone?: string;
  }): Promise<User> {
    const hashedPassword = await this.hashPassword(data.password);
    const patientId = `PATIENT-${Date.now()}`;
    const userId = patientId;

    const result = await pool.query(
      `INSERT INTO users (
        id, email, password_hash, role, name, name_thai, phone,
        patient_id, is_active, is_verified, is_approved, approval_status
      )
       VALUES ($1, $2, $3, 'patient', $4, $5, $6, $7, true, true, true, 'approved')
       RETURNING *`,
      [userId, data.email, hashedPassword, data.name, data.nameThai, data.phone, patientId]
    );

    return result.rows[0];
  },
};

// ============================================================================
// PHR SERVICE
// ============================================================================

export const PHRService = {
  /**
   * Get patient PHR
   */
  async getPHR(patientId: string): Promise<PHR | null> {
    const result = await pool.query(
      'SELECT * FROM phr WHERE patient_id = $1',
      [patientId]
    );
    return result.rows[0] || null;
  },

  /**
   * Create or update PHR
   */
  async upsertPHR(patientId: string, data: Partial<PHR>): Promise<PHR> {
    const existing = await this.getPHR(patientId);

    if (existing) {
      const result = await pool.query(
        `UPDATE phr SET
          allergies = COALESCE($2::jsonb, allergies),
          chronic_conditions = COALESCE($3::jsonb, chronic_conditions),
          medications = COALESCE($4::jsonb, medications),
          lifestyle = COALESCE($5::jsonb, lifestyle),
          demographics = COALESCE($6::jsonb, demographics),
          updated_at = NOW()
         WHERE patient_id = $1
         RETURNING *`,
        [
          patientId,
          data.allergies === undefined ? null : JSON.stringify(data.allergies),
          data.chronic_conditions === undefined ? null : JSON.stringify(data.chronic_conditions),
          data.medications === undefined ? null : JSON.stringify(data.medications),
          data.lifestyle === undefined ? null : JSON.stringify(data.lifestyle),
          data.demographics === undefined ? null : JSON.stringify(data.demographics)
        ]
      );
      return result.rows[0];
    } else {
      try {
        const result = await pool.query(
          `INSERT INTO phr (id, patient_id, allergies, chronic_conditions, medications, lifestyle, demographics)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [
            `phr_${patientId}`,
            patientId,
            JSON.stringify(data.allergies || []),
            JSON.stringify(data.chronic_conditions || []),
            JSON.stringify(data.medications || []),
            JSON.stringify(data.lifestyle || {}),
            JSON.stringify(data.demographics || {})
          ]
        );
        return result.rows[0];
      } catch (insertError: any) {
        // FK constraint violation — patient may not exist in users table, return in-memory PHR
        console.warn('[PHR] Insert failed (FK constraint?), returning in-memory PHR:', insertError.message);
        return {
          id: `phr_${patientId}`,
          patient_id: patientId,
          allergies: data.allergies || [],
          chronic_conditions: data.chronic_conditions || [],
          medications: data.medications || [],
          lifestyle: data.lifestyle || {},
          demographics: data.demographics || {},
          created_at: new Date(),
          updated_at: new Date(),
        } as any;
      }
    }
  },

  /**
   * Get vital signs history
   */
  async getVitalSigns(patientId: string, limit: number = 50): Promise<VitalSigns[]> {
    const result = await pool.query(
      `SELECT *, measured_at as recorded_at FROM vital_signs 
       WHERE patient_id = $1 
       ORDER BY measured_at DESC 
       LIMIT $2`,
      [patientId, limit]
    );
    return result.rows;
  },

  /**
   * Add vital signs record
   */
  async addVitalSigns(patientId: string, data: Partial<VitalSigns>): Promise<VitalSigns> {
    // Calculate BMI if height and weight are provided
    let bmi: number | null = null;
    if (data.weight && data.height && data.height > 0) {
      const heightInMeters = Number(data.height) / 100;
      bmi = Number((Number(data.weight) / (heightInMeters * heightInMeters)).toFixed(1));
    }

    const result = await pool.query(
      `INSERT INTO vital_signs (
        patient_id, blood_pressure_systolic, blood_pressure_diastolic,
        heart_rate, temperature, weight, height, oxygen_saturation,
        blood_glucose, blood_glucose_type, notes, measured_at, bmi, source
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, COALESCE($12::timestamp, NOW()), $13, 'patient_input')
       RETURNING *`,
      [
        patientId,
        data.blood_pressure_systolic || null,
        data.blood_pressure_diastolic || null,
        data.heart_rate || null,
        data.temperature || null,
        data.weight || null,
        data.height || null,
        data.oxygen_saturation || null,
        data.blood_glucose || null,
        data.blood_glucose_type || data.blood_glucose_timing || null,
        data.notes || null,
        data.measured_at || data.recorded_at || null,
        bmi
      ]
    );
    return result.rows[0];
  },
};

// ============================================================================
// APPOINTMENT SERVICE
// ============================================================================

export const AppointmentService = {
  /**
   * Get patient appointments
   */
  async getPatientAppointments(patientId: string, status?: string): Promise<Appointment[]> {
    let query = `
      SELECT a.*, 
             u.name as doctor_name, u.name_thai as doctor_name_thai, u.avatar_url as doctor_avatar,
             dp.specialty, dp.hospital_name
      FROM appointments a
      JOIN users u ON a.doctor_id = u.id
      LEFT JOIN doctor_profiles dp ON dp.doctor_id = u.id
      WHERE a.patient_id = $1
    `;
    const params: (string | undefined)[] = [patientId];

    if (status) {
      query += ' AND a.status = $2';
      params.push(status);
    }

    query += ' ORDER BY COALESCE(a.confirmed_date, a.requested_date) DESC, COALESCE(a.confirmed_time, a.requested_time) DESC';

    const result = await pool.query(query, params);
    return result.rows;
  },

  /**
   * Get doctor appointments
   */
  async getDoctorAppointments(doctorId: string, date?: string): Promise<Appointment[]> {
    let query = `
      SELECT a.*, 
             u.name as patient_name, u.name_thai as patient_name_thai,
             pp.phone as patient_phone
      FROM appointments a
      JOIN users u ON a.patient_id = u.id
      LEFT JOIN patient_profiles pp ON pp.patient_id = u.id
      WHERE a.doctor_id = $1
    `;
    const params: (string | undefined)[] = [doctorId];

    if (date) {
      query += ' AND DATE(a.scheduled_date) = $2';
      params.push(date);
    }

    query += ' ORDER BY a.scheduled_date ASC, a.scheduled_time ASC';

    const result = await pool.query(query, params);
    return result.rows;
  },

  /**
   * Create appointment
   */
  async createAppointment(data: Partial<Appointment>): Promise<Appointment> {
    const result = await pool.query(
      `INSERT INTO appointments (
        id, patient_id, doctor_id, scheduled_date, scheduled_time,
        duration_minutes, type, status, reason, symptoms, chief_complaint, notes
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        `APT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        data.patient_id,
        data.doctor_id,
        data.scheduled_date,
        data.scheduled_time,
        data.duration_minutes || 30,
        data.type || 'telemedicine',
        data.status || 'pending',
        data.reason,
        JSON.stringify(data.symptoms || []),
        data.chief_complaint,
        data.notes
      ]
    );
    return result.rows[0];
  },

  /**
   * Update appointment status
   */
  async updateAppointmentStatus(appointmentId: string, status: string, meetingLink?: string): Promise<Appointment> {
    const result = await pool.query(
      `UPDATE appointments 
       SET status = $2, meeting_link = COALESCE($3, meeting_link), updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [appointmentId, status, meetingLink]
    );
    return result.rows[0];
  },

  /**
   * Get appointment by ID
   */
  async getAppointmentById(appointmentId: string): Promise<Appointment | null> {
    const result = await pool.query(
      `SELECT a.*, 
              u1.name as patient_name, u1.name_thai as patient_name_thai,
              u2.name as doctor_name, u2.name_thai as doctor_name_thai
       FROM appointments a
       JOIN users u1 ON a.patient_id = u1.id
       JOIN users u2 ON a.doctor_id = u2.id
       WHERE a.id = $1`,
      [appointmentId]
    );
    return result.rows[0] || null;
  },
};

// ============================================================================
// DOCTOR SERVICE
// ============================================================================

export const DoctorService = {
  /**
   * Get all available doctors
   */
  async getAvailableDoctors(): Promise<User[]> {
    const result = await pool.query(
      `SELECT u.*, dp.*
       FROM users u
       LEFT JOIN doctor_profiles dp ON dp.doctor_id = u.id
       WHERE u.role = 'doctor' 
         AND u.is_active = true 
         AND u.is_approved = true
       ORDER BY u.name`
    );
    return result.rows;
  },

  /**
   * Get doctor by ID
   */
  async getDoctorById(doctorId: string): Promise<User | null> {
    const result = await pool.query(
      `SELECT u.*, dp.*
       FROM users u
       LEFT JOIN doctor_profiles dp ON dp.doctor_id = u.id
       WHERE u.id = $1 AND u.role IN ('doctor', 'admin')`,
      [doctorId]
    );
    return result.rows[0] || null;
  },

  /**
   * Get doctors by specialty
   */
  async getDoctorsBySpecialty(specialty: string): Promise<User[]> {
    const result = await pool.query(
      `SELECT u.*, dp.*
       FROM users u
       LEFT JOIN doctor_profiles dp ON dp.doctor_id = u.id
       WHERE u.role = 'doctor' 
         AND u.is_active = true
         AND dp.specialty ILIKE $1
       ORDER BY u.name`,
      [`%${specialty}%`]
    );
    return result.rows;
  },
};

// ============================================================================
// MEDICAL CONTENT SERVICE
// ============================================================================

export const ContentService = {
  /**
   * Get published medical content
   */
  async getPublishedContent(category?: string, limit: number = 50): Promise<unknown[]> {
    let query = `
      SELECT mc.*, u.name as author_name
      FROM medical_content mc
      LEFT JOIN users u ON mc.author_id = u.id
      WHERE mc.status = 'published'
    `;
    const params: (string | number)[] = [];

    if (category) {
      query += ' AND mc.category = $1';
      params.push(category);
    }

    query += ` ORDER BY mc.published_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);
    return result.rows;
  },

  /**
   * Get content by ID
   */
  async getContentById(contentId: string): Promise<unknown> {
    const result = await pool.query(
      `SELECT mc.*, u.name as author_name
       FROM medical_content mc
       LEFT JOIN users u ON mc.author_id = u.id
       WHERE mc.id = $1`,
      [contentId]
    );
    return result.rows[0] || null;
  },

  /**
   * Get clinical resources
   */
  async getClinicalResources(category?: string): Promise<unknown[]> {
    let query = 'SELECT * FROM clinical_resources WHERE status = $1';
    const params: string[] = ['published'];

    if (category) {
      query += ' AND category = $2';
      params.push(category);
    }

    query += ' ORDER BY updated_at DESC';

    const result = await pool.query(query, params);
    return result.rows;
  },
};

// ============================================================================
// LIVING WILL SERVICE
// ============================================================================

export const LivingWillService = {
  /**
   * Get living will by patient ID
   */
  async getLivingWill(patientId: string): Promise<unknown> {
    const result = await pool.query(
      'SELECT * FROM living_wills WHERE patient_id = $1 AND status = $2',
      [patientId, 'active']
    );
    return result.rows[0] || null;
  },

  /**
   * Create or update living will
   */
  async upsertLivingWill(patientId: string, data: Record<string, unknown>): Promise<unknown> {
    const existing = await this.getLivingWill(patientId);

    if (existing) {
      const result = await pool.query(
        `UPDATE living_wills SET
          statement = COALESCE($2, statement),
          treatments = COALESCE($3, treatments),
          representatives = COALESCE($4, representatives),
          signature = COALESCE($5, signature),
          pdpa_consent = COALESCE($6, pdpa_consent),
          updated_at = NOW()
         WHERE patient_id = $1
         RETURNING *`,
        [
          patientId,
          data.statement,
          JSON.stringify(data.treatments || data.treatment_preferences || data.preferences),
          JSON.stringify(data.representatives || data.healthcareProxy),
          JSON.stringify(data.signature || data.signatures || data.digitalSignature),
          JSON.stringify(data.pdpa_consent || {})
        ]
      );
      return result.rows[0];
    } else {
      const result = await pool.query(
        `INSERT INTO living_wills (
          id, patient_id, statement, treatments, representatives,
          signature, pdpa_consent, status
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
         RETURNING *`,
        [
          `lw_${patientId}`,
          patientId,
          data.statement,
          JSON.stringify(data.treatments || data.treatment_preferences || data.preferences || {}),
          JSON.stringify(data.representatives || data.healthcareProxy || []),
          JSON.stringify(data.signature || data.signatures || data.digitalSignature || {}),
          JSON.stringify(data.pdpa_consent || {})
        ]
      );
      return result.rows[0];
    }
  },
};

// ============================================================================
// NOTIFICATION SERVICE
// ============================================================================

export const NotificationService = {
  /**
   * Get user notifications
   */
  async getUserNotifications(userId: string, unreadOnly: boolean = false): Promise<unknown[]> {
    let query = 'SELECT * FROM notifications WHERE user_id = $1';
    if (unreadOnly) {
      query += ' AND read_at IS NULL';
    }
    query += ' ORDER BY created_at DESC LIMIT 50';

    const result = await pool.query(query, [userId]);
    return result.rows;
  },

  /**
   * Create notification
   */
  async createNotification(data: {
    userId: string;
    type: string;
    title: string;
    titleThai?: string;
    message: string;
    messageThai?: string;
    data?: Record<string, unknown>;
  }): Promise<unknown> {
    const result = await pool.query(
      `INSERT INTO notifications (
        id, user_id, type, title, title_thai, message, message_thai, data
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        crypto.randomUUID(),
        data.userId,
        data.type,
        data.title,
        data.titleThai,
        data.message,
        data.messageThai,
        JSON.stringify(data.data || {})
      ]
    );
    return result.rows[0];
  },

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    await pool.query(
      'UPDATE notifications SET read_at = NOW() WHERE id = $1',
      [notificationId]
    );
  },

  /**
   * Mark all as read
   */
  async markAllAsRead(userId: string): Promise<void> {
    await pool.query(
      'UPDATE notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL',
      [userId]
    );
  },
};

// ============================================================================
// METADATA SERVICE
// ============================================================================

export const MetadataService = {
  /**
   * Get drugs list
   */
  async getDrugs(search?: string): Promise<unknown[]> {
    let query = 'SELECT * FROM drugs';
    const params: string[] = [];

    if (search) {
      query += ' WHERE name ILIKE $1 OR name_thai ILIKE $1 OR generic_name ILIKE $1';
      params.push(`%${search}%`);
    }

    query += ' ORDER BY name LIMIT 100';

    const result = await pool.query(query, params);
    return result.rows;
  },

  /**
   * Get ICD-10 codes
   */
  async getICD10Codes(search?: string): Promise<unknown[]> {
    let query = 'SELECT * FROM icd10_codes';
    const params: string[] = [];

    if (search) {
      query += ' WHERE code ILIKE $1 OR description ILIKE $1 OR description_thai ILIKE $1';
      params.push(`%${search}%`);
    }

    query += ' ORDER BY code LIMIT 100';

    const result = await pool.query(query, params);
    return result.rows;
  },

  /**
   * Get consultants
   */
  async getConsultants(specialty?: string): Promise<unknown[]> {
    let query = 'SELECT * FROM consultants WHERE is_available = true';
    const params: string[] = [];

    if (specialty) {
      query += ' AND specialty ILIKE $1';
      params.push(`%${specialty}%`);
    }

    query += ' ORDER BY name';

    const result = await pool.query(query, params);
    return result.rows;
  },
};

// ============================================================================
// MEETING SERVICE - Video Meeting PostgreSQL Operations
// ============================================================================

export const MeetingService = {
  /**
   * Get meeting by ID
   */
  async getMeetingById(meetingId: string) {
    const result = await pool.query(
      'SELECT * FROM meeting_records WHERE id = $1',
      [meetingId]
    );
    return result.rows[0] || null;
  },

  /**
   * Get active meeting for an appointment (not ended)
   */
  async getActiveMeeting(appointmentId: string) {
    const result = await pool.query(
      `SELECT * FROM meeting_records 
       WHERE appointment_id = $1 AND (status != 'ended' OR status IS NULL)
       ORDER BY created_at DESC LIMIT 1`,
      [appointmentId]
    );
    return result.rows[0] || null;
  },

  /**
   * Create a new meeting
   */
  async createMeeting(data: {
    appointmentId: string;
    doctorId: string;
    doctorName?: string;
    patientId: string;
    patientName?: string;
    roomId: string;
    meetingUrl: string;
    doctorUrl: string;
    patientUrl: string;
    guestUrl?: string;
    config?: Record<string, unknown>;
  }) {
    const meetingId = `meet-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    const result = await pool.query(
      `INSERT INTO meeting_records (
        id, appointment_id, doctor_id, patient_id, room_id,
        meeting_url, doctor_url, patient_url, guest_url,
        status, meeting_config, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'waiting', $10, NOW())
       RETURNING *`,
      [
        meetingId,
        data.appointmentId,
        data.doctorId,
        data.patientId,
        data.roomId,
        data.meetingUrl,
        data.doctorUrl,
        data.patientUrl,
        data.guestUrl || data.meetingUrl,
        JSON.stringify({
          ...data.config,
          doctorName: data.doctorName,
          patientName: data.patientName
        })
      ]
    );

    return result.rows[0];
  },

  /**
   * Start a meeting (update status to active)
   */
  async startMeeting(meetingId: string) {
    const result = await pool.query(
      `UPDATE meeting_records 
       SET status = 'active', started_at = NOW(), updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [meetingId]
    );
    return result.rows[0];
  },

  /**
   * Add participant to meeting
   */
  async addParticipant(meetingId: string, participant: {
    id: string;
    name: string;
    role: 'doctor' | 'patient' | 'guest';
  }) {
    // Get current config
    const current = await pool.query(
      'SELECT meeting_config FROM meeting_records WHERE id = $1',
      [meetingId]
    );

    if (current.rows.length === 0) return null;

    const config = current.rows[0].meeting_config || {};
    const participants = config.participants || [];

    participants.push({
      ...participant,
      joinedAt: new Date().toISOString()
    });

    config.participants = participants;

    const result = await pool.query(
      `UPDATE meeting_records 
       SET meeting_config = $2, status = CASE WHEN status = 'waiting' THEN 'active' ELSE status END, 
           started_at = COALESCE(started_at, NOW()), updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [meetingId, JSON.stringify(config)]
    );

    return result.rows[0];
  },

  /**
   * Save transcript to meeting
   */
  async saveTranscript(meetingId: string, transcript: string | Record<string, unknown>) {
    const transcriptValue = typeof transcript === 'string'
      ? JSON.stringify({ text: transcript, savedAt: new Date().toISOString() })
      : JSON.stringify(transcript);

    const result = await pool.query(
      `UPDATE meeting_records 
       SET transcript = $2, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [meetingId, transcriptValue]
    );
    return result.rows[0];
  },

  /**
   * End meeting with summary and recommendations
   */
  async endMeeting(meetingId: string, data: {
    transcript?: string | Record<string, unknown>;
    summary?: Record<string, unknown>;
    recommendations?: Record<string, unknown>;
    recordingUrl?: string;
    duration?: number;
  }) {
    const updates: string[] = ['status = $2', 'ended_at = NOW()', 'updated_at = NOW()'];
    const params: unknown[] = [meetingId, 'ended'];
    let paramIndex = 3;

    if (data.transcript) {
      updates.push(`transcript = $${paramIndex++}`);
      params.push(typeof data.transcript === 'string'
        ? JSON.stringify({ text: data.transcript })
        : JSON.stringify(data.transcript));
    }

    if (data.summary) {
      updates.push(`ai_summary = $${paramIndex++}`);
      params.push(JSON.stringify(data.summary));
    }

    if (data.recommendations) {
      updates.push(`ai_recommendations = $${paramIndex++}`);
      params.push(JSON.stringify(data.recommendations));
    }

    if (data.recordingUrl) {
      updates.push(`recording_url = $${paramIndex++}`);
      params.push(data.recordingUrl);
    }

    if (data.duration) {
      updates.push(`duration = $${paramIndex++}`);
      params.push(data.duration);
    }

    const result = await pool.query(
      `UPDATE meeting_records SET ${updates.join(', ')} WHERE id = $1 RETURNING *`,
      params
    );

    return result.rows[0];
  },

  /**
   * Get meetings for a patient
   */
  async getMeetingsByPatient(patientId: string, limit = 20) {
    const result = await pool.query(
      `SELECT mr.*, a.confirmed_date, a.appointment_type
       FROM meeting_records mr
       LEFT JOIN appointments a ON mr.appointment_id = a.id
       WHERE mr.patient_id = $1
       ORDER BY mr.created_at DESC
       LIMIT $2`,
      [patientId, limit]
    );
    return result.rows;
  },

  /**
   * Get completed meetings with summaries
   */
  async getCompletedMeetings(patientId: string, limit = 10) {
    const result = await pool.query(
      `SELECT mr.*, a.confirmed_date, a.appointment_type, a.symptoms
       FROM meeting_records mr
       LEFT JOIN appointments a ON mr.appointment_id = a.id
       WHERE mr.patient_id = $1 AND mr.status = 'ended' AND mr.ai_summary IS NOT NULL
       ORDER BY mr.ended_at DESC
       LIMIT $2`,
      [patientId, limit]
    );
    return result.rows;
  }
};

// ============================================================================
// PHASE 2: DEVICE TOKEN SERVICE
// ============================================================================

export const DeviceTokenService = {
  async register(userId: string, data: {
    deviceToken: string;
    platform: 'ios' | 'android' | 'web';
    deviceName?: string;
    deviceModel?: string;
    osVersion?: string;
    appVersion?: string;
  }) {
    const id = `DT-${crypto.randomUUID().substring(0, 12)}`;
    const result = await pool.query(
      `INSERT INTO device_tokens (id, user_id, device_token, platform, device_name, device_model, os_version, app_version)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (user_id, device_token) DO UPDATE SET
         platform = EXCLUDED.platform,
         device_name = EXCLUDED.device_name,
         device_model = EXCLUDED.device_model,
         os_version = EXCLUDED.os_version,
         app_version = EXCLUDED.app_version,
         is_active = true,
         last_used_at = NOW(),
         updated_at = NOW()
       RETURNING *`,
      [id, userId, data.deviceToken, data.platform, data.deviceName, data.deviceModel, data.osVersion, data.appVersion]
    );
    return result.rows[0];
  },

  async getUserTokens(userId: string) {
    const result = await pool.query(
      'SELECT * FROM device_tokens WHERE user_id = $1 AND is_active = true ORDER BY last_used_at DESC',
      [userId]
    );
    return result.rows;
  },

  async deactivate(userId: string, deviceToken: string) {
    const result = await pool.query(
      'UPDATE device_tokens SET is_active = false, updated_at = NOW() WHERE user_id = $1 AND device_token = $2 RETURNING *',
      [userId, deviceToken]
    );
    return result.rows[0];
  },

  async deactivateAll(userId: string) {
    await pool.query(
      'UPDATE device_tokens SET is_active = false, updated_at = NOW() WHERE user_id = $1',
      [userId]
    );
  }
};

// ============================================================================
// PHASE 2: BIOMETRIC AUTH SERVICE
// ============================================================================

export const BiometricService = {
  async register(userId: string, data: {
    credentialType: 'fingerprint' | 'face_id' | 'iris';
    publicKey: string;
    credentialId: string;
    deviceId: string;
    deviceName?: string;
  }) {
    const id = `BIO-${crypto.randomUUID().substring(0, 12)}`;
    const result = await pool.query(
      `INSERT INTO biometric_credentials (id, user_id, credential_type, public_key, credential_id, device_id, device_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id, device_id, credential_type) DO UPDATE SET
         public_key = EXCLUDED.public_key,
         credential_id = EXCLUDED.credential_id,
         device_name = EXCLUDED.device_name,
         is_active = true,
         updated_at = NOW()
       RETURNING *`,
      [id, userId, data.credentialType, data.publicKey, data.credentialId, data.deviceId, data.deviceName]
    );
    return result.rows[0];
  },

  async verify(credentialId: string, deviceId: string) {
    const result = await pool.query(
      `SELECT bc.*, u.id as uid, u.email, u.name, u.role
       FROM biometric_credentials bc
       JOIN users u ON bc.user_id = u.id
       WHERE bc.credential_id = $1 AND bc.device_id = $2 AND bc.is_active = true`,
      [credentialId, deviceId]
    );
    if (result.rows.length > 0) {
      await pool.query(
        'UPDATE biometric_credentials SET last_used_at = NOW() WHERE credential_id = $1 AND device_id = $2',
        [credentialId, deviceId]
      );
    }
    return result.rows[0] || null;
  },

  async getUserCredentials(userId: string) {
    const result = await pool.query(
      'SELECT id, credential_type, device_id, device_name, is_active, last_used_at, created_at FROM biometric_credentials WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows;
  },

  async revoke(userId: string, credentialId: string) {
    const result = await pool.query(
      'UPDATE biometric_credentials SET is_active = false, updated_at = NOW() WHERE user_id = $1 AND id = $2 RETURNING *',
      [userId, credentialId]
    );
    return result.rows[0];
  }
};

// ============================================================================
// PHASE 2: REFRESH TOKEN SERVICE
// ============================================================================

export const RefreshTokenService = {
  async create(userId: string, tokenHash: string, data: {
    deviceId?: string;
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const id = `RT-${crypto.randomUUID().substring(0, 12)}`;
    const result = await pool.query(
      `INSERT INTO refresh_tokens (id, user_id, token_hash, device_id, expires_at, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, userId, tokenHash, data.deviceId, data.expiresAt, data.ipAddress, data.userAgent]
    );
    return result.rows[0];
  },

  async validate(tokenHash: string) {
    const result = await pool.query(
      `SELECT rt.*, u.id as uid, u.email, u.name, u.role
       FROM refresh_tokens rt
       JOIN users u ON rt.user_id = u.id
       WHERE rt.token_hash = $1 AND rt.is_revoked = false AND rt.expires_at > NOW()`,
      [tokenHash]
    );
    return result.rows[0] || null;
  },

  async revoke(tokenId: string, replacedBy?: string) {
    await pool.query(
      'UPDATE refresh_tokens SET is_revoked = true, revoked_at = NOW(), replaced_by = $2 WHERE id = $1',
      [tokenId, replacedBy || null]
    );
  },

  async revokeAllForUser(userId: string) {
    await pool.query(
      'UPDATE refresh_tokens SET is_revoked = true, revoked_at = NOW() WHERE user_id = $1 AND is_revoked = false',
      [userId]
    );
  }
};

// ============================================================================
// PHASE 2: PUSH SUBSCRIPTION SERVICE
// ============================================================================

export const PushSubscriptionService = {
  async getOrCreate(userId: string) {
    let result = await pool.query('SELECT * FROM push_subscriptions WHERE user_id = $1', [userId]);
    if (result.rows.length === 0) {
      const id = `PS-${crypto.randomUUID().substring(0, 12)}`;
      result = await pool.query(
        'INSERT INTO push_subscriptions (id, user_id) VALUES ($1, $2) RETURNING *',
        [id, userId]
      );
    }
    return result.rows[0];
  },

  async update(userId: string, preferences: Record<string, unknown>) {
    const fields: string[] = [];
    const values: unknown[] = [userId];
    let idx = 2;

    const allowedFields = ['appointment_reminders', 'medication_reminders', 'health_tips',
      'lab_results', 'doctor_messages', 'system_updates', 'quiet_hours_start',
      'quiet_hours_end', 'language_preference'];

    for (const field of allowedFields) {
      if (field in preferences) {
        fields.push(`${field} = $${idx++}`);
        values.push(preferences[field]);
      }
    }

    if (fields.length === 0) return this.getOrCreate(userId);

    fields.push('updated_at = NOW()');
    const result = await pool.query(
      `UPDATE push_subscriptions SET ${fields.join(', ')} WHERE user_id = $1 RETURNING *`,
      values
    );
    return result.rows[0] || this.getOrCreate(userId);
  }
};

// ============================================================================
// PHASE 2: API CONNECTION SERVICE
// ============================================================================

export const ApiConnectionService = {
  async getUserConnections(userId: string) {
    const result = await pool.query(
      'SELECT id, user_id, service_type, service_url, connection_status, last_sync_at, metadata, created_at, updated_at FROM user_api_connections WHERE user_id = $1 ORDER BY created_at',
      [userId]
    );
    return result.rows;
  },

  async connect(userId: string, data: {
    serviceType: string;
    serviceUrl?: string;
    accessToken?: string;
    refreshToken?: string;
    tokenExpiresAt?: Date;
    metadata?: Record<string, unknown>;
  }) {
    const id = `CONN-${crypto.randomUUID().substring(0, 12)}`;
    const result = await pool.query(
      `INSERT INTO user_api_connections (id, user_id, service_type, service_url, access_token_encrypted, refresh_token_encrypted, token_expires_at, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (user_id, service_type) DO UPDATE SET
         service_url = COALESCE(EXCLUDED.service_url, user_api_connections.service_url),
         access_token_encrypted = COALESCE(EXCLUDED.access_token_encrypted, user_api_connections.access_token_encrypted),
         refresh_token_encrypted = COALESCE(EXCLUDED.refresh_token_encrypted, user_api_connections.refresh_token_encrypted),
         token_expires_at = COALESCE(EXCLUDED.token_expires_at, user_api_connections.token_expires_at),
         connection_status = 'active',
         metadata = COALESCE(EXCLUDED.metadata, user_api_connections.metadata),
         updated_at = NOW()
       RETURNING *`,
      [id, userId, data.serviceType, data.serviceUrl, data.accessToken, data.refreshToken, data.tokenExpiresAt, JSON.stringify(data.metadata || {})]
    );

    // Audit
    const auditId = `ACA-${crypto.randomUUID().substring(0, 12)}`;
    await pool.query(
      'INSERT INTO api_connection_audit (id, connection_id, user_id, action, service_type, details) VALUES ($1, $2, $3, $4, $5, $6)',
      [auditId, result.rows[0].id, userId, 'connect', data.serviceType, JSON.stringify({ serviceUrl: data.serviceUrl })]
    );

    return result.rows[0];
  },

  async disconnect(userId: string, serviceType: string) {
    const result = await pool.query(
      `UPDATE user_api_connections SET connection_status = 'revoked', access_token_encrypted = NULL, refresh_token_encrypted = NULL, updated_at = NOW()
       WHERE user_id = $1 AND service_type = $2 RETURNING *`,
      [userId, serviceType]
    );

    if (result.rows[0]) {
      const auditId = `ACA-${crypto.randomUUID().substring(0, 12)}`;
      await pool.query(
        'INSERT INTO api_connection_audit (id, connection_id, user_id, action, service_type) VALUES ($1, $2, $3, $4, $5)',
        [auditId, result.rows[0].id, userId, 'disconnect', serviceType]
      );
    }

    return result.rows[0];
  },

  async getAuditLog(userId: string, limit = 50) {
    const result = await pool.query(
      'SELECT * FROM api_connection_audit WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
      [userId, limit]
    );
    return result.rows;
  }
};

// ============================================================================
// PHASE 2: SYNC QUEUE SERVICE
// ============================================================================

export const SyncService = {
  async push(userId: string, items: Array<{
    entityType: string;
    entityId: string;
    operation: 'create' | 'update' | 'delete';
    payload: Record<string, unknown>;
    clientTimestamp: string;
  }>) {
    const results = [];
    for (const item of items) {
      const id = `SQ-${crypto.randomUUID().substring(0, 12)}`;
      const result = await pool.query(
        `INSERT INTO sync_queue (id, user_id, entity_type, entity_id, operation, payload, client_timestamp, server_timestamp, sync_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), 'synced')
         RETURNING *`,
        [id, userId, item.entityType, item.entityId, item.operation, JSON.stringify(item.payload), item.clientTimestamp]
      );
      results.push(result.rows[0]);
    }
    return results;
  },

  async pull(userId: string, since: string) {
    const result = await pool.query(
      `SELECT * FROM sync_queue
       WHERE user_id = $1 AND server_timestamp > $2
       ORDER BY server_timestamp ASC`,
      [userId, since]
    );
    return result.rows;
  },

  async getConflicts(userId: string) {
    const result = await pool.query(
      "SELECT * FROM sync_queue WHERE user_id = $1 AND sync_status = 'conflict' ORDER BY created_at",
      [userId]
    );
    return result.rows;
  },

  async resolveConflict(id: string, resolution: Record<string, unknown>) {
    const result = await pool.query(
      `UPDATE sync_queue SET sync_status = 'synced', conflict_resolution = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, JSON.stringify(resolution)]
    );
    return result.rows[0];
  }
};

// ============================================================================
// PHASE 2: USER SETTINGS SERVICE
// ============================================================================

export const UserSettingsService = {
  async get(userId: string) {
    let result = await pool.query('SELECT * FROM user_settings WHERE user_id = $1', [userId]);
    if (result.rows.length === 0) {
      result = await pool.query(
        'INSERT INTO user_settings (user_id) VALUES ($1) RETURNING *',
        [userId]
      );
    }
    return result.rows[0];
  },

  async update(userId: string, settings: Record<string, unknown>) {
    const fields: string[] = [];
    const values: unknown[] = [userId];
    let idx = 2;

    const allowedFields = ['theme', 'language', 'font_size', 'biometric_enabled',
      'auto_sync', 'sync_on_wifi_only', 'data_saver_mode',
      'accessibility_high_contrast', 'accessibility_screen_reader',
      'last_active_role', 'onboarding_completed'];

    for (const field of allowedFields) {
      if (field in settings) {
        fields.push(`${field} = $${idx++}`);
        values.push(settings[field]);
      }
    }

    if (fields.length === 0) return this.get(userId);

    fields.push('updated_at = NOW()');

    // Upsert
    await pool.query(
      `INSERT INTO user_settings (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
      [userId]
    );
    const updateResult = await pool.query(
      `UPDATE user_settings SET ${fields.join(', ')} WHERE user_id = $1 RETURNING *`,
      values
    );
    return updateResult.rows[0] || this.get(userId);
  }
};

// ============================================================================
// Lab & Imaging Orders Service (Patient View - Read-Only)
// ============================================================================

const LabOrderService = {
  async getPatientLabOrders(patientId: string) {
    const result = await pool.query(
      `SELECT lo.*, 
              u_doc.name as doctor_name, u_doc.name_thai as doctor_name_thai
       FROM lab_orders lo
       LEFT JOIN users u_doc ON lo.doctor_id = u_doc.id
       WHERE lo.patient_id = $1
       ORDER BY lo.created_at DESC`,
      [patientId]
    );
    return result.rows;
  },

  async getLabOrderById(labOrderId: string, patientId: string) {
    const result = await pool.query(
      `SELECT lo.*, 
              u_doc.name as doctor_name, u_doc.name_thai as doctor_name_thai
       FROM lab_orders lo
       LEFT JOIN users u_doc ON lo.doctor_id = u_doc.id
       WHERE lo.id = $1 AND lo.patient_id = $2`,
      [labOrderId, patientId]
    );
    return result.rows[0] || null;
  }
};

const ImagingOrderService = {
  async getPatientImagingOrders(patientId: string) {
    const result = await pool.query(
      `SELECT io.*, 
              u_doc.name as doctor_name, u_doc.name_thai as doctor_name_thai
       FROM imaging_orders io
       LEFT JOIN users u_doc ON io.doctor_id = u_doc.id
       WHERE io.patient_id = $1
       ORDER BY io.created_at DESC`,
      [patientId]
    );
    return result.rows;
  },

  async getImagingOrderById(orderId: string, patientId: string) {
    const result = await pool.query(
      `SELECT io.*, 
              u_doc.name as doctor_name, u_doc.name_thai as doctor_name_thai
       FROM imaging_orders io
       LEFT JOIN users u_doc ON io.doctor_id = u_doc.id
       WHERE io.id = $1 AND io.patient_id = $2`,
      [orderId, patientId]
    );
    return result.rows[0] || null;
  }
};

// Export pool for direct queries if needed
export { pool, usePostgres };

// Default export
export default {
  AuthService,
  PHRService,
  AppointmentService,
  DoctorService,
  ContentService,
  LivingWillService,
  NotificationService,
  MetadataService,
  MeetingService,
  DeviceTokenService,
  BiometricService,
  RefreshTokenService,
  PushSubscriptionService,
  ApiConnectionService,
  SyncService,
  UserSettingsService,
  LabOrderService,
  ImagingOrderService,
  pool,
  usePostgres,
};
