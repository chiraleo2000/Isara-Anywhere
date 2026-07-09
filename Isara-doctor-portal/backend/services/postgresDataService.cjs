/**
 * PostgreSQL Data Service for Doctor Portal
 * Replaces GCS bucket access with PostgreSQL queries
 * Phase 1: Full PostgreSQL migration for local development
 * 
 * @module postgresDataService
 * @version 1.0.0
 */

const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const crypto = require('node:crypto');
const {
  buildMedicalContentVisibilityQuery,
  buildClinicalResourceVisibilityQuery,
  canViewMedicalContent,
} = require('../lib/contentVisibility.cjs');
const { parseJsonField, formatMedicalArticle, formatClinicalResource } = require('../lib/contentFormatters.cjs');
const { indexClinicalResource, deactivateClinicalResource } = require('../lib/contentEmbeddingService.cjs');

// Database Configuration - parse DATABASE_URL if available
const isDevelopment = process.env.NODE_ENV !== 'production';
const usePostgres = process.env.USE_POSTGRESQL === 'true' || isDevelopment;

// Parse DATABASE_URL if available
let dbConfig = {};
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
    console.warn('⚠️ Failed to parse DATABASE_URL:', e.message);
  }
}

// PostgreSQL Docker service configuration (supports embedded PG, Cloud SQL, and local Docker)
const dbHost = dbConfig.host || process.env.DB_HOST || 'localhost';
const isProduction = process.env.NODE_ENV === 'production';
const useEmbeddedPG = process.env.USE_EMBEDDED_PG === 'true';
// Use DB_SSL env var to control SSL - default to false for embedded/Docker deployments
const useSSL = process.env.DB_SSL === 'true' || process.env.DB_SSL === '1';

// Configure connection - Standard TCP (supports embedded PG, Cloud SQL, and local Docker)
const poolConfig = {
  host: dbHost,
  port: dbConfig.port || Number.parseInt(process.env.DB_PORT || (useEmbeddedPG ? '5432' : '5433'), 10),
  database: dbConfig.database || process.env.DB_NAME || 'izara_phase1',
  user: dbConfig.user || process.env.DB_USER || 'postgres',
  password: dbConfig.password || process.env.DB_PASSWORD || '',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: isProduction ? 30000 : 5000,
  ssl: useSSL ? { rejectUnauthorized: false } : false,
};

console.log(`📦 Database: PostgreSQL TCP - ${dbHost}:${poolConfig.port}`);

const pool = new Pool(poolConfig);

// Handle pool errors to prevent process exit
pool.on('error', (err) => {
  console.error('❌ PostgreSQL pool error:', err.message);
});

