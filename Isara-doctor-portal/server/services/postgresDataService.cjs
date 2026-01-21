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

const pool = new Pool({
  host: dbConfig.host || process.env.DB_HOST || 'localhost',
  port: dbConfig.port || Number.parseInt(process.env.DB_PORT || '5432', 10),
  database: dbConfig.database || process.env.DB_NAME || 'izara_phase1',
  user: dbConfig.user || process.env.DB_USER || 'postgres',
  password: dbConfig.password || process.env.DB_PASSWORD || 'P@ssw0rd',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Handle pool errors to prevent process exit
pool.on('error', (err) => {
  console.error('❌ PostgreSQL pool error:', err.message);
});

// Test connection on init
pool.query('SELECT NOW()')
  .then(() => console.log('✅ PostgreSQL connected successfully (Doctor Portal)'))
  .catch(err => console.error('❌ PostgreSQL connection error:', err.message));

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
       ORDER BY recorded_at DESC 
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
        `SELECT id, 'emr' as type, consultation_date as event_date,
                chief_complaint as description, status
         FROM emr WHERE patient_id = $1
         ORDER BY consultation_date DESC LIMIT 20`,
        [patientId]
      ),
      pool.query(
        `SELECT id, 'vitals' as type, recorded_at as event_date,
                'Vital signs recorded' as description, 'completed' as status
         FROM vital_signs WHERE patient_id = $1
         ORDER BY recorded_at DESC LIMIT 20`,
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
    let query = `
      SELECT a.*, 
             u.name as patient_name, u.name_thai as patient_name_thai,
             u.email as patient_email, u.phone as patient_phone
      FROM appointments a
      JOIN users u ON a.patient_id = u.id
      WHERE a.doctor_id = $1
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
      JOIN users p ON a.patient_id = p.id
      JOIN users d ON a.doctor_id = d.id
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
    const result = await pool.query(
      `SELECT a.*, 
              p.name as patient_name, p.name_thai as patient_name_thai,
              p.email as patient_email, p.phone as patient_phone,
              d.name as doctor_name, d.name_thai as doctor_name_thai,
              dp.specialty as doctor_specialty
       FROM appointments a
       JOIN users p ON a.patient_id = p.id
       JOIN users d ON a.doctor_id = d.id
       LEFT JOIN doctor_profiles dp ON dp.doctor_id = d.id
       WHERE a.id = $1`,
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
    if (data.meeting_link !== undefined) {
      fields.push(`meeting_link = $${paramIndex++}`);
      values.push(data.meeting_link);
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
       WHERE doctor_id = $1 AND status = 'pending'`,
      [doctorId]
    );
    return Number.parseInt(result.rows[0].count, 10);
  },

  /**
   * Create a new appointment
   */
  async createAppointment(data) {
    const appointmentId = data.id || `APT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const result = await pool.query(
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
        data.requestedTime || data.requested_time || data.dateTime?.split('T')[1]?.substring(0,5) || null,
        data.confirmedDate || data.confirmed_date || null,
        data.confirmedTime || data.confirmed_time || null,
        data.appointmentDate || data.appointment_date || data.dateTime?.split('T')[0] || null,
        data.appointmentTime || data.appointment_time || data.dateTime?.split('T')[1]?.substring(0,5) || null,
        data.type || data.appointment_type || 'general',
        data.reason || null,
        data.symptoms || null,
        data.notes || null,
        data.status || 'pending',
        data.meetingLink || data.meeting_link || null
      ]
    );
    return result.rows[0];
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
   * Create lab order
   */
  async createLabOrder(data) {
    const result = await pool.query(
      `INSERT INTO lab_orders (
        id, appointment_id, patient_id, doctor_id, tests,
        notes, priority, ordered_date, status
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), 'ordered')
       RETURNING *`,
      [
        `LAB-${Date.now()}`,
        data.appointment_id,
        data.patient_id,
        data.doctor_id,
        JSON.stringify(data.tests || []),
        data.notes,
        data.priority || 'routine'
      ]
    );
    return result.rows[0];
  },

  /**
   * Update lab order results
   */
  async updateLabResults(labOrderId, results) {
    const result = await pool.query(
      `UPDATE lab_orders SET
        results = $2,
        status = 'completed',
        result_date = NOW(),
        updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [labOrderId, JSON.stringify(results)]
    );
    return result.rows[0];
  },
};

// ============================================================================
// MEDICAL CONTENT SERVICE
// ============================================================================

const ContentService = {
  /**
   * Get all medical content
   */
  async getAllContent(status) {
    let query = `
      SELECT mc.*, u.name as author_name
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
   * Create content
   */
  async createContent(data) {
    const result = await pool.query(
      `INSERT INTO medical_content (
        id, title, title_thai, content, content_thai,
        category, tags, author_id, status
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        `MC-${Date.now()}`,
        data.title,
        data.title_thai,
        data.content,
        data.content_thai,
        data.category,
        JSON.stringify(data.tags || []),
        data.author_id,
        data.status || 'draft'
      ]
    );
    return result.rows[0];
  },

  /**
   * Update content status (approve/reject)
   */
  async updateContentStatus(contentId, status, approvedBy) {
    const result = await pool.query(
      `UPDATE medical_content SET
        status = $2,
        approved_by = $3,
        approved_at = CASE WHEN $2 = 'published' THEN NOW() ELSE NULL END,
        published_at = CASE WHEN $2 = 'published' THEN NOW() ELSE NULL END,
        updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [contentId, status, approvedBy]
    );
    return result.rows[0];
  },

  /**
   * Get clinical resources
   */
  async getClinicalResources(status) {
    let query = 'SELECT * FROM clinical_resources';
    const params = [];

    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }

    query += ' ORDER BY updated_at DESC';

    const result = await pool.query(query, params);
    return result.rows;
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
        data.transcript ? (typeof data.transcript === 'string' ? data.transcript : JSON.stringify(data.transcript)) : null,
        data.ai_summary ? (typeof data.ai_summary === 'string' ? data.ai_summary : JSON.stringify(data.ai_summary)) : null,
        data.ai_recommendations ? (typeof data.ai_recommendations === 'string' ? data.ai_recommendations : JSON.stringify(data.ai_recommendations)) : null,
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
    return result.rows;
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
      paramCount++;
      query += ` AND (approval_status = $${paramCount} OR (is_active = ($${paramCount} = 'active')))`;
      params.push(status);
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
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
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
  ContentService,
  ConsultantService,
  MeetingService,
  NotificationService,
  MetadataService,
  AdminService,
};
