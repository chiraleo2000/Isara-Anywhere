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
}

const poolConfig: PoolConfig = {
  database: dbConfig.database || process.env.DB_NAME || 'izara_phase1',
  user: dbConfig.user || process.env.DB_USER || 'postgres',
  password: dbConfig.password || process.env.DB_PASSWORD || '',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  host: dbHost,
  port: dbConfig.port || Number.parseInt(process.env.DB_PORT || '5433', 10),
};

console.log(`🔌 Using PostgreSQL TCP connection: ${dbHost}:${poolConfig.port}`);

const pool = new Pool(poolConfig);

// Test connection on init
try {
  await pool.query('SELECT NOW()');
  console.log('✅ PostgreSQL connected successfully');
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
          emergency_contacts = COALESCE($5::jsonb, emergency_contacts),
          lifestyle = COALESCE($6::jsonb, lifestyle),
          demographics = COALESCE($7::jsonb, demographics),
          updated_at = NOW()
         WHERE patient_id = $1
         RETURNING *`,
        [
          patientId,
          data.allergies !== undefined ? JSON.stringify(data.allergies) : null,
          data.chronic_conditions !== undefined ? JSON.stringify(data.chronic_conditions) : null,
          data.medications !== undefined ? JSON.stringify(data.medications) : null,
          data.emergency_contacts !== undefined ? JSON.stringify(data.emergency_contacts) : null,
          data.lifestyle !== undefined ? JSON.stringify(data.lifestyle) : null,
          data.demographics !== undefined ? JSON.stringify(data.demographics) : null
        ]
      );
      return result.rows[0];
    } else {
      const result = await pool.query(
        `INSERT INTO phr (id, patient_id, allergies, chronic_conditions, medications, emergency_contacts, lifestyle, demographics)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          `phr_${patientId}`,
          patientId,
          JSON.stringify(data.allergies || []),
          JSON.stringify(data.chronic_conditions || []),
          JSON.stringify(data.medications || []),
          JSON.stringify(data.emergency_contacts || []),
          JSON.stringify(data.lifestyle || {}),
          JSON.stringify(data.demographics || {})
        ]
      );
      return result.rows[0];
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
          treatment_preferences = COALESCE($3, treatment_preferences),
          representatives = COALESCE($4, representatives),
          is_shared_with_doctors = COALESCE($5, is_shared_with_doctors),
          signatures = COALESCE($6, signatures),
          updated_at = NOW()
         WHERE patient_id = $1
         RETURNING *`,
        [
          patientId,
          data.statement,
          JSON.stringify(data.treatment_preferences),
          JSON.stringify(data.representatives),
          data.is_shared_with_doctors,
          JSON.stringify(data.signatures)
        ]
      );
      return result.rows[0];
    } else {
      const result = await pool.query(
        `INSERT INTO living_wills (
          id, patient_id, statement, treatment_preferences, representatives,
          is_shared_with_doctors, signatures, status
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
         RETURNING *`,
        [
          `lw_${patientId}`,
          patientId,
          data.statement,
          JSON.stringify(data.treatment_preferences || {}),
          JSON.stringify(data.representatives || []),
          data.is_shared_with_doctors || false,
          JSON.stringify(data.signatures || {})
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
        status, meeting_config, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'waiting', $10, NOW(), NOW())
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
  pool,
  usePostgres,
};