// Run migrations to ensure schema is up-to-date
async function runMigrations() {
  try {
    // Create doctor_profiles table if not exists (required for doctor registration)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS doctor_profiles (
        doctor_id VARCHAR(50) PRIMARY KEY,
        specialty VARCHAR(100),
        specialty_thai VARCHAR(100),
        qualifications JSONB DEFAULT '[]'::jsonb,
        hospital_name VARCHAR(255),
        hospital_name_thai VARCHAR(255),
        bio TEXT,
        bio_thai TEXT,
        consultation_fee DECIMAL(10,2) DEFAULT 0,
        available_slots JSONB DEFAULT '[]'::jsonb,
        is_accepting_patients BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Add date_of_birth column to users if missing
    await pool.query(`
      DO $$ 
      BEGIN
        ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END $$;
    `);

    // ========================================================================
    // Lab Orders & Imaging - Add missing columns
    // ========================================================================
    
    // Add updated_at to lab_orders if missing
    await pool.query(`
      DO $$ 
      BEGIN
        ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS result_documents JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS result_date TIMESTAMP WITH TIME ZONE;
        ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS ordered_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS notes TEXT;
        ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS notes TEXT;
        ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS prescribed_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        -- Drop restrictive FK constraints that prevent standalone lab/imaging orders
        ALTER TABLE lab_orders DROP CONSTRAINT IF EXISTS lab_orders_appointment_id_fkey;
        ALTER TABLE lab_orders DROP CONSTRAINT IF EXISTS lab_orders_emr_id_fkey;
        ALTER TABLE imaging_orders DROP CONSTRAINT IF EXISTS imaging_orders_appointment_id_fkey;
        ALTER TABLE imaging_orders DROP CONSTRAINT IF EXISTS imaging_orders_emr_id_fkey;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END $$;
    `);

    // Create imaging_orders table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS imaging_orders (
        id VARCHAR(50) PRIMARY KEY,
        emr_id VARCHAR(50),
        appointment_id VARCHAR(50),
        patient_id VARCHAR(50),
        doctor_id VARCHAR(50),
        imaging_type VARCHAR(100) NOT NULL,
        body_part VARCHAR(255),
        clinical_indication TEXT,
        priority VARCHAR(20) DEFAULT 'routine',
        notes TEXT,
        results JSONB,
        result_documents JSONB DEFAULT '[]'::jsonb,
        status VARCHAR(20) DEFAULT 'ordered',
        ordered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP WITH TIME ZONE,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
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

    // API connection audit
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
    
    // v2.3.0 — patient_documents registry + booking wizard columns
    await pool.query(`
      CREATE TABLE IF NOT EXISTS patient_documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patient_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        source_type TEXT NOT NULL,
        source_id VARCHAR(50),
        appointment_id VARCHAR(50) REFERENCES appointments(id) ON DELETE SET NULL,
        doctor_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        title TEXT NOT NULL,
        description TEXT,
        file_name TEXT NOT NULL,
        mime_type TEXT NOT NULL DEFAULT 'application/pdf',
        file_data BYTEA,
        file_size INTEGER,
        status TEXT NOT NULL DEFAULT 'delivered',
        delivered_at TIMESTAMPTZ DEFAULT NOW(),
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS patient_doctor_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patient_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        doctor_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        appointment_id VARCHAR(50) REFERENCES appointments(id) ON DELETE SET NULL,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        channel TEXT NOT NULL DEFAULT 'both',
        status TEXT NOT NULL DEFAULT 'sent',
        read_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`
      ALTER TABLE appointments ADD COLUMN IF NOT EXISTS preferred_dates JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE appointments ADD COLUMN IF NOT EXISTS preferred_time_slot VARCHAR(20);
      ALTER TABLE appointments ADD COLUMN IF NOT EXISTS required_specialty VARCHAR(100);
      ALTER TABLE appointments ADD COLUMN IF NOT EXISTS suggested_specialty VARCHAR(100);
      ALTER TABLE appointments ADD COLUMN IF NOT EXISTS booking_metadata JSONB DEFAULT '{}'::jsonb;
    `);

    // medical_content — columns expected by ContentService CRUD
    await pool.query(`
      ALTER TABLE medical_content ADD COLUMN IF NOT EXISTS summary_thai TEXT;
      ALTER TABLE medical_content ADD COLUMN IF NOT EXISTS summary_english TEXT;
      ALTER TABLE medical_content ADD COLUMN IF NOT EXISTS content_type VARCHAR(50) DEFAULT 'article';
      ALTER TABLE medical_content ADD COLUMN IF NOT EXISTS video_url TEXT;
      ALTER TABLE medical_content ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
      ALTER TABLE medical_content ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
      ALTER TABLE medical_content ADD COLUMN IF NOT EXISTS author_name VARCHAR(255);
      ALTER TABLE medical_content ADD COLUMN IF NOT EXISTS approved_by VARCHAR(50) REFERENCES users(id);
      ALTER TABLE medical_content ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
      ALTER TABLE medical_content ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
      ALTER TABLE medical_content ADD COLUMN IF NOT EXISTS history JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE medical_content ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
    `);

    await pool.query(`
      ALTER TABLE clinical_resources ADD COLUMN IF NOT EXISTS description_thai TEXT;
      ALTER TABLE clinical_resources ADD COLUMN IF NOT EXISTS description_english TEXT;
      ALTER TABLE clinical_resources ADD COLUMN IF NOT EXISTS resource_type VARCHAR(50) DEFAULT 'guideline';
      ALTER TABLE clinical_resources ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
      ALTER TABLE clinical_resources ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
      ALTER TABLE clinical_resources ADD COLUMN IF NOT EXISTS history JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE clinical_resources ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
      ALTER TABLE clinical_resources ADD COLUMN IF NOT EXISTS comments JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE medical_content ADD COLUMN IF NOT EXISTS comments JSONB DEFAULT '[]'::jsonb;
    `);

    console.log('✅ Database migrations completed (Doctor Portal - Phase 1 + Phase 2)');
  } catch (err) {
    console.warn('⚠️ Migration warning:', err.message);
  }
}

// Test connection async - don't block module load
setTimeout(async () => {
  try {
    await pool.query('SELECT NOW()');
    console.log('✅ PostgreSQL connected successfully (Doctor Portal)');
    await runMigrations();
  } catch (err) {
    console.error('❌ PostgreSQL connection error:', err.message);
  }
}, 1000);

console.log('📦 PostgreSQL pool initialized (connection test pending)');

// ============================================================================
// AUTHENTICATION SERVICE
// ============================================================================

const AuthService = {
  /**
   * Find user by email
   */
  async findByEmail(email) {
    const result = await pool.query(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );
    return result.rows[0] || null;
  },

  /**
   * Find user by ID
   */
  async findById(id) {
    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Verify password
   */
  async verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  },

  /**
   * Hash password
   */
  async hashPassword(password) {
    return bcrypt.hash(password, 12);
  },

  /**
   * Create session
   */
  async createSession(userId, ipAddress, userAgent) {
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
  async validateSession(token) {
    const result = await pool.query(
      `SELECT s.*, u.*
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.token = $1 AND s.expires_at > NOW()`,
      [token]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      session: {
        id: row.id,
        user_id: row.user_id,
        token: row.token,
        expires_at: row.expires_at,
        created_at: row.created_at,
      },
      user: {
        id: row.user_id,
        email: row.email,
        role: row.role,
        name: row.name,
        name_thai: row.name_thai,
        doctor_id: row.doctor_id,
        is_admin: row.is_admin,
        admin_privileges: row.admin_privileges,
        specialty: row.specialty,
        hospital_name: row.hospital_name,
      }
    };
  },

  /**
   * Invalidate session (logout)
   */
  async invalidateSession(token) {
    await pool.query('DELETE FROM sessions WHERE token = $1', [token]);
  },

  /**
   * Get all doctors and admins
   */
  async getAllDoctors() {
    const result = await pool.query(
      `SELECT u.*, dp.*
       FROM users u
       LEFT JOIN doctor_profiles dp ON dp.doctor_id = u.id
       WHERE u.role IN ('doctor', 'admin')
       ORDER BY u.name`
    );
    return result.rows;
  },
};

// ============================================================================
// PATIENT SERVICE
// ============================================================================

const PatientService = {
  /**
   * Get all patients
   */
  async getAllPatients() {
    const result = await pool.query(
      `SELECT u.*, pp.*
       FROM users u
       LEFT JOIN patient_profiles pp ON pp.patient_id = u.id
       WHERE u.role = 'patient'
       ORDER BY u.name`
    );
    return result.rows;
  },

  /**
   * Get patient by ID
   */
  async getPatientById(patientId) {
    const result = await pool.query(
      `SELECT u.*, pp.*, phr.*
       FROM users u
       LEFT JOIN patient_profiles pp ON pp.patient_id = u.id
       LEFT JOIN phr ON phr.patient_id = u.id
       WHERE u.id = $1`,
      [patientId]
    );
    return result.rows[0] || null;
  },

  /**
   * Get patient PHR
   */
  async getPatientPHR(patientId) {
    const result = await pool.query(
      'SELECT * FROM phr WHERE patient_id = $1',
      [patientId]
    );
    return result.rows[0] || null;
  },

  /**
   * Get patient vital signs
   */
  async getPatientVitalSigns(patientId, limit = 50) {
    const result = await pool.query(
      `SELECT * FROM vital_signs 
       WHERE patient_id = $1 
       ORDER BY measured_at DESC 
       LIMIT $2`,
      [patientId, limit]
    );
    return result.rows;
  },

  /**
   * Get patients by doctor
   */
  async getPatientsByDoctor(doctorId) {
    const result = await pool.query(
      `SELECT DISTINCT u.*, pp.*
       FROM users u
       LEFT JOIN patient_profiles pp ON pp.patient_id = u.id
       INNER JOIN appointments a ON a.patient_id = u.id
       WHERE a.doctor_id = $1
       ORDER BY u.name`,
      [doctorId]
    );
    return result.rows;
  },

  /**
   * Get patient timeline (appointments, EMR records, etc.)
   */
  async getPatientTimeline(patientId) {
    // Get appointments, EMR records, and vital signs as timeline events
    const [appointments, emr, vitals] = await Promise.all([
      pool.query(
        `SELECT id, 'appointment' as type, COALESCE(confirmed_date, requested_date, appointment_date) as event_date, 
                reason as description, status
         FROM appointments WHERE patient_id = $1
         ORDER BY COALESCE(confirmed_date, requested_date, appointment_date) DESC NULLS LAST LIMIT 20`,
        [patientId]
      ),
      pool.query(
        `SELECT id, 'emr' as type, created_at as event_date,
                COALESCE(subjective->>'chief_complaint', '') as description, status
         FROM emr WHERE patient_id = $1
         ORDER BY created_at DESC LIMIT 20`,
        [patientId]
      ),
      pool.query(
        `SELECT id, 'vitals' as type, measured_at as event_date,
                'Vital signs recorded' as description, 'completed' as status
         FROM vital_signs WHERE patient_id = $1
         ORDER BY measured_at DESC LIMIT 20`,
        [patientId]
      )
    ]);

    // Combine and sort by date
    const timeline = [
      ...appointments.rows,
      ...emr.rows,
      ...vitals.rows
    ].sort((a, b) => new Date(b.event_date) - new Date(a.event_date));

    return timeline.slice(0, 50);
  },
};

// ============================================================================
// APPOINTMENT SERVICE
// ============================================================================

const AppointmentService = {
  /**
   * Get doctor appointments
   */
  async getDoctorAppointments(doctorId, date) {
    // Match doctor_id whether it's a users.id or a doctors.id
    // Also include unassigned (NULL doctor_id) appointments so admin/doctor can see them in the pending queue
    let query = `
      SELECT a.*, 
             u.name as patient_name, u.name_thai as patient_name_thai,
             u.email as patient_email, u.phone as patient_phone
      FROM appointments a
      LEFT JOIN users u ON a.patient_id = u.id
      WHERE (
        a.doctor_id = $1
        OR a.doctor_id IN (SELECT doctor_id FROM doctor_profiles WHERE doctor_id = $1)
        OR a.doctor_id IS NULL
      )
    `;
    const params = [doctorId];

    if (date) {
      query += ' AND DATE(COALESCE(a.confirmed_date, a.requested_date, a.appointment_date)) = $2';
      params.push(date);
    }

    query += ' ORDER BY COALESCE(a.confirmed_date, a.requested_date, a.appointment_date) ASC, COALESCE(a.confirmed_time, a.requested_time, a.appointment_time) ASC';

    const result = await pool.query(query, params);
    return result.rows;
  },

  /**
   * Get all appointments (admin)
   */
  async getAllAppointments(status, startDate, endDate) {
    let query = `
      SELECT a.*, 
             p.name as patient_name, p.name_thai as patient_name_thai,
             d.name as doctor_name, d.name_thai as doctor_name_thai
      FROM appointments a
      LEFT JOIN users p ON a.patient_id = p.id
      LEFT JOIN users d ON d.id = a.doctor_id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND a.status = $${paramIndex++}`;
      params.push(status);
    }

    if (startDate) {
      query += ` AND COALESCE(a.confirmed_date, a.requested_date, a.appointment_date) >= $${paramIndex++}`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND COALESCE(a.confirmed_date, a.requested_date, a.appointment_date) <= $${paramIndex++}`;
      params.push(endDate);
    }

    query += ' ORDER BY COALESCE(a.confirmed_date, a.requested_date, a.appointment_date) DESC, COALESCE(a.confirmed_time, a.requested_time, a.appointment_time) DESC';

    const result = await pool.query(query, params);
    return result.rows;
  },

  /**
   * Get appointment by ID
   */
  async getAppointmentById(appointmentId) {
    // Use LEFT JOINs to handle doctor_id that may not match users.id
    const result = await pool.query(
      `SELECT a.*, 
              p.name as patient_name, p.name_thai as patient_name_thai,
              p.email as patient_email, p.phone as patient_phone,
              d.name as doctor_name, d.name_thai as doctor_name_thai,
              dp.specialty as doctor_specialty
       FROM appointments a
       LEFT JOIN users p ON a.patient_id = p.id
       LEFT JOIN users d ON d.id = a.doctor_id
       LEFT JOIN doctor_profiles dp ON dp.doctor_id = COALESCE(d.id, a.doctor_id)
       WHERE a.id = $1
       LIMIT 1`,
      [appointmentId]
    );
    return result.rows[0] || null;
  },

  /**
   * Update appointment
   */
  async updateAppointment(appointmentId, data) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (data.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }
    if (data.doctor_id !== undefined) {
      fields.push(`doctor_id = $${paramIndex++}`);
      values.push(data.doctor_id);
    }
    if (data.meeting_link !== undefined || data.meet_link !== undefined || data.meetingLink !== undefined) {
      const link = data.meeting_link || data.meet_link || data.meetingLink;
      fields.push(`meeting_link = $${paramIndex}`, `meet_link = $${paramIndex++}`);
      values.push(link);
    }
    if (data.jitsi_room_name !== undefined || data.jitsiRoomName !== undefined) {
      fields.push(`jitsi_room_name = $${paramIndex++}`);
      values.push(data.jitsi_room_name || data.jitsiRoomName);
    }
    if (data.appointment_type !== undefined) {
      fields.push(`appointment_type = $${paramIndex++}`);
      values.push(data.appointment_type);
    }
    if (data.notes !== undefined) {
      fields.push(`notes = $${paramIndex++}`);
      values.push(data.notes);
    }
    if (data.scheduled_date !== undefined || data.confirmed_date !== undefined) {
      fields.push(`confirmed_date = $${paramIndex++}`);
      values.push(data.scheduled_date || data.confirmed_date);
    }
    if (data.scheduled_time !== undefined || data.confirmed_time !== undefined) {
      fields.push(`confirmed_time = $${paramIndex++}`);
      values.push(data.scheduled_time || data.confirmed_time);
    }
    // Meeting URL fields for doctor/patient/guest Jitsi links
    if (data.doctor_meeting_url !== undefined) {
      fields.push(`doctor_meeting_url = $${paramIndex++}`);
      values.push(data.doctor_meeting_url);
    }
    if (data.patient_meeting_url !== undefined) {
      fields.push(`patient_meeting_url = $${paramIndex++}`);
      values.push(data.patient_meeting_url);
    }
    if (data.guest_meeting_url !== undefined) {
      fields.push(`guest_meeting_url = $${paramIndex++}`);
      values.push(data.guest_meeting_url);
    }
    // Confirmation tracking
    if (data.confirmed_by !== undefined) {
      fields.push(`confirmed_by = $${paramIndex++}`);
      values.push(data.confirmed_by);
    }
    if (data.confirmed_by_email !== undefined) {
      fields.push(`confirmed_by_email = $${paramIndex++}`);
      values.push(data.confirmed_by_email);
    }
    if (data.confirmed_at !== undefined) {
      fields.push(`confirmed_at = $${paramIndex++}`);
      values.push(data.confirmed_at);
    }

    fields.push('updated_at = NOW()');
    values.push(appointmentId);

    const result = await pool.query(
      `UPDATE appointments SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0];
  },

  /**
   * Get pending appointments count
   */
  async getPendingCount(doctorId) {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM appointments 
       WHERE (doctor_id = $1 OR doctor_id IS NULL)
       AND status IN ('in_pool', 'pending', 'awaiting_doctor_response', 'assigned')`,
      [doctorId]
    );
    return Number.parseInt(result.rows[0].count, 10);
  },

  /**
   * Create a new appointment (wrapped in transaction)
   */
  async createAppointment(data) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const appointmentId = data.id || `APT-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      const result = await client.query(
        `INSERT INTO appointments (
          id, patient_id, doctor_id, 
          requested_date, requested_time, confirmed_date, confirmed_time,
          appointment_date, appointment_time,
          appointment_type, reason, symptoms, notes, status,
          meeting_link, created_at, updated_at
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
         RETURNING *`,
        [
          appointmentId,
          data.patientId || data.patient_id,
          data.doctorId || data.doctor_id,
          data.requestedDate || data.requested_date || data.dateTime?.split('T')[0] || null,
          data.requestedTime || data.requested_time || data.dateTime?.split('T')[1]?.substring(0, 5) || null,
          data.confirmedDate || data.confirmed_date || null,
          data.confirmedTime || data.confirmed_time || null,
          data.appointmentDate || data.appointment_date || data.dateTime?.split('T')[0] || null,
          data.appointmentTime || data.appointment_time || data.dateTime?.split('T')[1]?.substring(0, 5) || null,
          data.type || data.appointment_type || 'general',
          data.reason || null,
          data.symptoms || null,
          data.notes || null,
          data.status || 'pending',
          data.meetingLink || data.meeting_link || null
        ]
      );
      await client.query('COMMIT');
      return result.rows[0];
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * Delete appointment
   */
  async deleteAppointment(appointmentId) {
    const result = await pool.query(
      'DELETE FROM appointments WHERE id = $1 RETURNING *',
      [appointmentId]
    );
    return result.rows[0] || null;
  },

  /**
   * Get patient appointments
   */
  async getPatientAppointments(patientId) {
    const result = await pool.query(
      `SELECT a.*, 
              d.name as doctor_name, d.name_thai as doctor_name_thai,
              dp.specialty as doctor_specialty
       FROM appointments a
       JOIN users d ON a.doctor_id = d.id
       LEFT JOIN doctor_profiles dp ON dp.doctor_id = d.id
       WHERE a.patient_id = $1
       ORDER BY COALESCE(a.confirmed_date, a.requested_date, a.appointment_date) DESC`,
      [patientId]
    );
    return result.rows;
  },
};

// ============================================================================
// EMR SERVICE
// ============================================================================

const EMRService = {
  /**
   * Get patient EMR records
   */
  async getPatientEMR(patientId) {
    const result = await pool.query(
      `SELECT e.*, 
              d.name as doctor_name, d.name_thai as doctor_name_thai
       FROM emr e
       JOIN users d ON e.doctor_id = d.id
       WHERE e.patient_id = $1
       ORDER BY e.created_at DESC`,
      [patientId]
    );
    return result.rows;
  },

  /**
   * Get EMR by appointment
   */
  async getEMRByAppointment(appointmentId) {
    const result = await pool.query(
      'SELECT * FROM emr WHERE appointment_id = $1',
      [appointmentId]
    );
    return result.rows[0] || null;
  },

  /**
   * Create or update EMR
   */
  async upsertEMR(data) {
    const existing = await this.getEMRByAppointment(data.appointment_id);

    if (existing) {
      const result = await pool.query(
        `UPDATE emr SET
          subjective = COALESCE($2, subjective),
          objective = COALESCE($3, objective),
          assessment = COALESCE($4, assessment),
          plan = COALESCE($5, plan),
          ai_summary = COALESCE($6, ai_summary),
          status = COALESCE($7, status),
          updated_at = NOW()
         WHERE appointment_id = $1
         RETURNING *`,
        [
          data.appointment_id,
          JSON.stringify(data.subjective || { chiefComplaint: data.chief_complaint }),
          JSON.stringify(data.objective || { vitalSigns: data.vital_signs }),
          JSON.stringify(data.assessment || { diagnoses: data.diagnosis }),
          JSON.stringify(data.plan || { treatment: data.treatment_plan }),
          data.ai_summary,
          data.status
        ]
      );
      return result.rows[0];
    } else {
      const result = await pool.query(
        `INSERT INTO emr (
          id, appointment_id, patient_id, doctor_id,
          subjective, objective, assessment, plan,
          ai_summary, status
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          `EMR-${Date.now()}`,
          data.appointment_id,
          data.patient_id,
          data.doctor_id,
          JSON.stringify(data.subjective || { chiefComplaint: data.chief_complaint }),
          JSON.stringify(data.objective || { vitalSigns: data.vital_signs }),
          JSON.stringify(data.assessment || { diagnoses: data.diagnosis }),
          JSON.stringify(data.plan || { treatment: data.treatment_plan }),
          data.ai_summary,
          data.status || 'draft'
        ]
      );
      return result.rows[0];
    }
  },

  /**
   * Update EMR by id (doctor editor PUT)
   */
  async updateEMRById(emrId, data) {
    const result = await pool.query(
      `UPDATE emr SET
        subjective = COALESCE($2, subjective),
        objective = COALESCE($3, objective),
        assessment = COALESCE($4, assessment),
        plan = COALESCE($5, plan),
        ai_summary = COALESCE($6, ai_summary),
        ai_transcript = COALESCE($7, ai_transcript),
        patient_instructions = COALESCE($8, patient_instructions),
        patient_instructions_thai = COALESCE($9, patient_instructions_thai),
        doctor_signature = COALESCE($10, doctor_signature),
        signed_at = COALESCE($11, signed_at),
        status = COALESCE($12, status),
        updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        emrId,
        data.subjective != null ? JSON.stringify(data.subjective) : null,
        data.objective != null ? JSON.stringify(data.objective) : null,
        data.assessment != null ? JSON.stringify(data.assessment) : null,
        data.plan != null ? JSON.stringify(data.plan) : null,
        data.ai_summary ?? data.aiSummary ?? null,
        data.ai_transcript ?? data.aiTranscript ?? null,
        data.patient_instructions ?? data.followUpInstructions ?? data.treatmentPlan ?? null,
        data.patient_instructions_thai ?? data.followUpInstructions ?? null,
        data.doctor_signature ?? data.digitalSignature ?? null,
        data.signed_at ?? data.signedAt ?? null,
        data.status === 'finalized' ? 'signed' : (data.status ?? null),
      ]
    );
    return result.rows[0] || null;
  },

  /**
   * Sign EMR (finalize)
   */
  async signEMR(emrId, doctorId) {
    const result = await pool.query(
      `UPDATE emr SET
        status = 'signed',
        doctor_signature = $2,
        signed_at = NOW(),
        updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [emrId, doctorId]
    );
    return result.rows[0];
  },
};

// ============================================================================
// PRESCRIPTION SERVICE
// ============================================================================

const PrescriptionService = {
  /**
   * Get prescriptions by patient
   */
  async getPatientPrescriptions(patientId) {
    const result = await pool.query(
      `SELECT p.*, d.name as doctor_name
       FROM prescriptions p
       JOIN users d ON p.doctor_id = d.id
       WHERE p.patient_id = $1
       ORDER BY p.prescribed_date DESC`,
      [patientId]
    );
    return result.rows;
  },

  /**
   * Get prescription by appointment
   */
  async getPrescriptionByAppointment(appointmentId) {
    const result = await pool.query(
      'SELECT * FROM prescriptions WHERE appointment_id = $1',
      [appointmentId]
    );
    return result.rows[0] || null;
  },

  /**
   * Create prescription
   */
  async createPrescription(data) {
    const result = await pool.query(
      `INSERT INTO prescriptions (
        id, appointment_id, patient_id, doctor_id, medications,
        notes, prescribed_date, status
      )
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), 'active')
       RETURNING *`,
      [
        `RX-${Date.now()}`,
        data.appointment_id,
        data.patient_id,
        data.doctor_id,
        JSON.stringify(data.medications || []),
        data.notes
      ]
    );
    return result.rows[0];
  },
};

// ============================================================================
// LAB ORDERS SERVICE
// ============================================================================

const LabOrderService = {
  /**
   * Get lab orders by patient
   */
  async getPatientLabOrders(patientId) {
    const result = await pool.query(
      `SELECT l.*, d.name as doctor_name
       FROM lab_orders l
       JOIN users d ON l.doctor_id = d.id
       WHERE l.patient_id = $1
       ORDER BY l.ordered_date DESC`,
      [patientId]
    );
    return result.rows;
  },

  /**
   * Create lab order (wrapped in transaction)
   */
  async createLabOrder(data) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        `INSERT INTO lab_orders (
          id, appointment_id, patient_id, doctor_id, tests,
          notes, priority, ordered_date, status
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), 'ordered')
         RETURNING *`,
        [
          `LAB-${Date.now()}`,
          data.appointment_id || null,
          data.patient_id || null,
          data.doctor_id,
          JSON.stringify(data.tests || []),
          data.notes || '',
          data.priority || 'routine'
        ]
      );
      await client.query('COMMIT');
      return result.rows[0];
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * Update lab order results
   */
  async updateLabResults(labOrderId, results, aiAnalysis) {
    const result = await pool.query(
      `UPDATE lab_orders SET
        results = $2,
        ai_analysis = $3,
        status = 'completed',
        result_date = NOW(),
        updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [labOrderId, JSON.stringify(results), aiAnalysis || null]
    );
    return result.rows[0];
  },
};

// ============================================================================
// MEDICAL CONTENT SERVICE
// ============================================================================

function newAuditId() {
  return `AUD-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

function newCommentId() {
  return `CMT-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

const ContentService = {
  formatMedicalArticle,
  formatClinicalResource,

  async logContentAudit({ userId, action, entityType, entityId, details, performedBy }) {
    await pool.query(
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details, performed_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [newAuditId(), userId || null, action, entityType, entityId, JSON.stringify(details || {}), performedBy || userId]
    );
  },

  buildVersionEntry(row, modifierId, modifierName, changeNote) {
    return {
      version: row.version || 1,
      title: row.title_thai || row.title_english || '',
      content: row.content_thai || row.content_english || '',
      summary: row.summary_thai || row.summary_english || '',
      modifiedBy: modifierId,
      modifiedByName: modifierName || 'Unknown',
      modifiedAt: new Date().toISOString(),
      changeNote: changeNote || undefined,
    };
  },

  async appendVersionHistory(table, id, entry) {
    const col = table === 'clinical_resources' ? 'clinical_resources' : 'medical_content';
    await pool.query(
      `UPDATE ${col} SET
        history = COALESCE(history, '[]'::jsonb) || $2::jsonb,
        version = COALESCE(version, 1) + 1,
        updated_at = NOW()
       WHERE id = $1`,
      [id, JSON.stringify([entry])]
    );
  },

  async addComment(table, id, comment) {
    const col = table === 'clinical_resources' ? 'clinical_resources' : 'medical_content';
    const entry = {
      id: newCommentId(),
      authorId: comment.authorId,
      authorName: comment.authorName,
      authorRole: comment.authorRole || 'admin',
      content: comment.content,
      createdAt: new Date().toISOString(),
      isAdminFeedback: Boolean(comment.isAdminFeedback),
    };
    await pool.query(
      `UPDATE ${col} SET comments = COALESCE(comments, '[]'::jsonb) || $2::jsonb, updated_at = NOW() WHERE id = $1`,
      [id, JSON.stringify([entry])]
    );
    return entry;
  },

  async registerTag(name, contentType, createdBy) {
    const tagId = name.toLowerCase().replace(/\s+/g, '-');
    const result = await pool.query(
      `INSERT INTO content_tags (id, name, content_type, created_by, usage_count)
       VALUES ($1, $2, $3, $4, 1)
       ON CONFLICT (id) DO UPDATE SET usage_count = content_tags.usage_count + 1
       RETURNING *`,
      [tagId, name, contentType, createdBy || null]
    );
    return result.rows[0];
  },

  async getTags(contentType) {
    const registry = await pool.query(
      `SELECT id, name, name_thai, usage_count FROM content_tags WHERE content_type = $1 ORDER BY usage_count DESC, name`,
      [contentType]
    );
    const table = contentType === 'clinical' ? 'clinical_resources' : 'medical_content';
    const fromContent = await pool.query(`
      SELECT DISTINCT jsonb_array_elements_text(tags::jsonb) as tag
      FROM ${table}
      WHERE tags IS NOT NULL
      ORDER BY tag
    `);
    const seen = new Set(registry.rows.map((r) => r.name));
    const merged = [...registry.rows.map((r) => ({ id: r.id, name: r.name, nameTh: r.name_thai, usageCount: r.usage_count }))];
    for (const row of fromContent.rows) {
      if (!seen.has(row.tag)) {
        merged.push({ id: row.tag, name: row.tag });
      }
    }
    return merged;
  },

  /**
   * Get all medical content (legacy — prefer getContentForRole)
   */
  async getAllContent(status) {
    let query = `
      SELECT mc.*, u.name as author_name,
             mc.title_thai as title, mc.title_english,
             mc.content_thai as content, mc.content_english,
             mc.image_url
      FROM medical_content mc
      LEFT JOIN users u ON mc.author_id = u.id
    `;
    const params = [];

    if (status) {
      query += ' WHERE mc.status = $1';
      params.push(status);
    }

    query += ' ORDER BY mc.updated_at DESC';

    const result = await pool.query(query, params);
    return result.rows;
  },

  /**
   * Role-aware medical content list
   * @param {{ userId?: string, role?: string, isAdmin?: boolean, status?: string, mine?: boolean }} opts
   */
  async getContentForRole(opts = {}) {
    const { whereClause, params } = buildMedicalContentVisibilityQuery(opts);
    const query = `
      SELECT mc.*, u.name as author_name,
             mc.title_thai as title, mc.title_english,
             mc.content_thai as content, mc.content_english,
             mc.image_url
      FROM medical_content mc
      LEFT JOIN users u ON mc.author_id = u.id
      WHERE ${whereClause}
      ORDER BY mc.updated_at DESC`;
    const result = await pool.query(query, params);
    return result.rows;
  },

  /**
   * Fetch single article and verify viewer may read it
   */
  async getContentByIdForRole(id, viewer = {}) {
    const result = await pool.query(
      `SELECT mc.*, u.name as author_name,
              mc.title_thai as title, mc.title_english,
              mc.content_thai as content, mc.content_english,
              mc.image_url
       FROM medical_content mc
       LEFT JOIN users u ON mc.author_id = u.id
       WHERE mc.id = $1`,
      [id]
    );
    const article = result.rows[0];
    if (!article || !canViewMedicalContent(article, viewer)) return null;
    return article;
  },

  /**
   * Submit draft/rejected article for admin review
   */
  async submitContentForReview(contentId, authorId) {
    const result = await pool.query(
      `UPDATE medical_content SET status = 'pending', submitted_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND author_id = $2 AND status IN ('draft', 'rejected')
       RETURNING *`,
      [contentId, authorId]
    );
    if (result.rows[0]) {
      await this.logContentAudit({
        userId: authorId,
        action: 'submit',
        entityType: 'medical_content',
        entityId: contentId,
        details: { status: 'pending' },
        performedBy: authorId,
      });
    }
    return result.rows[0] || null;
  },

  /**
   * Create medical content
   */
  async createContent(data) {
    const result = await pool.query(
      `INSERT INTO medical_content (
        id, title_thai, title_english, content_thai, content_english,
        summary_thai, summary_english, category, content_type, tags,
        author_id, author_name, status, image_url, video_url, is_featured, submitted_at
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::varchar, $14, $15, $16,
         CASE WHEN $13::varchar = 'pending' THEN NOW() ELSE NULL END)
       RETURNING *`,
      [
        `MC-${Date.now()}`,
        data.title_thai || data.titleThai || data.title || '',
        data.title_english || data.titleEnglish || '',
        data.content_thai || data.contentThai || data.content || '',
        data.content_english || data.contentEnglish || '',
        data.summary_thai || data.summaryTh || data.summaryThai || null,
        data.summary_english || data.summaryEnglish || null,
        data.category,
        data.content_type || data.type || 'article',
        JSON.stringify(data.tags || []),
        data.author_id,
        data.author_name || null,
        data.status || 'draft',
        data.image_url || data.thumbnail || null,
        data.video_url || data.videoUrl || null,
        Boolean(data.is_featured || data.isFeatured),
      ]
    );
    const row = result.rows[0];
    if (row) {
      await this.logContentAudit({
        userId: data.author_id,
        action: 'create',
        entityType: 'medical_content',
        entityId: row.id,
        details: { status: row.status, category: row.category },
        performedBy: data.author_id,
      });
    }
    return row;
  },

  /**
   * Update medical content with version history
   */
  async updateContent(id, data, viewer = {}) {
    const existing = await pool.query('SELECT * FROM medical_content WHERE id = $1', [id]);
    if (existing.rowCount === 0) return null;
    const prev = existing.rows[0];

    if (!viewer.isAdmin && prev.author_id !== viewer.userId) {
      return { error: 'forbidden' };
    }

    let nextStatus = data.status || prev.status;
    if (prev.status === 'published' && !viewer.isAdmin) {
      nextStatus = 'pending';
    }

    const versionEntry = this.buildVersionEntry(
      prev,
      viewer.userId,
      data.userName || viewer.userName,
      data.changeNote
    );
    await this.appendVersionHistory('medical_content', id, versionEntry);

    const result = await pool.query(
      `UPDATE medical_content SET
        title_thai = COALESCE($2, title_thai),
        title_english = COALESCE($3, title_english),
        content_thai = COALESCE($4, content_thai),
        content_english = COALESCE($5, content_english),
        summary_thai = COALESCE($6, summary_thai),
        summary_english = COALESCE($7, summary_english),
        category = COALESCE($8, category),
        content_type = COALESCE($9, content_type),
        tags = COALESCE($10, tags),
        status = $11,
        image_url = COALESCE($12, image_url),
        video_url = COALESCE($13, video_url),
        is_featured = COALESCE($14, is_featured),
        submitted_at = CASE WHEN $11 = 'pending' AND status != 'pending' THEN NOW() ELSE submitted_at END,
        updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        id,
        data.titleThai || data.title_thai || data.title,
        data.titleEnglish || data.title_english,
        data.contentThai || data.content_thai || data.content,
        data.contentEnglish || data.content_english,
        data.summaryTh || data.summary_thai,
        data.summaryEnglish || data.summary_english,
        data.category,
        data.type || data.content_type,
        data.tags ? JSON.stringify(data.tags) : null,
        nextStatus,
        data.thumbnail || data.imageUrl || data.image_url,
        data.videoUrl || data.video_url,
        data.isFeatured !== undefined ? data.isFeatured : (data.is_featured !== undefined ? data.is_featured : null),
      ]
    );

    const row = result.rows[0];
    if (row) {
      await this.logContentAudit({
        userId: viewer.userId,
        action: 'update',
        entityType: 'medical_content',
        entityId: id,
        details: { status: row.status, changeNote: data.changeNote },
        performedBy: viewer.userId,
      });
    }
    return row;
  },

  /**
   * Review medical content (admin only)
   */
  async reviewMedicalContent(contentId, { action, userId, userName, comment, rejectionReason }) {
    const newStatus = action === 'approve' ? 'published' : 'rejected';
    const result = await pool.query(
      `UPDATE medical_content SET
        status = $2::varchar,
        approved_by = $3,
        approved_at = CASE WHEN $2::varchar = 'published' THEN NOW() ELSE NULL END,
        published_at = CASE WHEN $2::varchar = 'published' THEN NOW() ELSE NULL END,
        rejection_reason = CASE WHEN $2::varchar = 'rejected' THEN $4 ELSE NULL END,
        updated_at = NOW()
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [contentId, newStatus, userId, rejectionReason || comment || null]
    );
    const row = result.rows[0];
    if (!row) return null;

    if (comment) {
      try {
        await this.addComment('medical_content', contentId, {
          authorId: userId,
          authorName: userName,
          authorRole: 'admin',
          content: comment,
          isAdminFeedback: true,
        });
      } catch (err) {
        console.warn('[Content] addComment failed (medical):', err.message);
      }
    }

    await this.logContentAudit({
      userId,
      action: action === 'approve' ? 'approve' : 'reject',
      entityType: 'medical_content',
      entityId: contentId,
      details: { status: newStatus, rejectionReason, comment },
      performedBy: userId,
    });

    const updated = await pool.query('SELECT * FROM medical_content WHERE id = $1', [contentId]);
    return updated.rows[0];
  },

  /**
   * Update content status (approve/reject) — legacy wrapper
   */
  async updateContentStatus(contentId, status, approvedBy) {
    const action = status === 'published' ? 'approve' : 'reject';
    return this.reviewMedicalContent(contentId, { action, userId: approvedBy, userName: 'Admin' });
  },

  /**
   * Get content history
   */
  async getContentHistory(id, table = 'medical_content') {
    const result = await pool.query(`SELECT history, version FROM ${table} WHERE id = $1`, [id]);
    if (!result.rows[0]) return null;
    return {
      version: result.rows[0].version || 1,
      history: parseJsonField(result.rows[0].history, []),
    };
  },

  /**
   * Create clinical resource
   */
  async createClinicalResource(data, authorId, authorName) {
    const status = data.status === 'draft' ? 'draft' : (data.status === 'pending' ? 'pending' : 'draft');
    const result = await pool.query(
      `INSERT INTO clinical_resources (
        id, title_english, title_thai, content_english, content_thai,
        description_thai, description_english, category, specialty, guideline_year,
        source, resource_type, tags, status, author_id, author_name, image_url, submitted_at
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::varchar, $15, $16, $17,
         CASE WHEN $14::varchar = 'pending' THEN NOW() ELSE NULL END)
       RETURNING *`,
      [
        `CR-${Date.now()}`,
        data.title || data.titleEnglish || '',
        data.titleThai || data.titleTh || '',
        data.content || data.contentEnglish || data.description || '',
        data.contentThai || data.contentTh || data.descriptionTh || '',
        data.descriptionTh || data.descriptionThai || null,
        data.description || data.descriptionEnglish || null,
        data.category || 'treatment',
        data.specialty || 'General',
        data.guidelineYear || new Date().getFullYear(),
        data.source || '',
        data.resourceType || 'guideline',
        JSON.stringify(data.tags || []),
        status,
        authorId,
        authorName,
        data.imageUrl || data.image_url || null,
      ]
    );
    const row = result.rows[0];
    if (row) {
      await this.logContentAudit({
        userId: authorId,
        action: 'create',
        entityType: 'clinical_resource',
        entityId: row.id,
        details: { status: row.status },
        performedBy: authorId,
      });
    }
    return row;
  },

  /**
   * Update clinical resource
   */
  async updateClinicalResource(id, data, viewer = {}) {
    const existing = await pool.query('SELECT * FROM clinical_resources WHERE id = $1', [id]);
    if (existing.rowCount === 0) return null;
    const prev = existing.rows[0];

    if (!viewer.isAdmin && prev.author_id !== viewer.userId) {
      return { error: 'forbidden' };
    }

    let nextStatus = data.status || prev.status;
    if ((prev.status === 'published' || prev.status === 'approved') && !viewer.isAdmin && !data.status) {
      nextStatus = 'pending';
    }

    const versionEntry = this.buildVersionEntry(
      { ...prev, title_thai: prev.title_thai, content_thai: prev.content_thai, summary_thai: prev.description_thai },
      viewer.userId,
      data.userName,
      data.changeNote
    );
    await this.appendVersionHistory('clinical_resources', id, versionEntry);

    const result = await pool.query(
      `UPDATE clinical_resources SET
        title_english = COALESCE($2, title_english),
        title_thai = COALESCE($3, title_thai),
        content_english = COALESCE($4, content_english),
        content_thai = COALESCE($5, content_thai),
        description_thai = COALESCE($6, description_thai),
        description_english = COALESCE($7, description_english),
        category = COALESCE($8, category),
        specialty = COALESCE($9, specialty),
        resource_type = COALESCE($10, resource_type),
        tags = COALESCE($11, tags),
        status = $12::varchar,
        source = COALESCE($13, source),
        guideline_year = COALESCE($14, guideline_year),
        image_url = COALESCE($15, image_url),
        submitted_at = CASE WHEN $12::varchar = 'pending' AND status NOT IN ('pending') THEN NOW() ELSE submitted_at END,
        updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        id,
        data.title || data.titleEnglish,
        data.titleThai || data.titleTh,
        data.content || data.contentEnglish,
        data.contentThai || data.contentTh,
        data.descriptionTh || data.descriptionThai,
        data.description || data.descriptionEnglish,
        data.category,
        data.specialty,
        data.resourceType,
        data.tags ? JSON.stringify(data.tags) : null,
        nextStatus,
        data.source,
        data.guidelineYear,
        data.imageUrl || data.image_url,
      ]
    );

    const row = result.rows[0];
    if (row) {
      await this.logContentAudit({
        userId: viewer.userId,
        action: 'update',
        entityType: 'clinical_resource',
        entityId: id,
        details: { status: row.status },
        performedBy: viewer.userId,
      });
    }
    return row;
  },

  /**
   * Review clinical resource (admin only)
   */
  async reviewClinicalResource(resourceId, { action, userId, userName, comment, rejectionReason }) {
    const newStatus = action === 'approve' ? 'published' : 'rejected';
    const result = await pool.query(
      `UPDATE clinical_resources SET
        status = $2::varchar,
        approved_by = $3,
        approved_at = CASE WHEN $2::varchar = 'published' THEN NOW() ELSE NULL END,
        published_at = CASE WHEN $2::varchar = 'published' THEN NOW() ELSE NULL END,
        rejection_reason = CASE WHEN $2::varchar = 'rejected' THEN $4 ELSE NULL END,
        updated_at = NOW()
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [resourceId, newStatus, userId, rejectionReason || comment || null]
    );
    const row = result.rows[0];
    if (!row) return null;

    if (comment) {
      try {
        await this.addComment('clinical_resources', resourceId, {
          authorId: userId,
          authorName: userName,
          authorRole: 'admin',
          content: comment,
          isAdminFeedback: true,
        });
      } catch (err) {
        console.warn('[Content] addComment failed (clinical):', err.message);
      }
    }

    if (newStatus === 'published') {
      try {
        await indexClinicalResource(pool, row);
      } catch (err) {
        console.warn('[RAG] Failed to index clinical resource:', err.message);
      }
    } else {
      await deactivateClinicalResource(pool, resourceId);
    }

    await this.logContentAudit({
      userId,
      action: action === 'approve' ? 'approve' : 'reject',
      entityType: 'clinical_resource',
      entityId: resourceId,
      details: { status: newStatus, rejectionReason, comment },
      performedBy: userId,
    });

    const updated = await pool.query('SELECT * FROM clinical_resources WHERE id = $1', [resourceId]);
    return updated.rows[0];
  },

  async getClinicalResourceById(id, viewer = {}) {
    const result = await pool.query(
      `SELECT cr.*, u.name as author_name_joined
       FROM clinical_resources cr
       LEFT JOIN users u ON cr.author_id = u.id
       WHERE cr.id = $1`,
      [id]
    );
    const row = result.rows[0];
    if (!row) return null;
    row.author_name = row.author_name || row.author_name_joined;

    const role = (viewer.role || '').toLowerCase();
    const status = row.status === 'approved' ? 'published' : row.status;
    if (status === 'published' || status === 'approved') return row;
    if (viewer.isAdmin || role === 'admin') return row;
    if (viewer.userId && row.author_id === viewer.userId) return row;
    return null;
  },

  async archiveClinicalResource(id, viewer = {}) {
    const existing = await pool.query('SELECT author_id FROM clinical_resources WHERE id = $1', [id]);
    if (existing.rowCount === 0) return null;
    if (!viewer.isAdmin && existing.rows[0].author_id !== viewer.userId) {
      return { error: 'forbidden' };
    }
    const result = await pool.query(
      `UPDATE clinical_resources SET status = 'archived', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );
    await deactivateClinicalResource(pool, id);
    await this.logContentAudit({
      userId: viewer.userId,
      action: 'archive',
      entityType: 'clinical_resource',
      entityId: id,
      performedBy: viewer.userId,
    });
    return result.rows[0];
  },

  /**
   * Get clinical resources (legacy — prefer getClinicalResourcesForRole)
   */
  async getClinicalResources(status) {
    let query = `
      SELECT cr.*, u.name as author_name_joined
      FROM clinical_resources cr
      LEFT JOIN users u ON cr.author_id = u.id
    `;
    const params = [];

    if (status) {
      query += ' WHERE cr.status = $1';
      params.push(status);
    }

    query += ' ORDER BY cr.updated_at DESC';

    const result = await pool.query(query, params);
    // Merge author_name from join if column doesn't exist
    return result.rows.map(r => ({
      ...r,
      author_name: r.author_name || r.author_name_joined
    }));
  },

  /**
   * Role-aware clinical resources list
   */
  async getClinicalResourcesForRole(opts = {}) {
    const { whereClause, params } = buildClinicalResourceVisibilityQuery(opts);
    const query = `
      SELECT cr.*, u.name as author_name_joined
      FROM clinical_resources cr
      LEFT JOIN users u ON cr.author_id = u.id
      WHERE ${whereClause}
      ORDER BY cr.updated_at DESC`;
    const result = await pool.query(query, params);
    return result.rows.map(r => ({
      ...r,
      author_name: r.author_name || r.author_name_joined
    }));
  },

  /**
   * Get pending content count (for admin badge)
   */
  async getPendingContentCount() {
    const result = await pool.query(
      `SELECT 
        (SELECT COUNT(*) FROM medical_content WHERE status = 'pending') as content_count,
        (SELECT COUNT(*) FROM clinical_resources WHERE status = 'pending') as resource_count`
    );
    const row = result.rows[0];
    return {
      content: Number.parseInt(row.content_count, 10),
      resources: Number.parseInt(row.resource_count, 10),
      total: Number.parseInt(row.content_count, 10) + Number.parseInt(row.resource_count, 10)
    };
  },
};

// ============================================================================
// CONSULTANT SERVICE
// ============================================================================

const ConsultantService = {
  /**
   * Get all consultants
   */
  async getAllConsultants() {
    const result = await pool.query(
      'SELECT * FROM consultants ORDER BY name'
    );
    return result.rows;
  },

  /**
   * Get available consultants
   */
  async getAvailableConsultants(specialty) {
    let query = 'SELECT * FROM consultants WHERE is_available = true';
    const params = [];

    if (specialty) {
      query += ' AND specialty ILIKE $1';
      params.push(`%${specialty}%`);
    }

    query += ' ORDER BY name';

    const result = await pool.query(query, params);
    return result.rows;
  },

  /**
   * Create consultant
   */
  async createConsultant(data) {
    const result = await pool.query(
      `INSERT INTO consultants (
        id, name, specialty, hospital, email, phone,
        languages, experience_years, bio, is_available, created_by
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, $10)
       RETURNING *`,
      [
        `CONS-${Date.now()}`,
        data.name,
        data.specialty,
        data.hospital,
        data.email,
        data.phone,
        JSON.stringify(data.languages || ['Thai']),
        data.experience_years,
        data.bio,
        data.created_by
      ]
    );
    return result.rows[0];
  },

  /**
   * Toggle consultant availability
   */
  async toggleAvailability(consultantId) {
    const result = await pool.query(
      `UPDATE consultants SET
        is_available = NOT is_available,
        updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [consultantId]
    );
    return result.rows[0];
  },
};

// ============================================================================
// MEETING RECORDS SERVICE
// ============================================================================

const MeetingService = {
  /**
   * Get meeting record by appointment
   */
  async getMeetingByAppointment(appointmentId) {
    const result = await pool.query(
      'SELECT * FROM meeting_records WHERE appointment_id = $1 ORDER BY created_at DESC LIMIT 1',
      [appointmentId]
    );
    return result.rows[0] || null;
  },

  /**
   * Get meeting by ID
   */
  async getMeetingById(meetingId) {
    const result = await pool.query(
      'SELECT * FROM meeting_records WHERE id = $1',
      [meetingId]
    );
    return result.rows[0] || null;
  },

  /**
   * Get active meeting for an appointment (not ended)
   */
  async getActiveMeeting(appointmentId) {
    const result = await pool.query(
      `SELECT * FROM meeting_records 
       WHERE appointment_id = $1 AND status != 'completed' AND status != 'ended'
       ORDER BY created_at DESC LIMIT 1`,
      [appointmentId]
    );
    return result.rows[0] || null;
  },

  /**
   * Create meeting record with full details
   */
  async createMeeting(data) {
    const result = await pool.query(
      `INSERT INTO meeting_records (
        appointment_id, doctor_id, patient_id, room_id, room_name,
        meeting_url, doctor_url, patient_url, guest_url,
        status, meeting_config, created_at
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
       RETURNING *`,
      [
        data.appointment_id,
        data.doctor_id,
        data.patient_id,
        data.room_id,
        data.room_name || data.room_id,
        data.meeting_url,
        data.doctor_url,
        data.patient_url,
        data.guest_url,
        data.status || 'waiting',
        JSON.stringify(data.config || {})
      ]
    );
    return result.rows[0];
  },

  /**
   * Start meeting (update status to active)
   */
  async startMeeting(meetingId) {
    const result = await pool.query(
      `UPDATE meeting_records SET
        status = 'active',
        started_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [meetingId]
    );
    return result.rows[0];
  },

  /**
   * Add participant joined event (stored in config as array)
   */
  async addParticipant(meetingId, participant) {
    const meeting = await this.getMeetingById(meetingId);
    if (!meeting) return null;

    const config = meeting.meeting_config || {};
    config.participants = config.participants || [];
    config.participants.push({
      ...participant,
      joinedAt: new Date().toISOString()
    });

    const result = await pool.query(
      `UPDATE meeting_records SET meeting_config = $2 WHERE id = $1 RETURNING *`,
      [meetingId, JSON.stringify(config)]
    );
    return result.rows[0];
  },

  /**
   * Save transcript to meeting record
   */
  async saveTranscript(meetingId, transcript) {
    const result = await pool.query(
      `UPDATE meeting_records SET
        transcript = $2
       WHERE id = $1
       RETURNING *`,
      [meetingId, typeof transcript === 'string' ? transcript : JSON.stringify(transcript)]
    );
    return result.rows[0];
  },

  /**
   * End meeting with summary and recommendations
   */
  async endMeeting(meetingId, data) {
    let transcriptValue = null;
    if (data.transcript) {
      transcriptValue = typeof data.transcript === 'string'
        ? data.transcript
        : JSON.stringify(data.transcript);
    }

    let summaryValue = null;
    if (data.ai_summary) {
      summaryValue = typeof data.ai_summary === 'string'
        ? data.ai_summary
        : JSON.stringify(data.ai_summary);
    }

    let recommendationsValue = null;
    if (data.ai_recommendations) {
      recommendationsValue = typeof data.ai_recommendations === 'string'
        ? data.ai_recommendations
        : JSON.stringify(data.ai_recommendations);
    }

    const result = await pool.query(
      `UPDATE meeting_records SET
        status = 'completed',
        ended_at = NOW(),
        duration_minutes = CASE 
          WHEN started_at IS NOT NULL THEN EXTRACT(EPOCH FROM (NOW() - started_at)) / 60
          ELSE $2
        END,
        transcript = COALESCE($3, transcript),
        ai_summary = $4,
        ai_recommendations = $5,
        recording_url = COALESCE($6, recording_url)
       WHERE id = $1
       RETURNING *`,
      [
        meetingId,
        data.duration_minutes || 0,
        transcriptValue,
        summaryValue,
        recommendationsValue,
        data.recording_url
      ]
    );
    return result.rows[0];
  },

  /**
   * Get all meetings for a doctor with history
   */
  async getMeetingsByDoctor(doctorId, limit = 50) {
    const result = await pool.query(
      `SELECT mr.*, 
              COALESCE(a.confirmed_date, a.requested_date, a.appointment_date) as scheduled_date, 
              COALESCE(a.confirmed_time, a.requested_time, a.appointment_time) as scheduled_time, 
              p.name as patient_name, p.name_thai as patient_name_thai
       FROM meeting_records mr
       LEFT JOIN appointments a ON mr.appointment_id = a.id
       LEFT JOIN users p ON a.patient_id = p.id
       WHERE mr.doctor_id = $1
       ORDER BY mr.created_at DESC
       LIMIT $2`,
      [doctorId, limit]
    );
    return result.rows;
  },

  /**
   * Get completed meetings with summaries (for meeting history display)
   */
  async getCompletedMeetings(doctorId, limit = 20) {
    const result = await pool.query(
      `SELECT mr.*, 
              COALESCE(a.confirmed_date, a.requested_date, a.appointment_date) as scheduled_date, 
              COALESCE(a.confirmed_time, a.requested_time, a.appointment_time) as scheduled_time,
              p.name as patient_name, p.name_thai as patient_name_thai,
              a.symptoms, a.reason
       FROM meeting_records mr
       LEFT JOIN appointments a ON mr.appointment_id = a.id
       LEFT JOIN users p ON a.patient_id = p.id
       WHERE mr.doctor_id = $1 AND mr.status = 'completed'
       ORDER BY mr.ended_at DESC
       LIMIT $2`,
      [doctorId, limit]
    );
    return result.rows;
  },
};

// ============================================================================
// NOTIFICATION SERVICE
// ============================================================================

function normalizeNotificationRow(row) {
  let data = row.data;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      data = {};
    }
  }
  const payload = data && typeof data === 'object' ? data : {};
  const appointmentId = payload.appointmentId ?? payload.appointment_id;
  const createdAt = row.created_at ?? row.createdAt ?? null;
  const readAt = row.read_at ?? row.readAt ?? null;
  return {
    ...row,
    data: payload,
    ...(createdAt ? { createdAt } : {}),
    isRead: Boolean(readAt),
    ...(appointmentId ? { appointmentId } : {}),
  };
}

const NotificationService = {
  /**
   * Get user notifications
   */
  async getUserNotifications(userId, unreadOnly = false) {
    let query = 'SELECT * FROM notifications WHERE user_id = $1';
    if (unreadOnly) {
      query += ' AND read_at IS NULL';
    }
    query += ' ORDER BY created_at DESC LIMIT 50';

    const result = await pool.query(query, [userId]);
    return result.rows.map(normalizeNotificationRow);
  },

  /**
   * Create notification
   */
  async createNotification(data) {
    const result = await pool.query(
      `INSERT INTO notifications (
        id, user_id, type, title, title_thai, message, message_thai, data
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        crypto.randomUUID(),
        data.user_id,
        data.type,
        data.title,
        data.title_thai,
        data.message,
        data.message_thai,
        JSON.stringify(data.data || {})
      ]
    );
    return result.rows[0];
  },

  /**
   * Mark as read
   */
  async markAsRead(notificationId) {
    await pool.query(
      'UPDATE notifications SET read_at = NOW() WHERE id = $1',
      [notificationId]
    );
  },

  /**
   * Mark all as read
   */
  async markAllAsRead(userId) {
    await pool.query(
      'UPDATE notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL',
      [userId]
    );
  },

  /**
   * Get unread count
   */
  async getUnreadCount(userId) {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read_at IS NULL',
      [userId]
    );
    return Number.parseInt(result.rows[0].count, 10);
  },
};

// ============================================================================
// METADATA SERVICE
// ============================================================================

const MetadataService = {
  /**
   * Get drugs
   */
  async getDrugs(search) {
    let query = 'SELECT * FROM drugs';
    const params = [];

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
  async getICD10Codes(search) {
    let query = 'SELECT * FROM icd10_codes';
    const params = [];

    if (search) {
      query += ' WHERE code ILIKE $1 OR description ILIKE $1 OR description_thai ILIKE $1';
      params.push(`%${search}%`);
    }

    query += ' ORDER BY code LIMIT 100';

    const result = await pool.query(query, params);
    return result.rows;
  },

  /**
   * Get specialties
   */
  async getSpecialties() {
    const result = await pool.query(
      `SELECT DISTINCT specialty FROM doctor_profiles 
       WHERE specialty IS NOT NULL 
       ORDER BY specialty`
    );
    return result.rows.map(r => r.specialty);
  },
};

// ============================================================================
// ADMIN SERVICE - User Role & Privilege Management
// ============================================================================

const AdminService = {
  /**
   * Get all users with optional filters
   */
  async getAllUsers(filters = {}) {
    const { role, status, search } = filters;
    let query = 'SELECT * FROM users WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (role) {
      paramCount++;
      query += ` AND role = $${paramCount}`;
      params.push(role);
    }

    if (status) {
      if (status === 'active') {
        query += ' AND is_active = true';
      } else if (status === 'inactive') {
        query += ' AND is_active = false';
      } else {
        paramCount++;
        query += ` AND approval_status = $${paramCount}`;
        params.push(status);
      }
    }

    if (search) {
      paramCount++;
      query += ` AND (LOWER(name) LIKE $${paramCount} OR LOWER(email) LIKE $${paramCount})`;
      params.push(`%${search.toLowerCase()}%`);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    return result.rows;
  },

  /**
   * Update user role (doctor ↔ admin)
   */
  async updateUserRole(userId, newRole, adminId) {
    const result = await pool.query(
      `UPDATE users 
       SET role = $1, 
           is_admin = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [newRole, newRole === 'admin', userId]
    );

    if (result.rows.length === 0) return null;

    // Log the role change (non-blocking, table may not exist)
    try {
      await pool.query(
        `INSERT INTO audit_logs (id, user_id, action, details, performed_by, created_at)
         VALUES ($1, $2, 'role_update', $3, $4, NOW())
         ON CONFLICT DO NOTHING`,
        [
          require('node:crypto').randomUUID(),
          userId,
          JSON.stringify({ newRole, previousRole: result.rows[0].role }),
          adminId
        ]
      );
    } catch (error_) {
      console.warn('⚠️ Audit log failed (table may not exist):', error_.message);
    }

    return result.rows[0];
  },

  /**
   * Get user privileges
   */
  async getUserPrivileges(userId) {
    const result = await pool.query(
      'SELECT admin_privileges, is_admin, role FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) return null;

    const user = result.rows[0];
    const getDoctorLevel = () => user.role === 'doctor' ? 'doctor' : 'none';
    return user.admin_privileges || {
      canManageDoctors: user.is_admin || false,
      canManagePatients: user.is_admin || false,
      canManageContent: user.is_admin || false,
      canViewReports: user.is_admin || false,
      canManageSettings: user.is_admin || false,
      level: user.is_admin ? 'admin' : getDoctorLevel()
    };
  },

  /**
   * Update user privileges
   */
  async updateUserPrivileges(userId, privileges, adminId) {
    const result = await pool.query(
      `UPDATE users 
       SET admin_privileges = admin_privileges || $1::jsonb,
           updated_at = NOW()
       WHERE id = $2
       RETURNING admin_privileges`,
      [JSON.stringify(privileges), userId]
    );

    return result.rows[0]?.admin_privileges || privileges;
  },

  /**
   * Get pending doctor registrations
   */
  async getPendingDoctors() {
    const result = await pool.query(
      `SELECT u.*, dp.*
       FROM users u
       LEFT JOIN doctor_profiles dp ON dp.doctor_id = u.id
       WHERE u.role = 'doctor' AND u.approval_status = 'pending'
       ORDER BY u.created_at DESC`
    );
    return result.rows;
  },

  /**
   * Approve doctor registration
   */
  async approveDoctor(doctorId, adminId) {
    const result = await pool.query(
      `UPDATE users 
       SET approval_status = 'approved',
           is_approved = true,
           is_active = true,
           approved_by = $2,
           approved_at = NOW(),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [doctorId, adminId || 'admin']
    );

    // Also mark the doctor as available in the doctors table
    await pool.query(
      `UPDATE doctors SET is_available = true, updated_at = NOW() WHERE id = $1`,
      [doctorId]
    );

    return result.rows[0] || null;
  },

  /**
   * Reject doctor registration
   */
  async rejectDoctor(doctorId, adminId, reason) {
    const result = await pool.query(
      `UPDATE users 
       SET approval_status = 'rejected',
           is_approved = false,
           is_active = false,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [doctorId]
    );

    return result.rows[0] || null;
  },

  /**
   * Get pending medical content
   */
  async getPendingContent() {
    const result = await pool.query(
      `SELECT * FROM medical_content 
       WHERE status = 'pending'
       ORDER BY created_at DESC`
    );
    return result.rows;
  },

  /**
   * Approve medical content
   */
  async approveContent(contentId, adminId) {
    const result = await pool.query(
      `UPDATE medical_content 
       SET status = 'published',
           published_at = NOW(),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [contentId]
    );
    return result.rows[0] || null;
  },

  /**
   * Reject medical content
   */
  async rejectContent(contentId, adminId, reason) {
    const result = await pool.query(
      `UPDATE medical_content 
       SET status = 'rejected',
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [contentId]
    );
    return result.rows[0] || null;
  },

  /**
   * Get pending clinical resources
   */
  async getPendingClinicalResources() {
    const result = await pool.query(
      `SELECT * FROM clinical_resources 
       WHERE status = 'pending'
       ORDER BY created_at DESC`
    );
    return result.rows;
  },

  /**
   * Approve clinical resource
   */
  async approveClinicalResource(resourceId, adminId) {
    const result = await pool.query(
      `UPDATE clinical_resources 
       SET status = 'published',
           approved_by = $2,
           approved_at = NOW(),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [resourceId, adminId]
    );
    return result.rows[0] || null;
  },

  /**
   * Get admin dashboard stats
   */
  async getAdminStats() {
    const [pendingDoctors, pendingContent, pendingResources, totalUsers] = await Promise.all([
      pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'doctor' AND approval_status = 'pending'"),
      pool.query("SELECT COUNT(*) as count FROM medical_content WHERE status = 'pending'"),
      pool.query("SELECT COUNT(*) as count FROM clinical_resources WHERE status = 'pending'"),
      pool.query("SELECT role, COUNT(*) as count FROM users GROUP BY role")
    ]);

    return {
      pendingDoctors: Number.parseInt(pendingDoctors.rows[0]?.count || 0, 10),
      pendingContent: Number.parseInt(pendingContent.rows[0]?.count || 0, 10),
      pendingResources: Number.parseInt(pendingResources.rows[0]?.count || 0, 10),
      usersByRole: totalUsers.rows.reduce((acc, row) => {
        acc[row.role] = Number.parseInt(row.count, 10);
        return acc;
      }, {})
    };
  },
};

// ============================================================================
// IMAGING ORDER SERVICE
// ============================================================================

const ImagingOrderService = {
  /**
   * Get imaging orders by patient
   */
  async getPatientImagingOrders(patientId) {
    const result = await pool.query(
      `SELECT i.*, d.name as doctor_name
       FROM imaging_orders i
       LEFT JOIN users d ON i.doctor_id = d.id
       WHERE i.patient_id = $1
       ORDER BY i.ordered_at DESC`,
      [patientId]
    );
    return result.rows;
  },

  /**
   * Create imaging order
   */
  async createImagingOrder(data) {
    const result = await pool.query(
      `INSERT INTO imaging_orders (
        id, emr_id, appointment_id, patient_id, doctor_id,
        imaging_type, body_part, clinical_indication, priority, notes, status
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'ordered')
       RETURNING *`,
      [
        `IMG-${Date.now()}`,
        data.emr_id || null,
        data.appointment_id || null,
        data.patient_id || null,
        data.doctor_id,
        data.imaging_type || 'X-Ray',
        data.body_part || '',
        data.clinical_indication || '',
        data.priority || 'routine',
        data.notes || ''
      ]
    );
    return result.rows[0];
  },

  /**
   * Update imaging order results with documents
   */
  async updateImagingResults(orderId, results) {
    const result = await pool.query(
      `UPDATE imaging_orders SET
        results = $2,
        status = 'completed',
        completed_at = NOW(),
        updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [orderId, JSON.stringify(results)]
    );
    return result.rows[0];
  },
};

// Export all services
module.exports = {
  pool,
  usePostgres,
  AuthService,
  PatientService,
  AppointmentService,
  EMRService,
  PrescriptionService,
  LabOrderService,
  ImagingOrderService,
  ContentService,
  ConsultantService,
  MeetingService,
  NotificationService,
  MetadataService,
  AdminService,
};
