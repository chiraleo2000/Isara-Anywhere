/**
 * Main API Server for Izara Doctor Portal
 * Port: 3009
 *
 * Handles all clinical operations:
 * - Doctor Dashboard
 * - Patient Management
 * - EMR/EHR Operations
 * - E-Prescribing
 * - Lab Orders
 * - Queue Management
 * - Appointments
 * - Clinical AI
 *
 * Connects to GCS via the GCS API Server (port 3012)
 */

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

// Load environment variables from .env file (for local development only)
// In production (Cloud Run), env vars are already set via --set-env-vars
try {
  const dotenv = require('dotenv');
  dotenv.config();
  console.log('[ENV] Loaded .env file for local development');
} catch (e) {
  console.log('[ENV] dotenv not available - using process.env from Cloud Run');
}

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3009;

// ============================================================================
// GCS CLIENT CONFIGURATION
// ============================================================================

const GCS_API_URL = process.env.GCS_API_URL || 'http://localhost:3012';

const BUCKETS = {
  credentials: 'izara-users-credentials',
  doctor: 'izara-doctors-data',
  patient: 'izara-patients-data',
  appointments: 'izara-appointments',
  metadata: 'izara-meta-data'
};

// ============================================================================
// MIDDLEWARE
// ============================================================================

app.use(cors({
  origin: ['http://localhost:3010', 'http://127.0.0.1:3010', 'http://0.0.0.0:3010'],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// WEBSOCKET SETUP FOR REAL-TIME UPDATES
// ============================================================================

const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3010', 'http://127.0.0.1:3010', 'http://0.0.0.0:3010'],
    credentials: true
  },
  path: '/ws'
});

io.on('connection', (socket) => {
  console.log(`🔌 WebSocket client connected: ${socket.id}`);

  socket.on('join-doctor-room', (doctorId) => {
    socket.join(`doctor-${doctorId}`);
    console.log(`Doctor ${doctorId} joined their room`);
  });

  socket.on('join-queue-room', (doctorId) => {
    socket.join(`queue-${doctorId}`);
    console.log(`Joined queue room for doctor ${doctorId}`);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 WebSocket client disconnected: ${socket.id}`);
  });
});

// Export io for use in routes
app.set('io', io);

// ============================================================================
// HELPER FUNCTIONS - GCS OPERATIONS
// ============================================================================

/**
 * Fetch JSON data from GCS via GCS API Server
 */
async function fetchFromGCS(bucket, path) {
  try {
    const url = `${GCS_API_URL}/api/storage/read?bucket=${bucket}&path=${encodeURIComponent(path)}`;
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`GCS read failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`❌ Error fetching ${bucket}/${path}:`, error.message);
    return null;
  }
}

/**
 * Write JSON data to GCS via GCS API Server
 */
async function writeToGCS(bucket, path, data) {
  try {
    const url = `${GCS_API_URL}/api/storage/write`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bucket, path, data })
    });

    if (!response.ok) {
      throw new Error(`GCS write failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`❌ Error writing ${bucket}/${path}:`, error.message);
    throw error;
  }
}

/**
 * Write text content to GCS via GCS API Server
 */
async function writeTextToGCS(bucket, path, textContent) {
  try {
    const url = `${GCS_API_URL}/api/storage/write`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        bucket, 
        path, 
        data: { _rawContent: textContent, _contentType: 'text/plain' }
      })
    });

    if (!response.ok) {
      throw new Error(`GCS text write failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`❌ Error writing text ${bucket}/${path}:`, error.message);
    throw error;
  }
}

/**
 * Upload binary file (video/audio) to GCS via GCS API Server
 * @param {string} bucket - Bucket name
 * @param {string} filePath - Path in bucket
 * @param {string} base64Data - Base64 encoded file data
 * @param {string} contentType - MIME type of the file
 * @returns {Promise<{success: boolean, url: string}>}
 */
async function uploadBinaryToGCS(bucket, filePath, base64Data, contentType) {
  try {
    const url = `${GCS_API_URL}/api/storage/upload-base64`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        bucket, 
        path: filePath, 
        base64Data,
        contentType,
        makePublic: false // Medical data should not be public
      })
    });

    if (!response.ok) {
      throw new Error(`GCS binary upload failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`❌ Error uploading binary ${bucket}/${filePath}:`, error.message);
    throw error;
  }
}

/**
 * Verify GCS connection on startup with retry logic
 */
async function verifyGCSConnection(maxRetries = 10, retryDelay = 3000) {
  console.log('\n🔍 Verifying GCS connection...');

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Test connection to GCS API Server
      const healthUrl = `${GCS_API_URL}/api/health`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(healthUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('GCS API Server not responding');
      }

      const health = await response.json();
      console.log('✅ GCS API Server is healthy');
      console.log('   Status:', health.status);
      console.log('   Service Account:', health.serviceAccount ? 'Found' : 'Using default credentials');

      // Test reading from a bucket
      console.log('\n🧪 Testing bucket access...');
      const doctors = await fetchFromGCS(BUCKETS.doctor, 'doctors.json');
      if (doctors !== null) {
        console.log('✅ Successfully read from doctors bucket');
        console.log(`   Found ${Array.isArray(doctors) ? doctors.length : 0} doctors`);
      } else {
        console.log('⚠️  doctors.json not found (will be created on first write)');
      }

      const patients = await fetchFromGCS(BUCKETS.patient, 'patients.json');
      if (patients !== null) {
        console.log('✅ Successfully read from patients bucket');
        console.log(`   Found ${Array.isArray(patients) ? patients.length : 0} patients`);
      } else {
        console.log('⚠️  patients.json not found (will be created on first write)');
      }

      console.log('\n✅ GCS connection verified successfully!\n');
      return true;
    } catch (error) {
      console.log(`⏳ GCS connection attempt ${attempt}/${maxRetries} failed: ${error.message}`);
      if (attempt < maxRetries) {
        console.log(`   Retrying in ${retryDelay/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }
  
  console.error('\n❌ GCS connection failed after all retries');
  console.error('   Make sure the GCS API Server is running: npm run api\n');
  return false;
}

// ============================================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================================

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  // For now, simple validation - in production use JWT verify
  // TODO: Implement proper JWT verification
  req.user = { id: token, role: 'doctor' };
  next();
}

// ============================================================================
// API ROUTES
// ============================================================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Izara Doctor Portal API',
    port: PORT,
    gcsApiServer: GCS_API_URL
  });
});

// ============================================================================
// DOCTOR DASHBOARD
// ============================================================================

app.get('/api/dashboard/:doctorId', authenticateToken, async (req, res) => {
  try {
    const { doctorId } = req.params;

    // Fetch data from GCS
    const [doctor, stats, queue, appointments] = await Promise.all([
      fetchFromGCS(BUCKETS.doctor, `doctors/${doctorId}/profile.json`),
      fetchFromGCS(BUCKETS.doctor, `doctors/${doctorId}/stats.json`),
      fetchFromGCS(BUCKETS.doctor, 'queue/queue.json'),
      fetchFromGCS(BUCKETS.appointments, 'appointments/appointments.json')
    ]);

    // Filter queue for this doctor
    const doctorQueue = queue ? queue.filter(q => q.doctorId === doctorId) : [];

    // Filter today's appointments - check ALL possible doctor ID fields
    const today = new Date().toISOString().split('T')[0];
    const todayAppointments = appointments
      ? appointments.filter(a => {
          const matchesDoctor = a.doctorId === doctorId || 
                                a.assignedDoctorId === doctorId || 
                                a.adminAssignedDoctorId === doctorId;
          const matchesDate = a.date && a.date.startsWith(today);
          return matchesDoctor && matchesDate;
        })
      : [];

    res.json({
      doctor: doctor || { id: doctorId, name: 'Doctor' },
      stats: stats || {
        todayAppointments: todayAppointments.length,
        patientsSeenToday: 0,
        pendingPrescriptions: 0,
        unreadMessages: 0
      },
      queue: doctorQueue,
      todaySchedule: todayAppointments
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// PATIENT MANAGEMENT
// ============================================================================

app.get('/api/patients', authenticateToken, async (req, res) => {
  try {
    const patients = await fetchFromGCS(BUCKETS.patient, 'patients.json') || [];
    res.json({ patients });
  } catch (error) {
    console.error('Patients fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/patients/:patientId', authenticateToken, async (req, res) => {
  try {
    const { patientId } = req.params;
    const patients = await fetchFromGCS(BUCKETS.patient, 'patients.json') || [];
    const patient = patients.find(p => p.id === patientId);

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Fetch additional patient data
    const [phr, consents, timeline] = await Promise.all([
      fetchFromGCS(BUCKETS.patient, `patients/${patientId}/phr.json`),
      fetchFromGCS(BUCKETS.patient, `patients/${patientId}/pdpa/consents.json`),
      fetchFromGCS(BUCKETS.patient, `patients/${patientId}/timeline.json`)
    ]);

    res.json({
      ...patient,
      phr,
      consents,
      timeline: timeline || []
    });
  } catch (error) {
    console.error('Patient fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// EMR OPERATIONS
// ============================================================================

app.post('/api/emr', authenticateToken, async (req, res) => {
  try {
    const emrData = req.body;
    const emrId = `emr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const emr = {
      ...emrData,
      id: emrId,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      status: 'finalized'
    };

    // Fetch all EMRs
    const allEMRs = await fetchFromGCS(BUCKETS.patient, 'emrs.json') || [];
    allEMRs.push(emr);

    // Write back to GCS
    await writeToGCS(BUCKETS.patient, 'emrs.json', allEMRs);

    // Add to patient timeline
    if (emr.patientId) {
      const timeline = await fetchFromGCS(BUCKETS.patient, `patients/${emr.patientId}/timeline.json`) || [];
      timeline.push({
        id: `tl_${Date.now()}`,
        type: 'emr',
        timestamp: new Date().toISOString(),
        data: { emrId, diagnosis: emr.diagnosis }
      });
      await writeToGCS(BUCKETS.patient, `patients/${emr.patientId}/timeline.json`, timeline);
    }

    // Log audit
    await logAuditAccess({
      userId: req.user.id,
      action: 'CREATE_EMR',
      patientId: emr.patientId,
      resourceId: emrId
    });

    res.json({ success: true, emr });
  } catch (error) {
    console.error('EMR creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/emr/patient/:patientId', authenticateToken, async (req, res) => {
  try {
    const { patientId } = req.params;
    const allEMRs = await fetchFromGCS(BUCKETS.patient, 'emrs.json') || [];
    const patientEMRs = allEMRs.filter(e => e.patientId === patientId);

    // Log audit
    await logAuditAccess({
      userId: req.user.id,
      action: 'READ_EMR',
      patientId,
      resourceId: 'all'
    });

    res.json({ emrs: patientEMRs });
  } catch (error) {
    console.error('EMR fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// PATIENT HEALTH LOGS (EMR sent to patient)
// ============================================================================

// POST - Add entry to patient health logs (called when doctor signs EMR)
app.post('/api/patients/:patientId/health-logs', authenticateToken, async (req, res) => {
  try {
    const { patientId } = req.params;
    const healthLogEntry = req.body;
    
    // Validate required fields
    if (!healthLogEntry.id || !healthLogEntry.type) {
      return res.status(400).json({ error: 'Health log entry must have id and type' });
    }
    
    // Read existing health logs
    const healthLogsPath = `patients/${patientId}/health-logs.json`;
    let healthLogs = await fetchFromGCS(BUCKETS.patient, healthLogsPath) || { entries: [], lastUpdated: null };
    
    // Ensure entries array exists
    if (!healthLogs.entries) {
      healthLogs.entries = [];
    }
    
    // Add metadata
    const newEntry = {
      ...healthLogEntry,
      patientId,
      createdAt: healthLogEntry.createdAt || new Date().toISOString(),
      receivedAt: new Date().toISOString(),
    };
    
    // Check if entry already exists (by id)
    const existingIndex = healthLogs.entries.findIndex(e => e.id === newEntry.id);
    if (existingIndex >= 0) {
      healthLogs.entries[existingIndex] = newEntry; // Update existing
    } else {
      healthLogs.entries.push(newEntry); // Add new
    }
    
    healthLogs.lastUpdated = new Date().toISOString();
    
    // Write back to GCS
    await writeToGCS(BUCKETS.patient, healthLogsPath, healthLogs);
    
    // Log audit
    await logAuditAccess({
      userId: req.user?.id || 'system',
      action: 'ADD_HEALTH_LOG',
      patientId,
      resourceId: newEntry.id
    });
    
    console.log(`✅ Health log added for patient ${patientId}: ${newEntry.id}`);
    
    res.status(201).json({ 
      success: true, 
      entry: newEntry,
      message: 'Health log entry added successfully'
    });
  } catch (error) {
    console.error('Add health log error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET - Get patient health logs
app.get('/api/patients/:patientId/health-logs', authenticateToken, async (req, res) => {
  try {
    const { patientId } = req.params;
    const { type, limit, offset } = req.query;
    
    // Read health logs from GCS
    const healthLogsPath = `patients/${patientId}/health-logs.json`;
    let healthLogs = await fetchFromGCS(BUCKETS.patient, healthLogsPath) || { entries: [], lastUpdated: null };
    
    let entries = healthLogs.entries || [];
    
    // Filter by type if specified
    if (type) {
      entries = entries.filter(e => e.type === type);
    }
    
    // Sort by date (newest first)
    entries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Apply pagination
    const offsetNum = parseInt(offset) || 0;
    const limitNum = parseInt(limit) || 50;
    const total = entries.length;
    entries = entries.slice(offsetNum, offsetNum + limitNum);
    
    res.json({
      entries,
      total,
      offset: offsetNum,
      limit: limitNum,
      lastUpdated: healthLogs.lastUpdated
    });
  } catch (error) {
    console.error('Get health logs error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// LIVING WILL (E-Living) - PDPA Compliant Endpoint
// ============================================================================

// GET - Get patient's Living Will (respects PDPA consent)
app.get('/api/patients/:patientId/living-will', authenticateToken, async (req, res) => {
  try {
    const { patientId } = req.params;
    const requesterId = req.user?.doctorId || req.user?.id;
    const requesterRole = req.user?.role || 'doctor';

    // Read Living Will from GCS
    const livingWillPath = `patients/${patientId}/living-will.json`;
    let livingWill;
    try {
      livingWill = await fetchFromGCS(BUCKETS.patient, livingWillPath);
    } catch (error) {
      // No Living Will exists
      return res.json(null);
    }

    if (!livingWill) {
      return res.json(null);
    }

    // Check PDPA consent - critical for compliance
    if (!livingWill.pdpaConsent?.isSharedWithDoctors) {
      console.log(`🔒 Living Will exists for patient ${patientId} but not shared with doctors`);
      return res.json({ 
        exists: true, 
        isShared: false,
        message: 'Patient has not shared their Living Will with medical staff' 
      });
    }

    // Only return active or suspended Living Wills (not draft or revoked)
    if (livingWill.status === 'draft' || livingWill.status === 'revoked') {
      return res.json(null);
    }

    // Add audit log entry for doctor view
    if (!livingWill.auditLog) livingWill.auditLog = [];
    livingWill.auditLog.push({
      id: `audit-${Date.now()}`,
      action: 'viewed',
      performedBy: requesterRole,
      performedById: requesterId,
      timestamp: new Date().toISOString(),
    });

    // Save updated audit log
    await writeToGCS(BUCKETS.patient, livingWillPath, livingWill);

    // Get patient info for the response
    const patients = await fetchFromGCS(BUCKETS.patient, 'patients.json') || [];
    const patient = patients.find(p => p.id === patientId);
    const patientName = patient?.fullName || patient?.demographics?.fullName || `Patient ${patientId}`;

    // Build doctor view response
    const mainRep = livingWill.representatives?.find(r => r.isMainRepresentative);
    
    const doctorView = {
      id: livingWill.id,
      patientId: livingWill.patientId,
      patientName,
      version: livingWill.version,
      status: livingWill.status,
      effectiveDate: livingWill.effectiveDate,
      treatments: livingWill.treatments,
      personalStatement: livingWill.personalStatement,
      additionalInstructions: livingWill.additionalInstructions,
      mainRepresentative: mainRep ? {
        name: mainRep.name,
        relationship: mainRep.relationship,
        phone: mainRep.phone,
        email: mainRep.email,
      } : undefined,
      isSharedByPatient: true,
      sharedAt: livingWill.pdpaConsent?.consentedAt,
      lastUpdated: livingWill.updatedAt,
    };

    res.json(doctorView);
  } catch (error) {
    console.error('Get Living Will error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// EMR NOTIFICATIONS
// ============================================================================

// POST - Notify patient that their EMR is ready
app.post('/api/notifications/emr-signed', authenticateToken, async (req, res) => {
  try {
    const { patientId, patientEmail, patientName, doctorName, encounterDate, emrId, appointmentId } = req.body;
    
    // Create notification record
    const notification = {
      id: `notif_emr_${Date.now()}`,
      patientId,
      type: 'emr_ready',
      title: 'เวชระเบียนพร้อมแล้ว / Your EMR is ready',
      message: `เวชระเบียนจากการพบ ${doctorName} วันที่ ${new Date(encounterDate).toLocaleDateString('th-TH')} พร้อมให้ดูแล้ว`,
      emrId,
      appointmentId,
      createdAt: new Date().toISOString(),
      read: false,
    };
    
    // Save to patient notifications
    const notificationsPath = `patients/${patientId}/notifications.json`;
    let notifications = await fetchFromGCS(BUCKETS.patient, notificationsPath) || { items: [], lastUpdated: null };
    
    if (!notifications.items) {
      notifications.items = [];
    }
    
    notifications.items.unshift(notification); // Add to beginning
    notifications.lastUpdated = new Date().toISOString();
    
    await writeToGCS(BUCKETS.patient, notificationsPath, notifications);
    
    // TODO: Send actual email notification using emailService
    // const emailService = require('./emailService.cjs');
    // await emailService.sendEMRReadyEmail(patientEmail, patientName, doctorName, encounterDate, emrId);
    
    console.log(`✅ EMR notification sent to patient ${patientId} (${patientEmail})`);
    
    res.json({ 
      success: true, 
      notification,
      message: 'Patient notified about EMR'
    });
  } catch (error) {
    console.error('EMR notification error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// E-PRESCRIBING
// ============================================================================

app.post('/api/prescriptions', authenticateToken, async (req, res) => {
  try {
    const prescriptionData = req.body;
    const prescriptionId = `rx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const prescription = {
      ...prescriptionData,
      id: prescriptionId,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };

    // Fetch all prescriptions
    const allPrescriptions = await fetchFromGCS(BUCKETS.patient, 'prescriptions.json') || [];
    allPrescriptions.push(prescription);

    // Write back to GCS
    await writeToGCS(BUCKETS.patient, 'prescriptions.json', allPrescriptions);

    // Log audit
    await logAuditAccess({
      userId: req.user.id,
      action: 'CREATE_PRESCRIPTION',
      patientId: prescription.patientId,
      resourceId: prescriptionId
    });

    res.json({ success: true, prescription });
  } catch (error) {
    console.error('Prescription creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/prescriptions/patient/:patientId', authenticateToken, async (req, res) => {
  try {
    const { patientId } = req.params;
    const allPrescriptions = await fetchFromGCS(BUCKETS.patient, 'prescriptions.json') || [];
    const patientPrescriptions = allPrescriptions.filter(p => p.patientId === patientId);

    res.json({ prescriptions: patientPrescriptions });
  } catch (error) {
    console.error('Prescription fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// LAB ORDERS
// ============================================================================

app.post('/api/lab-orders', authenticateToken, async (req, res) => {
  try {
    const labOrderData = req.body;
    const labOrderId = `lab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const labOrder = {
      ...labOrderData,
      id: labOrderId,
      orderDate: new Date().toISOString(),
      status: 'ordered'
    };

    // Fetch all lab orders
    const allLabOrders = await fetchFromGCS(BUCKETS.patient, 'lab-orders.json') || [];
    allLabOrders.push(labOrder);

    // Write back to GCS
    await writeToGCS(BUCKETS.patient, 'lab-orders.json', allLabOrders);

    // Log audit
    await logAuditAccess({
      userId: req.user.id,
      action: 'CREATE_LAB_ORDER',
      patientId: labOrder.patientId,
      resourceId: labOrderId
    });

    res.json({ success: true, labOrder });
  } catch (error) {
    console.error('Lab order creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/lab-orders/patient/:patientId', authenticateToken, async (req, res) => {
  try {
    const { patientId } = req.params;
    const allLabOrders = await fetchFromGCS(BUCKETS.patient, 'lab-orders.json') || [];
    const patientLabOrders = allLabOrders.filter(l => l.patientId === patientId);

    res.json({ labOrders: patientLabOrders });
  } catch (error) {
    console.error('Lab order fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// QUEUE MANAGEMENT
// ============================================================================

app.get('/api/queue/doctor/:doctorId', authenticateToken, async (req, res) => {
  try {
    const { doctorId } = req.params;
    const queue = await fetchFromGCS(BUCKETS.doctor, 'queue/queue.json') || [];
    const doctorQueue = queue.filter(q => q.doctorId === doctorId);

    res.json({ queue: doctorQueue });
  } catch (error) {
    console.error('Queue fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/queue/call-next', authenticateToken, async (req, res) => {
  try {
    const { doctorId } = req.body;
    const queue = await fetchFromGCS(BUCKETS.doctor, 'queue/queue.json') || [];

    // Find next waiting patient for this doctor
    const nextPatient = queue.find(q =>
      q.doctorId === doctorId &&
      q.status === 'waiting'
    );

    if (!nextPatient) {
      return res.status(404).json({ error: 'No waiting patients' });
    }

    // Update status
    nextPatient.status = 'in-consultation';
    nextPatient.calledAt = new Date().toISOString();

    // Write back
    await writeToGCS(BUCKETS.doctor, 'queue/queue.json', queue);

    // Emit WebSocket event
    const io = req.app.get('io');
    io.to(`queue-${doctorId}`).emit('queue-updated', { queue });

    res.json({ success: true, patient: nextPatient });
  } catch (error) {
    console.error('Call next error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/queue/skip', authenticateToken, async (req, res) => {
  try {
    const { patientId, reason } = req.body;
    const queue = await fetchFromGCS(BUCKETS.doctor, 'queue/queue.json') || [];

    const patientIndex = queue.findIndex(q => q.patientId === patientId);
    if (patientIndex === -1) {
      return res.status(404).json({ error: 'Patient not in queue' });
    }

    queue[patientIndex].status = 'skipped';
    queue[patientIndex].skipReason = reason;
    queue[patientIndex].skippedAt = new Date().toISOString();

    await writeToGCS(BUCKETS.doctor, 'queue/queue.json', queue);

    // Emit WebSocket event
    const io = req.app.get('io');
    io.to(`queue-${queue[patientIndex].doctorId}`).emit('queue-updated', { queue });

    res.json({ success: true });
  } catch (error) {
    console.error('Skip patient error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// APPOINTMENTS
// ============================================================================

app.get('/api/appointments', authenticateToken, async (req, res) => {
  try {
    const { doctorId } = req.query;
    console.log('📋 Fetching appointments...', doctorId ? `for doctor: ${doctorId}` : '');
    
    // Try both paths for backward compatibility
    let appointments = await fetchFromGCS(BUCKETS.appointments, 'appointments.json');
    
    if (!appointments) {
      console.log('⚠️  appointments.json not found, trying appointments/appointments.json...');
      appointments = await fetchFromGCS(BUCKETS.appointments, 'appointments/appointments.json');
    }
    
    if (!appointments) {
      console.log('⚠️  No appointments file found, returning empty array');
      appointments = [];
    }
    
    // Ensure it's an array
    if (!Array.isArray(appointments)) {
      console.log('⚠️  Appointments is not an array, wrapping it');
      appointments = [appointments];
    }
    
    // Filter by doctorId if provided - check ALL possible doctor ID fields
    if (doctorId) {
      appointments = appointments.filter(a => 
        a.doctorId === doctorId || 
        a.assignedDoctorId === doctorId || 
        a.adminAssignedDoctorId === doctorId
      );
      console.log(`✅ Filtered to ${appointments.length} appointments for doctor ${doctorId}`);
    }
    
    console.log(`✅ Returning ${appointments.length} appointments`);
    res.json({ appointments, count: appointments.length, success: true });
  } catch (error) {
    console.error('❌ Appointments fetch error:', error);
    res.status(500).json({ error: error.message, appointments: [], count: 0 });
  }
});

app.get('/api/appointments/:appointmentId', authenticateToken, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const appointments = await fetchFromGCS(BUCKETS.appointments, 'appointments/appointments.json') || [];
    const appointment = appointments.find(a => a.id === appointmentId);

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Fetch meeting link
    const meetingLink = await fetchFromGCS(BUCKETS.appointments, `appointments/${appointmentId}/meeting-link.json`);

    res.json({
      ...appointment,
      meetLink: meetingLink?.meetLink,
      calendarEventId: meetingLink?.calendarEventId
    });
  } catch (error) {
    console.error('Appointment fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// APPOINTMENT POOL (Shared with Patient Portal)
// ============================================================================

// ============================================================================
// VIDEO MEETING - Jitsi Meet + Gemini AI (LOW COST SOLUTION)
// ============================================================================

const crypto = require('crypto');

// Jitsi Meet Configuration (FREE) - Works in both local and Cloud Run
const JITSI_DOMAIN = process.env.JITSI_DOMAIN || process.env.VITE_JITSI_DOMAIN || 'meet.jit.si';

// Google Cloud Speech-to-Text API Configuration
const GOOGLE_SPEECH_API_KEY = process.env.GOOGLE_SPEECH_API_KEY ||
                              process.env.VITE_GOOGLE_SPEECH_API_KEY || 
                              process.env.VITE_GOOGLE_MEET_API_KEY || 
                              'AIzaSyAl924pIkpbrJBfCQ1MlpA6yb8XZ3L8WZQ';

// Gemini AI Configuration (for summary & recommendations) - with default fallback
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || 'AIzaSyDqERDgZ1l41zfGiQ4FZV62B58DXMbGWj4';
const GEMINI_MODEL = process.env.GEMINI_MODEL || process.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash-lite';

// Log video meeting configuration
console.log('[Video Meeting] ===== Configuration =====');
console.log('[Video Meeting] Jitsi Domain:', JITSI_DOMAIN);
console.log('[Video Meeting] Gemini API Key:', GEMINI_API_KEY ? `${GEMINI_API_KEY.substring(0, 15)}...` : '❌ NOT FOUND');
console.log('[Video Meeting] Gemini Model:', GEMINI_MODEL);
console.log('[Video Meeting] ===========================');

// In-memory meeting storage
const meetingSessions = new Map();

/**
 * Generate secure room name for medical consultations
 */
function generateMeetingRoomName(appointmentId) {
  const hash = crypto.createHash('sha256')
    .update(appointmentId + Date.now().toString())
    .digest('hex')
    .substring(0, 8);
  return `Izara-${appointmentId.substring(0, 8)}-${hash}`;
}

/**
 * Create Jitsi Meet URL with configuration
 */
function createJitsiMeetUrl(roomName, config = {}) {
  const params = new URLSearchParams();
  
  params.set('config.prejoinPageEnabled', 'true');
  params.set('config.startWithAudioMuted', 'false');
  params.set('config.startWithVideoMuted', 'false');
  params.set('config.enableClosePage', 'true');
  params.set('config.disableDeepLinking', 'true');
  params.set('config.defaultLanguage', config.language || 'th');
  params.set('config.enableInsecureRoomNameWarning', 'false');
  params.set('config.requireDisplayName', 'true');
  
  if (config.enableRecording) {
    params.set('config.fileRecordingsEnabled', 'true');
    params.set('config.localRecording.enabled', 'true');
  }
  
  const toolbarButtons = [
    'microphone', 'camera', 'desktop', 'chat', 'raisehand',
    'participants-pane', 'tileview', 'hangup', 'settings', 'recording'
  ];
  
  params.set('interfaceConfig.TOOLBAR_BUTTONS', JSON.stringify(toolbarButtons));
  params.set('interfaceConfig.APP_NAME', 'Izara Telemedicine');
  params.set('interfaceConfig.SHOW_CHROME_EXTENSION_BANNER', 'false');
  params.set('interfaceConfig.MOBILE_APP_PROMO', 'false');
  
  if (config.displayName) {
    params.set('userInfo.displayName', config.displayName);
  }
  if (config.email) {
    params.set('userInfo.email', config.email);
  }
  
  return `https://${JITSI_DOMAIN}/${roomName}#${params.toString()}`;
}

/**
 * Call Gemini AI for summarization
 */
async function callGeminiForSummary(prompt, maxTokens = 4096) {
  if (!GEMINI_API_KEY) return '';
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: maxTokens }
        })
      }
    );
    
    if (!response.ok) throw new Error(`Gemini error: ${response.status}`);
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch (error) {
    console.error('Gemini API error:', error);
    return '';
  }
}

/**
 * Transcribe audio using Google Cloud Speech-to-Text API
 * Called AFTER meeting ends to transcribe the recorded audio
 */
async function transcribeWithSpeechToText(audioBase64, encoding = 'WEBM_OPUS', languageCode = 'th-TH') {
  if (!GOOGLE_SPEECH_API_KEY) {
    console.warn('⚠️ Google Speech-to-Text API key not configured');
    return { transcript: '', confidence: 0, words: [] };
  }
  
  try {
    console.log('🎙️ Transcribing audio with Google Cloud Speech-to-Text...');
    
    const encodingMap = {
      'audio/webm': 'WEBM_OPUS',
      'audio/webm;codecs=opus': 'WEBM_OPUS',
      'audio/ogg': 'OGG_OPUS',
      'audio/mp3': 'MP3',
      'audio/mpeg': 'MP3',
      'audio/wav': 'LINEAR16',
      'WEBM_OPUS': 'WEBM_OPUS',
      'LINEAR16': 'LINEAR16',
      'MP3': 'MP3'
    };
    
    const audioEncoding = encodingMap[encoding] || 'WEBM_OPUS';
    
    const response = await fetch(
      `https://speech.googleapis.com/v1/speech:recognize?key=${GOOGLE_SPEECH_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: {
            encoding: audioEncoding,
            sampleRateHertz: 48000,
            languageCode: languageCode,
            alternativeLanguageCodes: languageCode === 'th-TH' ? ['en-US'] : ['th-TH'],
            enableAutomaticPunctuation: true,
            enableWordTimeOffsets: true,
            model: 'latest_long',
            useEnhanced: true,
            metadata: {
              interactionType: 'DISCUSSION',
              industryNaicsCodeOfAudio: 621111,
              originalMediaType: 'VIDEO'
            },
            speechContexts: [{
              phrases: [
                'อาการ', 'ปวดหัว', 'ไข้', 'ไอ', 'เจ็บคอ', 'ท้องเสีย', 'คลื่นไส้',
                'ความดัน', 'เบาหวาน', 'หัวใจ', 'ปอด', 'ตับ', 'ไต',
                'ยา', 'การรักษา', 'การวินิจฉัย', 'การตรวจ',
                'symptom', 'headache', 'fever', 'medication', 'treatment', 'diagnosis'
              ],
              boost: 20
            }]
          },
          audio: { content: audioBase64 }
        })
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Speech-to-Text error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    const results = data.results || [];
    let fullTranscript = '';
    let totalConfidence = 0;
    let confidenceCount = 0;
    let allWords = [];
    
    results.forEach(result => {
      if (result.alternatives && result.alternatives[0]) {
        const alt = result.alternatives[0];
        fullTranscript += (fullTranscript ? ' ' : '') + alt.transcript;
        if (alt.confidence) {
          totalConfidence += alt.confidence;
          confidenceCount++;
        }
        if (alt.words) {
          allWords = allWords.concat(alt.words);
        }
      }
    });
    
    console.log(`✅ Transcription: ${fullTranscript.length} chars, ${(totalConfidence/confidenceCount||0).toFixed(2)} confidence`);
    
    return {
      transcript: fullTranscript,
      confidence: confidenceCount > 0 ? totalConfidence / confidenceCount : 0,
      words: allWords
    };
  } catch (error) {
    console.error('Speech-to-Text error:', error);
    return { transcript: '', confidence: 0, words: [] };
  }
}

/**
 * Generate EMR summary from transcript using Gemini
 */
async function generateEMRSummary(transcript, patientInfo) {
  if (!GEMINI_API_KEY || transcript.length === 0) return null;
  
  const transcriptText = transcript.map(t => `[${t.participantName}]: ${t.text}`).join('\n');
  
  const prompt = `You are a medical AI assistant. Analyze this consultation and create a structured EMR summary.

Transcript:
${transcriptText}

${patientInfo ? `Patient: ${JSON.stringify(patientInfo)}` : ''}

Provide a Thai JSON summary:
{
  "chiefComplaint": "อาการสำคัญ",
  "presentIllness": "ประวัติปัจจุบัน",
  "physicalExam": "ผลตรวจร่างกาย",
  "assessment": "การวินิจฉัย",
  "plan": "แผนการรักษา",
  "followUp": "การนัดหมาย"
}

Return ONLY the JSON object.`;

  const result = await callGeminiForSummary(prompt);
  
  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('Failed to parse summary JSON');
  }
  
  return { rawText: result };
}

/**
 * Generate doctor recommendations using Gemini AI
 * Provides clinical decision support
 */
async function generateDoctorRecommendations(transcript, summary, patientInfo) {
  if (!GEMINI_API_KEY || transcript.length === 0) return null;
  
  const transcriptText = transcript.map(t => `[${t.participantName}]: ${t.text}`).join('\n');
  
  const prompt = `You are a clinical decision support AI for doctors. Based on this consultation, provide recommendations.

Transcript:
${transcriptText}

Summary:
${summary ? JSON.stringify(summary) : 'N/A'}

${patientInfo ? `Patient: ${JSON.stringify(patientInfo)}` : ''}

Provide Thai JSON recommendations:
{
  "differentialDiagnosis": ["การวินิจฉัยแยกโรค 1", "การวินิจฉัยแยกโรค 2"],
  "suggestedTests": ["การตรวจที่แนะนำ 1", "การตรวจที่แนะนำ 2"],
  "treatmentOptions": ["ทางเลือกการรักษา 1", "ทางเลือกการรักษา 2"],
  "redFlags": ["อาการเตือน (ถ้ามี)"],
  "clinicalNotes": "หมายเหตุสำหรับแพทย์",
  "references": ["แนวทางเวชปฏิบัติที่เกี่ยวข้อง"]
}

IMPORTANT: These are suggestions for the doctor, not final diagnoses. Return ONLY JSON.`;

  const result = await callGeminiForSummary(prompt);
  
  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('Failed to parse recommendations JSON');
  }
  
  return null;
}

// Create video meeting
app.post('/api/video-meeting/create', authenticateToken, async (req, res) => {
  try {
    const {
      appointmentId,
      doctorId,
      doctorName,
      patientId,
      patientName,
      enableRecording = true,
      language = 'th'
    } = req.body;
    
    if (!appointmentId) {
      return res.status(400).json({ error: 'appointmentId is required' });
    }
    
    // Check existing meeting
    const existingMeeting = Array.from(meetingSessions.values())
      .find(m => m.appointmentId === appointmentId && m.status !== 'ended');
    
    if (existingMeeting) {
      return res.json({ success: true, meeting: existingMeeting, message: 'Existing meeting found' });
    }
    
    const roomName = generateMeetingRoomName(appointmentId);
    
    const meeting = {
      id: `meet-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      appointmentId,
      roomName,
      jitsiUrl: createJitsiMeetUrl(roomName, { enableRecording, language }),
      createdAt: new Date(),
      createdBy: doctorId || 'system',
      participants: [],
      status: 'waiting',
      transcript: [],
      config: { enableRecording, language }
    };
    
    if (doctorId) {
      meeting.participants.push({ id: doctorId, name: doctorName || 'Doctor', role: 'doctor' });
    }
    
    meetingSessions.set(meeting.id, meeting);
    
    const doctorUrl = createJitsiMeetUrl(roomName, { displayName: doctorName, enableRecording, language });
    const patientUrl = createJitsiMeetUrl(roomName, { displayName: patientName, language });
    
    console.log(`🎥 Created Jitsi meeting for ${appointmentId}: https://${JITSI_DOMAIN}/${roomName}`);
    
    // Store meeting link in GCS
    await writeToGCS(BUCKETS.appointments, `appointments/${appointmentId}/meeting-link.json`, {
      meetingId: meeting.id,
      roomName,
      meetLink: `https://${JITSI_DOMAIN}/${roomName}`,
      doctorUrl,
      patientUrl,
      createdAt: new Date().toISOString()
    });
    
    res.json({
      success: true,
      meeting: { id: meeting.id, appointmentId, roomName, status: meeting.status },
      urls: { doctor: doctorUrl, patient: patientUrl, generic: meeting.jitsiUrl },
      config: { jitsiDomain: JITSI_DOMAIN, roomName, enableRecording }
    });
    
  } catch (error) {
    console.error('Create meeting error:', error);
    res.status(500).json({ error: 'Failed to create meeting' });
  }
});

// Get meeting by appointment
app.get('/api/video-meeting/:appointmentId', authenticateToken, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    
    // Check in-memory first
    let meeting = Array.from(meetingSessions.values())
      .find(m => m.appointmentId === appointmentId && m.status !== 'ended');
    
    // Fall back to GCS
    if (!meeting) {
      const storedMeeting = await fetchFromGCS(BUCKETS.appointments, `appointments/${appointmentId}/meeting-link.json`);
      if (storedMeeting) {
        meeting = storedMeeting;
      }
    }
    
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    res.json({ success: true, meeting });
  } catch (error) {
    console.error('Get meeting error:', error);
    res.status(500).json({ error: 'Failed to get meeting' });
  }
});

// Join meeting
app.post('/api/video-meeting/:appointmentId/join', authenticateToken, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { participantId, participantName, role, email } = req.body;
    
    let meeting = Array.from(meetingSessions.values())
      .find(m => m.appointmentId === appointmentId && m.status !== 'ended');
    
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    meeting.participants.push({
      id: participantId || `guest-${Date.now()}`,
      name: participantName || 'Guest',
      role: role || 'guest',
      joinedAt: new Date()
    });
    
    if (meeting.status === 'waiting') {
      meeting.status = 'active';
      meeting.startedAt = new Date();
    }
    
    const personalUrl = createJitsiMeetUrl(meeting.roomName, { displayName: participantName, email });
    
    console.log(`👤 ${participantName} joined meeting ${meeting.roomName}`);
    
    res.json({ success: true, meetingUrl: personalUrl, meeting: { id: meeting.id, roomName: meeting.roomName, status: meeting.status } });
  } catch (error) {
    console.error('Join meeting error:', error);
    res.status(500).json({ error: 'Failed to join meeting' });
  }
});

// Add transcript entry
app.post('/api/video-meeting/:appointmentId/transcript', authenticateToken, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { participantId, participantName, text, timestamp } = req.body;
    
    const meeting = Array.from(meetingSessions.values()).find(m => m.appointmentId === appointmentId);
    
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    const entry = {
      id: `trans-${Date.now()}`,
      participantId,
      participantName,
      text,
      timestamp: new Date(timestamp || Date.now())
    };
    
    meeting.transcript.push(entry);
    
    res.json({ success: true, transcriptId: entry.id, totalEntries: meeting.transcript.length });
  } catch (error) {
    console.error('Transcript error:', error);
    res.status(500).json({ error: 'Failed to add transcript' });
  }
});

// Transcribe audio using Google Cloud Speech-to-Text
app.post('/api/video-meeting/:appointmentId/transcribe-audio', authenticateToken, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { audioBase64, encoding, languageCode, participantName } = req.body;
    
    if (!audioBase64) {
      return res.status(400).json({ error: 'audioBase64 is required' });
    }
    
    const meeting = Array.from(meetingSessions.values()).find(m => m.appointmentId === appointmentId);
    
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    console.log(`🎙️ Transcribing audio for meeting ${appointmentId}...`);
    
    const result = await transcribeWithSpeechToText(
      audioBase64, 
      encoding || 'WEBM_OPUS',
      languageCode || 'th-TH'
    );
    
    if (result.transcript && result.transcript.trim()) {
      const entry = {
        id: `trans-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
        participantId: 'meeting-audio',
        participantName: participantName || 'Meeting Recording',
        text: result.transcript.trim(),
        timestamp: new Date(),
        confidence: result.confidence,
        language: languageCode || 'th-TH'
      };
      
      meeting.transcript.push(entry);
      
      res.json({
        success: true,
        transcription: result.transcript,
        confidence: result.confidence,
        wordCount: result.words.length,
        transcriptId: entry.id,
        message: 'Transcribed via Google Cloud Speech-to-Text'
      });
    } else {
      res.json({ success: true, transcription: '', message: 'No speech detected' });
    }
  } catch (error) {
    console.error('Transcribe audio error:', error);
    res.status(500).json({ error: 'Failed to transcribe audio' });
  }
});

// End meeting - transcribe audio, generate summary & recommendations, upload recording
// Also handles frontend-submitted meeting results (when using local AI service)
app.post('/api/video-meeting/:appointmentId/end', authenticateToken, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { 
      generateSummary = true, 
      generateRecommendations = true,
      patientInfo,
      audioBase64,
      audioEncoding,
      languageCode,
      // NEW: Video recording upload
      videoBase64,
      videoMimeType = 'video/webm',
      doctorId,
      doctorName,
      // NEW: Frontend-submitted meeting data (when using local AI)
      transcript: frontendTranscript,
      summary: frontendSummary,
      recommendations: frontendRecommendations,
      duration: frontendDuration,
      timestamp: frontendTimestamp
    } = req.body;
    
    // Check for active server meeting session
    let meeting = Array.from(meetingSessions.values())
      .find(m => m.appointmentId === appointmentId && m.status !== 'ended');
    
    // If no active session but frontend submitted data, create a virtual meeting record
    const isFrontendSubmission = frontendTranscript || frontendSummary;
    if (!meeting && isFrontendSubmission) {
      console.log('📱 Processing frontend-submitted meeting data (no server session)');
      meeting = {
        id: `frontend-${appointmentId}-${Date.now()}`,
        appointmentId,
        roomName: `meeting-${appointmentId}`,
        createdBy: doctorId || 'unknown-doctor',
        startedAt: new Date(Date.now() - (frontendDuration || 0) * 1000),
        endedAt: new Date(),
        status: 'ended',
        participants: [],
        transcript: frontendTranscript || [],
        summary: frontendSummary,
        recommendations: frontendRecommendations
      };
    } else if (!meeting) {
      return res.status(404).json({ error: 'Active meeting not found' });
    } else {
      meeting.participants.forEach(p => { if (!p.leftAt) p.leftAt = new Date(); });
      meeting.status = 'ended';
      meeting.endedAt = new Date();
    }
    
    const effectiveDoctorId = doctorId || meeting.createdBy || 'unknown-doctor';
    
    // Step 1: Upload video recording to GCS (izara-doctors-data bucket)
    let videoUrl = null;
    if (videoBase64) {
      console.log('🎥 Uploading meeting video to GCS (izara-doctors-data)...');
      try {
        const videoPath = `doctors/${effectiveDoctorId}/meetings/${appointmentId}/recording.webm`;
        const uploadResult = await uploadBinaryToGCS(
          BUCKETS.doctor,
          videoPath,
          videoBase64,
          videoMimeType
        );
        videoUrl = uploadResult.url;
        meeting.videoUrl = videoUrl;
        console.log(`✅ Video uploaded: ${videoPath} (${uploadResult.sizeFormatted})`);
      } catch (videoError) {
        console.error('⚠️ Video upload failed (continuing):', videoError.message);
      }
    }
    
    // Step 2: Transcribe audio if provided (POST-MEETING transcription)
    if (audioBase64) {
      console.log('🎙️ Transcribing meeting audio via Google Cloud Speech-to-Text...');
      
      const transcriptionResult = await transcribeWithSpeechToText(
        audioBase64,
        audioEncoding || 'WEBM_OPUS',
        languageCode || 'th-TH'
      );
      
      if (transcriptionResult.transcript) {
        meeting.transcript.push({
          id: `trans-${Date.now()}`,
          participantId: 'meeting-audio',
          participantName: 'Meeting Recording',
          text: transcriptionResult.transcript,
          timestamp: new Date(),
          confidence: transcriptionResult.confidence
        });
        console.log(`✅ Transcription: ${transcriptionResult.transcript.length} characters`);
      }
    }
    
    // Step 3: Generate EMR summary using Gemini (or use frontend-submitted summary)
    let summary = frontendSummary || null;
    if (!summary && generateSummary && meeting.transcript.length > 0) {
      console.log('📝 Generating EMR summary with Gemini AI...');
      summary = await generateEMRSummary(meeting.transcript, patientInfo);
    }
    meeting.summary = summary;
    
    // Step 4: Generate doctor recommendations using Gemini (or use frontend-submitted)
    let recommendations = frontendRecommendations || null;
    if (!recommendations && generateRecommendations && meeting.transcript.length > 0) {
      console.log('💡 Generating doctor recommendations with Gemini AI...');
      recommendations = await generateDoctorRecommendations(meeting.transcript, summary, patientInfo);
    }
    meeting.recommendations = recommendations;
    
    // Use frontend duration if provided, otherwise calculate from meeting times
    const duration = frontendDuration || (meeting.startedAt 
      ? Math.floor((meeting.endedAt.getTime() - meeting.startedAt.getTime()) / 1000)
      : 0);
    
    // Step 5: Save transcript.txt to GCS (izara-doctors-data)
    if (meeting.transcript.length > 0) {
      console.log('📄 Saving transcript.txt to GCS...');
      const transcriptText = meeting.transcript
        .map(t => `[${new Date(t.timestamp).toLocaleString('th-TH')}] ${t.participantName}: ${t.text}`)
        .join('\n\n');
      
      const transcriptPath = `doctors/${effectiveDoctorId}/meetings/${appointmentId}/transcript.txt`;
      await writeToGCS(BUCKETS.doctor, transcriptPath, { 
        _rawText: transcriptText,
        _timestamp: new Date().toISOString()
      });
      meeting.transcriptPath = `gs://${BUCKETS.doctor}/${transcriptPath}`;
    }
    
    // Step 6: Save summary.txt to GCS (izara-doctors-data)
    if (summary) {
      console.log('📄 Saving summary.txt to GCS...');
      const summaryText = typeof summary === 'string' ? summary : JSON.stringify(summary, null, 2);
      
      const summaryPath = `doctors/${effectiveDoctorId}/meetings/${appointmentId}/summary.txt`;
      await writeToGCS(BUCKETS.doctor, summaryPath, {
        _rawText: summaryText,
        _timestamp: new Date().toISOString()
      });
      meeting.summaryPath = `gs://${BUCKETS.doctor}/${summaryPath}`;
    }
    
    // Step 7: Save recommendations.txt to GCS (izara-doctors-data)
    if (recommendations) {
      console.log('📄 Saving recommendations.txt to GCS...');
      const recommendationsText = typeof recommendations === 'string' 
        ? recommendations 
        : JSON.stringify(recommendations, null, 2);
      
      const recommendationsPath = `doctors/${effectiveDoctorId}/meetings/${appointmentId}/recommendations.txt`;
      await writeToGCS(BUCKETS.doctor, recommendationsPath, {
        _rawText: recommendationsText,
        _timestamp: new Date().toISOString()
      });
      meeting.recommendationsPath = `gs://${BUCKETS.doctor}/${recommendationsPath}`;
    }
    
    // Step 8: Store comprehensive meeting data in appointments bucket (for EMR)
    await writeToGCS(BUCKETS.appointments, `appointments/${appointmentId}/meeting-data.json`, {
      meetingId: meeting.id,
      appointmentId,
      duration,
      participants: meeting.participants,
      transcript: meeting.transcript,
      summary,
      recommendations,
      videoUrl,
      transcriptPath: meeting.transcriptPath,
      summaryPath: meeting.summaryPath,
      recommendationsPath: meeting.recommendationsPath,
      doctorId: effectiveDoctorId,
      doctorName: doctorName || 'Doctor',
      endedAt: meeting.endedAt.toISOString(),
      apiUsed: {
        transcription: 'Google Cloud Speech-to-Text',
        summarization: 'Gemini AI',
        recommendations: 'Gemini AI'
      },
      storage: {
        bucket: BUCKETS.doctor,
        basePath: `doctors/${effectiveDoctorId}/meetings/${appointmentId}/`
      }
    });
    
    console.log(`📋 Meeting ended: ${meeting.roomName} (${Math.floor(duration / 60)}m)`);
    console.log(`   Transcript entries: ${meeting.transcript.length}`);
    console.log(`   Summary generated: ${!!summary}`);
    console.log(`   Recommendations generated: ${!!recommendations}`);
    console.log(`   Video uploaded: ${!!videoUrl}`);
    console.log(`   Storage bucket: ${BUCKETS.doctor}`);
    
    res.json({
      success: true,
      meeting: { 
        id: meeting.id, 
        appointmentId, 
        status: 'ended', 
        duration,
        videoUrl 
      },
      transcript: meeting.transcript,
      summary,
      doctorRecommendations: recommendations,
      storage: {
        bucket: BUCKETS.doctor,
        basePath: `doctors/${effectiveDoctorId}/meetings/${appointmentId}/`,
        files: {
          video: videoUrl ? 'recording.webm' : null,
          transcript: meeting.transcriptPath ? 'transcript.txt' : null,
          summary: meeting.summaryPath ? 'summary.txt' : null,
          recommendations: meeting.recommendationsPath ? 'recommendations.txt' : null
        }
      },
      emrData: {
        meetingId: meeting.id,
        appointmentId,
        duration,
        transcript: meeting.transcript,
        summary,
        recommendations,
        videoUrl,
        generatedAt: new Date().toISOString(),
        apiUsed: {
          transcription: 'Google Cloud Speech-to-Text',
          summarization: 'Gemini AI',
          recommendations: 'Gemini AI'
        }
      }
    });
  } catch (error) {
    console.error('End meeting error:', error);
    res.status(500).json({ error: 'Failed to end meeting' });
  }
});

// Upload video recording separately (for large files or chunked uploads)
app.post('/api/video-meeting/:appointmentId/upload-recording', authenticateToken, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { videoBase64, videoMimeType = 'video/webm', doctorId, doctorName } = req.body;
    
    if (!videoBase64) {
      return res.status(400).json({ error: 'videoBase64 is required' });
    }
    
    const effectiveDoctorId = doctorId || 'unknown-doctor';
    
    console.log('🎥 Uploading meeting video to GCS (izara-doctors-data)...');
    
    const videoPath = `doctors/${effectiveDoctorId}/meetings/${appointmentId}/recording.webm`;
    const uploadResult = await uploadBinaryToGCS(
      BUCKETS.doctor,
      videoPath,
      videoBase64,
      videoMimeType
    );
    
    console.log(`✅ Video uploaded: ${videoPath} (${uploadResult.sizeFormatted})`);
    
    // Update meeting data if exists
    const meeting = Array.from(meetingSessions.values()).find(m => m.appointmentId === appointmentId);
    if (meeting) {
      meeting.videoUrl = uploadResult.url;
    }
    
    // Update stored meeting data
    try {
      const existingData = await fetchFromGCS(BUCKETS.appointments, `appointments/${appointmentId}/meeting-data.json`);
      if (existingData) {
        existingData.videoUrl = uploadResult.url;
        existingData.storage = {
          bucket: BUCKETS.doctor,
          basePath: `doctors/${effectiveDoctorId}/meetings/${appointmentId}/`,
          files: {
            ...existingData.storage?.files,
            video: 'recording.webm'
          }
        };
        await writeToGCS(BUCKETS.appointments, `appointments/${appointmentId}/meeting-data.json`, existingData);
      }
    } catch (err) {
      console.log('Could not update meeting-data.json:', err.message);
    }
    
    res.json({
      success: true,
      videoUrl: uploadResult.url,
      path: videoPath,
      size: uploadResult.size,
      sizeFormatted: uploadResult.sizeFormatted,
      message: 'Video recording uploaded to izara-doctors-data bucket'
    });
  } catch (error) {
    console.error('Video upload error:', error);
    res.status(500).json({ error: 'Failed to upload video recording' });
  }
});

// Get meeting recordings and files for doctor portal display
app.get('/api/video-meeting/:appointmentId/files', authenticateToken, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { doctorId } = req.query;
    
    // Get meeting data from GCS
    const meetingData = await fetchFromGCS(BUCKETS.appointments, `appointments/${appointmentId}/meeting-data.json`);
    
    if (!meetingData) {
      return res.status(404).json({ error: 'Meeting data not found' });
    }
    
    const effectiveDoctorId = doctorId || meetingData.doctorId || 'unknown-doctor';
    const basePath = `doctors/${effectiveDoctorId}/meetings/${appointmentId}`;
    
    // Get file URLs
    const files = {
      video: meetingData.videoUrl || null,
      transcript: meetingData.transcriptPath || null,
      summary: meetingData.summaryPath || null,
      recommendations: meetingData.recommendationsPath || null
    };
    
    res.json({
      success: true,
      appointmentId,
      meetingId: meetingData.meetingId,
      duration: meetingData.duration,
      endedAt: meetingData.endedAt,
      files,
      storage: meetingData.storage || {
        bucket: BUCKETS.doctor,
        basePath: `${basePath}/`
      },
      transcript: meetingData.transcript,
      summary: meetingData.summary,
      recommendations: meetingData.recommendations
    });
  } catch (error) {
    console.error('Get meeting files error:', error);
    res.status(500).json({ error: 'Failed to get meeting files' });
  }
});

// Generate recommendations on demand
app.post('/api/video-meeting/:appointmentId/recommendations', authenticateToken, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { patientInfo } = req.body;
    
    const meeting = Array.from(meetingSessions.values()).find(m => m.appointmentId === appointmentId);
    
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    if (meeting.transcript.length === 0) {
      return res.status(400).json({ error: 'No transcript available' });
    }
    
    const recommendations = await generateDoctorRecommendations(
      meeting.transcript,
      meeting.summary || null,
      patientInfo
    );
    meeting.recommendations = recommendations;
    
    res.json({ success: true, recommendations, message: 'Generated by Gemini AI' });
  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

// Get meeting transcript
app.get('/api/video-meeting/:appointmentId/transcript', authenticateToken, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    
    let meeting = Array.from(meetingSessions.values()).find(m => m.appointmentId === appointmentId);
    
    if (!meeting) {
      const storedData = await fetchFromGCS(BUCKETS.appointments, `appointments/${appointmentId}/meeting-data.json`);
      if (storedData) {
        return res.json({ success: true, transcript: storedData.transcript, summary: storedData.summary });
      }
      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    res.json({ success: true, transcript: meeting.transcript, summary: meeting.summary });
  } catch (error) {
    console.error('Get transcript error:', error);
    res.status(500).json({ error: 'Failed to get transcript' });
  }
});

// Video meeting health check
app.get('/api/video-meeting/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Jitsi Meet + Google Speech-to-Text + Gemini AI',
    config: {
      jitsiDomain: JITSI_DOMAIN,
      speechToTextConfigured: !!GOOGLE_SPEECH_API_KEY,
      geminiConfigured: !!GEMINI_API_KEY,
      geminiModel: GEMINI_MODEL,
      activeMeetings: meetingSessions.size
    },
    features: {
      videoConferencing: 'Jitsi Meet (FREE)',
      transcription: 'Google Cloud Speech-to-Text',
      summarization: 'Gemini AI',
      doctorRecommendations: 'Gemini AI',
      recording: 'Jitsi Built-in (FREE)'
    },
    workflow: {
      step1: 'Meeting ends with audio recording',
      step2: 'Audio transcribed via Google Cloud Speech-to-Text',
      step3: 'Gemini generates EMR summary',
      step4: 'Gemini generates doctor recommendations',
      step5: 'Results saved to health records'
    },
    costs: {
      video: '$0 (Jitsi Meet)',
      transcription: '~$0.006/15s (Speech-to-Text)',
      summarization: '~$0.001/1K tokens (Gemini)',
      total: 'Low cost - pay only for API usage'
    }
  });
});

/**
 * Get all pool items - can filter by specialty, status, urgency
 */
app.get('/api/appointment-pool', authenticateToken, async (req, res) => {
  try {
    const { status, specialty, urgency, doctorId } = req.query;
    console.log('📋 Fetching appointment pool items...');
    
    let poolItems = await fetchFromGCS(BUCKETS.appointments, 'appointment-pool/pool.json') || [];
    
    console.log(`   Found ${poolItems.length} total pool items`);

    // Filter by status
    if (status) {
      poolItems = poolItems.filter(item => item.poolStatus === status);
    }

    // Filter by specialty
    if (specialty) {
      poolItems = poolItems.filter(item => 
        item.matchedSpecialties?.includes(specialty) || 
        item.requiredSpecialty === specialty
      );
    }

    // Filter by urgency
    if (urgency) {
      poolItems = poolItems.filter(item => item.urgency === urgency);
    }

    // Filter claimed by specific doctor
    if (doctorId) {
      poolItems = poolItems.filter(item => 
        item.claimedByDoctorId === doctorId ||
        item.aiMatchedDoctorId === doctorId ||
        item.adminAssignedDoctorId === doctorId
      );
    }

    // Sort by urgency and creation date
    poolItems.sort((a, b) => {
      const urgencyOrder = { emergency: 0, urgent: 1, normal: 2 };
      if ((urgencyOrder[a.urgency] || 2) !== (urgencyOrder[b.urgency] || 2)) {
        return (urgencyOrder[a.urgency] || 2) - (urgencyOrder[b.urgency] || 2);
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    console.log(`✅ Returning ${poolItems.length} filtered pool items`);
    res.json(poolItems);
  } catch (error) {
    console.error('❌ Pool fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get pending appointments for a doctor (awaiting response)
 */
app.get('/api/appointments/pending/:doctorId', authenticateToken, async (req, res) => {
  try {
    const { doctorId } = req.params;
    console.log(`📋 Fetching pending appointments for doctor ${doctorId}...`);
    
    let appointments = await fetchFromGCS(BUCKETS.appointments, 'appointments.json') || 
                       await fetchFromGCS(BUCKETS.appointments, 'appointments/appointments.json') || [];
    
    // Filter for pending appointments assigned to this doctor - check ALL doctor ID fields
    const pendingAppointments = appointments.filter(apt => {
      const matchesDoctor = apt.doctorId === doctorId || 
                           apt.assignedDoctorId === doctorId || 
                           apt.adminAssignedDoctorId === doctorId;
      const needsResponse = apt.status === 'pending' || 
                           apt.status === 'awaiting_doctor_response' || 
                           apt.status === 'assigned';
      return matchesDoctor && needsResponse;
    });

    console.log(`✅ Found ${pendingAppointments.length} pending appointments`);
    res.json({ appointments: pendingAppointments });
  } catch (error) {
    console.error('❌ Pending appointments fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Doctor confirms appointment
 */
app.post('/api/appointments/:appointmentId/confirm', authenticateToken, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { doctorId, confirmedDate, confirmedTime, notes } = req.body;
    
    console.log(`✅ Doctor ${doctorId} confirming appointment ${appointmentId}...`);
    
    // Read appointments
    let appointments = await fetchFromGCS(BUCKETS.appointments, 'appointments.json') || 
                       await fetchFromGCS(BUCKETS.appointments, 'appointments/appointments.json') || [];
    
    const aptIndex = appointments.findIndex(a => a.id === appointmentId);
    
    if (aptIndex === -1) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }
    
    const appointment = appointments[aptIndex];
    
    // Verify doctor is assigned
    const isAssignedDoctor = appointment.doctorId === doctorId || 
                            appointment.assignedDoctorId === doctorId || 
                            appointment.adminAssignedDoctorId === doctorId;
    
    if (!isAssignedDoctor) {
      return res.status(403).json({ success: false, error: 'Not authorized to confirm this appointment' });
    }
    
    // Generate meeting link for telehealth appointments
    let meetingLink = appointment.meetingLink || null;
    if ((appointment.type === 'telehealth' || appointment.appointmentType === 'telehealth') && !meetingLink) {
      const JITSI_DOMAIN = process.env.JITSI_DOMAIN || 'meet.jit.si';
      const timestamp = Date.now().toString(36);
      const randomPart = Math.random().toString(36).substring(2, 8);
      const roomName = `Izara-${appointmentId.substring(0, 8)}-${timestamp}-${randomPart}`;
      meetingLink = `https://${JITSI_DOMAIN}/${roomName}`;
      console.log(`🔗 Generated meeting link for ${appointmentId}: ${meetingLink}`);
    }
    
    // Update appointment
    appointments[aptIndex] = {
      ...appointment,
      status: 'confirmed',
      confirmedAt: new Date().toISOString(),
      confirmedBy: doctorId,
      appointmentDate: confirmedDate || appointment.appointmentDate,
      appointmentTime: confirmedTime || appointment.appointmentTime,
      date: confirmedDate ? new Date(confirmedDate) : appointment.date,
      time: confirmedTime || appointment.appointmentTime,
      doctorNotes: notes || appointment.doctorNotes || '',
      meetingLink: meetingLink,
      updatedAt: new Date().toISOString()
    };
    
    // Save back to GCS
    const result = await writeToGCS(BUCKETS.appointments, 'appointments.json', appointments);
    
    // Also try appointments/appointments.json for backup
    await writeToGCS(BUCKETS.appointments, 'appointments/appointments.json', appointments);
    
    // Update individual appointment file
    try {
      await writeToGCS(BUCKETS.appointments, `appointments/${appointmentId}/details.json`, appointments[aptIndex]);
    } catch (e) {
      console.warn('Could not update individual appointment file:', e.message);
    }
    
    if (result.success) {
      console.log(`✅ Appointment ${appointmentId} confirmed by doctor ${doctorId}`);
      
      // Send confirmation email to patient with meeting link
      try {
        const appointmentDateFormatted = confirmedDate || appointment.appointmentDate;
        const appointmentTimeFormatted = confirmedTime || appointment.appointmentTime;
        const patientName = appointment.patientName || appointment.patient?.name || 'Patient';
        const doctorName = appointment.doctorName || 'Doctor';
        
        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #059669, #10b981); color: white; padding: 25px; border-radius: 10px 10px 0 0; text-align: center; }
              .content { background: #f9fafb; padding: 25px; border: 1px solid #e5e7eb; }
              .info-box { background: white; border: 1px solid #e5e7eb; padding: 15px; border-radius: 8px; margin: 15px 0; }
              .meeting-link { background: #dbeafe; border: 2px solid #3b82f6; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
              .button { display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 10px 5px; }
              .button-blue { background: #3b82f6; }
              .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 10px 10px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">✅ นัดหมายยืนยันแล้ว!</h1>
                <p style="margin: 10px 0 0 0;">Appointment Confirmed</p>
              </div>
              <div class="content">
                <h2>สวัสดีคุณ ${patientName},</h2>
                <p>นัดหมายของคุณได้รับการยืนยันจาก ${doctorName} แล้ว</p>
                
                <div class="info-box">
                  <p><strong>📅 วันที่:</strong> ${appointmentDateFormatted}</p>
                  <p><strong>🕐 เวลา:</strong> ${appointmentTimeFormatted}</p>
                  <p><strong>👨‍⚕️ แพทย์:</strong> ${doctorName}</p>
                  <p><strong>📍 รูปแบบ:</strong> ${appointment.type === 'telehealth' ? '📹 ออนไลน์ (Telehealth)' : '🏥 ที่โรงพยาบาล'}</p>
                </div>

                ${meetingLink ? `
                <div class="meeting-link">
                  <h3 style="margin-top: 0;">🔗 ลิงก์เข้าประชุม</h3>
                  <p>คุณสามารถเข้าร่วมได้ 15 นาทีก่อนเวลานัด</p>
                  <a href="${meetingLink}" class="button button-blue" style="color: white;">เข้าร่วมการประชุม (Join Meeting)</a>
                  <p style="margin-top: 15px; font-size: 12px; color: #666;">ลิงก์: ${meetingLink}</p>
                </div>
                ` : `
                <div class="info-box" style="background: #fef3c7; border-color: #f59e0b;">
                  <p><strong>📍 สถานที่นัดหมาย:</strong></p>
                  <p>กรุณามาพบแพทย์ที่โรงพยาบาลตามวันและเวลาที่กำหนด</p>
                </div>
                `}
              </div>
              <div class="footer">
                <p>หากมีข้อสงสัยกรุณาติดต่อ support@izara-telemedicine.com</p>
                <p>© ${new Date().getFullYear()} Izara Telemedicine</p>
              </div>
            </div>
          </body>
          </html>
        `;
        
        await emailService.sendEmail({
          to: appointment.patientEmail || appointment.email,
          subject: `✅ นัดหมายยืนยันแล้ว - ${appointmentDateFormatted} เวลา ${appointmentTimeFormatted}`,
          text: `นัดหมายของคุณได้รับการยืนยันแล้ว\n\nวันที่: ${appointmentDateFormatted}\nเวลา: ${appointmentTimeFormatted}\nแพทย์: ${doctorName}\n${meetingLink ? `\nลิงก์เข้าประชุม: ${meetingLink}` : ''}`,
          html: emailHtml
        });
        console.log(`📧 Confirmation email sent to ${appointment.patientEmail || appointment.email}`);
      } catch (emailError) {
        console.warn('Failed to send confirmation email:', emailError);
      }
      
      res.json({ success: true, appointment: appointments[aptIndex], meetingLink });
    } else {
      res.status(500).json({ success: false, error: 'Failed to save appointment' });
    }
  } catch (error) {
    console.error('❌ Appointment confirmation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Doctor declines appointment
 */
app.post('/api/appointments/:appointmentId/decline', authenticateToken, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { doctorId, reason } = req.body;
    
    console.log(`❌ Doctor ${doctorId} declining appointment ${appointmentId}...`);
    
    // Read appointments
    let appointments = await fetchFromGCS(BUCKETS.appointments, 'appointments.json') || 
                       await fetchFromGCS(BUCKETS.appointments, 'appointments/appointments.json') || [];
    
    const aptIndex = appointments.findIndex(a => a.id === appointmentId);
    
    if (aptIndex === -1) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }
    
    const appointment = appointments[aptIndex];
    
    // Verify doctor is assigned
    const isAssignedDoctor = appointment.doctorId === doctorId || 
                            appointment.assignedDoctorId === doctorId || 
                            appointment.adminAssignedDoctorId === doctorId;
    
    if (!isAssignedDoctor) {
      return res.status(403).json({ success: false, error: 'Not authorized to decline this appointment' });
    }
    
    // Update appointment - send back to admin or mark as declined
    appointments[aptIndex] = {
      ...appointment,
      status: 'declined_by_doctor',
      declinedAt: new Date().toISOString(),
      declinedBy: doctorId,
      declineReason: reason || 'Doctor declined',
      doctorId: null, // Remove doctor assignment
      assignedDoctorId: null,
      adminAssignedDoctorId: null,
      needsReassignment: true,
      updatedAt: new Date().toISOString()
    };
    
    // Save back to GCS
    await writeToGCS(BUCKETS.appointments, 'appointments.json', appointments);
    await writeToGCS(BUCKETS.appointments, 'appointments/appointments.json', appointments);
    
    console.log(`✅ Appointment ${appointmentId} declined by doctor ${doctorId}`);
    
    // Send email to admin for reassignment
    try {
      await emailService.sendEmail({
        to: 'admin.test@izara.com',
        subject: 'Appointment Needs Reassignment',
        text: `Doctor declined appointment ${appointmentId}. Reason: ${reason || 'Not specified'}. Please reassign to another doctor.`,
        html: `<p>Doctor declined appointment <strong>${appointmentId}</strong>.</p><p>Reason: ${reason || 'Not specified'}</p><p>Please reassign to another doctor.</p>`
      });
    } catch (emailError) {
      console.warn('Failed to send admin notification:', emailError);
    }
    
    res.json({ success: true, appointment: appointments[aptIndex] });
  } catch (error) {
    console.error('❌ Appointment decline error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Doctor rejects appointment
 */
app.post('/api/appointments/:appointmentId/reject', authenticateToken, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { doctorId, reason } = req.body;
    
    console.log(`❌ Doctor ${doctorId} rejecting appointment ${appointmentId}...`);
    
    // Read appointments
    let appointments = await fetchFromGCS(BUCKETS.appointments, 'appointments.json') || 
                       await fetchFromGCS(BUCKETS.appointments, 'appointments/appointments.json') || [];
    
    const aptIndex = appointments.findIndex(a => a.id === appointmentId);
    
    if (aptIndex === -1) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }
    
    const appointment = appointments[aptIndex];
    
    // Verify doctor is assigned
    const isAssignedDoctor = appointment.doctorId === doctorId || 
                            appointment.assignedDoctorId === doctorId || 
                            appointment.adminAssignedDoctorId === doctorId;
    
    if (!isAssignedDoctor) {
      return res.status(403).json({ success: false, error: 'Not authorized to reject this appointment' });
    }
    
    // Update appointment - send back to pool
    appointments[aptIndex] = {
      ...appointment,
      status: 'in_pool',
      poolStatus: 'pending',
      rejectedBy: doctorId,
      rejectionReason: reason,
      rejectedAt: new Date().toISOString(),
      doctorId: null,
      assignedDoctorId: null,
      adminAssignedDoctorId: null,
      updatedAt: new Date().toISOString()
    };
    
    // Save back to GCS
    const result = await writeToGCS(BUCKETS.appointments, 'appointments.json', appointments);
    await writeToGCS(BUCKETS.appointments, 'appointments/appointments.json', appointments);
    
    if (result.success) {
      console.log(`✅ Appointment ${appointmentId} rejected, returned to pool`);
      res.json({ success: true, message: 'Appointment returned to pool' });
    } else {
      res.status(500).json({ success: false, error: 'Failed to save appointment' });
    }
  } catch (error) {
    console.error('❌ Appointment rejection error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Doctor claims appointment from pool
 */
app.post('/api/appointment-pool/:poolId/claim', authenticateToken, async (req, res) => {
  try {
    const { poolId } = req.params;
    const { doctorId, doctorName, proposedDate, proposedTime } = req.body;
    console.log(`📌 Doctor ${doctorId} claiming pool item ${poolId}...`);

    // Read pool
    let pool = await fetchFromGCS(BUCKETS.appointments, 'appointment-pool/pool.json') || [];
    const itemIndex = pool.findIndex(item => item.id === poolId);

    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Pool item not found' });
    }

    const poolItem = pool[itemIndex];

    if (poolItem.poolStatus !== 'pending' && poolItem.poolStatus !== 'ai_matched') {
      return res.status(400).json({ error: 'This appointment is no longer available for claiming' });
    }

    // Update pool item
    poolItem.claimedByDoctorId = doctorId;
    poolItem.claimedByDoctorName = doctorName;
    poolItem.assignedDate = proposedDate;
    poolItem.assignedTime = proposedTime;
    poolItem.poolStatus = 'doctor_claimed';
    poolItem.updatedAt = new Date().toISOString();

    pool[itemIndex] = poolItem;

    // Write updated pool
    await writeToGCS(BUCKETS.appointments, 'appointment-pool/pool.json', pool);
    await writeToGCS(BUCKETS.appointments, `appointment-pool/items/${poolId}.json`, poolItem);

    // Update the original appointment
    let appointments = await fetchFromGCS(BUCKETS.appointments, 'appointments.json') || [];
    const aptIndex = appointments.findIndex(a => a.id === poolItem.appointmentId);
    
    if (aptIndex !== -1) {
      appointments[aptIndex] = {
        ...appointments[aptIndex],
        doctorId: doctorId,
        doctorName: doctorName,
        appointmentDate: proposedDate,
        appointmentTime: proposedTime,
        status: 'confirmed',
        poolId: poolId,
        updatedAt: new Date().toISOString()
      };
      await writeToGCS(BUCKETS.appointments, 'appointments.json', appointments);
    }

    // Emit WebSocket event
    const io = req.app.get('io');
    io.emit('pool-updated', { poolId, action: 'claimed', doctorId });

    console.log(`✅ Pool item ${poolId} claimed by doctor ${doctorId}`);
    res.json({
      success: true,
      poolItem,
      message: 'Appointment claimed successfully'
    });
  } catch (error) {
    console.error('❌ Claim pool error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Admin assigns doctor to pool item
 */
app.post('/api/appointment-pool/:poolId/admin-assign', authenticateToken, async (req, res) => {
  try {
    const { poolId } = req.params;
    const { doctorId, doctorName, assignedDate, assignedTime, adminId, adminName } = req.body;
    console.log(`📌 Admin ${adminId} assigning pool item ${poolId} to doctor ${doctorId}...`);

    // Read pool
    let pool = await fetchFromGCS(BUCKETS.appointments, 'appointment-pool/pool.json') || [];
    const itemIndex = pool.findIndex(item => item.id === poolId);

    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Pool item not found' });
    }

    const poolItem = pool[itemIndex];
    const requiresApproval = poolItem.missedCount > 0 || poolItem.poolReason === 'rescheduled';

    // Update pool item
    poolItem.adminAssignedDoctorId = doctorId;
    poolItem.adminAssignedDoctorName = doctorName;
    poolItem.assignedDate = assignedDate;
    poolItem.assignedTime = assignedTime;
    poolItem.poolStatus = requiresApproval ? 'admin_pending_approval' : 'admin_assigned';
    poolItem.adminApprovalRequired = requiresApproval;
    poolItem.updatedAt = new Date().toISOString();

    pool[itemIndex] = poolItem;

    // Write updated pool
    await writeToGCS(BUCKETS.appointments, 'appointment-pool/pool.json', pool);
    await writeToGCS(BUCKETS.appointments, `appointment-pool/items/${poolId}.json`, poolItem);

    if (!requiresApproval) {
      // Update the original appointment
      let appointments = await fetchFromGCS(BUCKETS.appointments, 'appointments.json') || [];
      const aptIndex = appointments.findIndex(a => a.id === poolItem.appointmentId);
      
      if (aptIndex !== -1) {
        appointments[aptIndex] = {
          ...appointments[aptIndex],
          doctorId: doctorId,
          doctorName: doctorName,
          appointmentDate: assignedDate,
          appointmentTime: assignedTime,
          status: 'confirmed',
          poolId: poolId,
          assignedBy: adminId,
          updatedAt: new Date().toISOString()
        };
        await writeToGCS(BUCKETS.appointments, 'appointments.json', appointments);
      }
    }

    // Emit WebSocket event
    const io = req.app.get('io');
    io.emit('pool-updated', { poolId, action: 'admin_assigned', doctorId, adminId });

    // Create notification for the assigned doctor
    try {
      const GCS_API_URL = process.env.GCS_API_URL || 'http://localhost:3012';
      await fetch(`${GCS_API_URL}/api/notifications/doctor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorId: doctorId,
          type: 'appointment_assigned',
          title: 'นัดหมายใหม่มอบหมายให้คุณ',
          message: `มีนัดหมายใหม่จาก ${poolItem.patientName} รอการยืนยันของคุณ`,
          data: {
            appointmentId: poolItem.appointmentId || poolId,
            poolId: poolId,
            patientId: poolItem.patientId,
            patientName: poolItem.patientName,
            appointmentDate: assignedDate,
            appointmentTime: assignedTime,
            urgency: poolItem.urgency,
            symptoms: poolItem.symptoms,
            assignedBy: adminName || adminId
          }
        })
      });
      console.log(`📬 Notification sent to doctor ${doctorId} for appointment assignment`);
    } catch (notifError) {
      console.error('⚠️ Failed to send notification to doctor:', notifError.message);
      // Don't fail the assignment if notification fails
    }

    console.log(`✅ Pool item ${poolId} assigned by admin ${adminId} to doctor ${doctorId}`);
    res.json({
      success: true,
      poolItem,
      requiresApproval,
      message: requiresApproval 
        ? 'Appointment assigned, pending approval'
        : 'Appointment assigned successfully'
    });
  } catch (error) {
    console.error('❌ Admin assign error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Confirm appointment (change status) with notifications
 */
app.put('/api/appointments/:appointmentId/status', authenticateToken, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { status, doctorId, doctorName, appointmentDate, appointmentTime, notes, confirmedBy, confirmedAt, rejectedBy, rejectedAt } = req.body;
    console.log(`📌 Updating appointment ${appointmentId} status to ${status}...`);

    let appointments = await fetchFromGCS(BUCKETS.appointments, 'appointments.json') || [];
    const aptIndex = appointments.findIndex(a => a.id === appointmentId);

    if (aptIndex === -1) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const appointment = appointments[aptIndex];
    const patientId = appointment.patientId;

    // Update appointment
    appointments[aptIndex] = {
      ...appointment,
      status,
      ...(doctorId && { doctorId }),
      ...(doctorName && { doctorName }),
      ...(appointmentDate && { appointmentDate }),
      ...(appointmentTime && { appointmentTime }),
      ...(notes && { notes }),
      ...(confirmedBy && { confirmedBy }),
      ...(confirmedAt && { confirmedAt }),
      ...(rejectedBy && { rejectedBy }),
      ...(rejectedAt && { rejectedAt }),
      updatedAt: new Date().toISOString()
    };

    await writeToGCS(BUCKETS.appointments, 'appointments.json', appointments);

    // Send notifications based on status change
    try {
      if (status === 'confirmed') {
        // Notify patient about confirmation
        await sendPatientNotification(patientId, {
          type: 'appointment_confirmed',
          title: 'นัดหมายได้รับการยืนยัน / Appointment Confirmed',
          message: `แพทย์ ${doctorName || appointment.doctorName} ยืนยันนัดหมายของคุณในวันที่ ${appointmentDate || appointment.appointmentDate} เวลา ${appointmentTime || appointment.appointmentTime}`,
          appointmentId,
          doctorName: doctorName || appointment.doctorName,
          appointmentDate: appointmentDate || appointment.appointmentDate,
          appointmentTime: appointmentTime || appointment.appointmentTime,
          appointmentType: appointment.appointmentType
        });
        console.log('✅ Confirmation notification sent to patient');

        // Generate meeting link for online appointments
        if (appointment.appointmentType === 'online' || appointment.appointmentType === 'telehealth') {
          const meetingLink = `https://meet.google.com/${generateMeetingCode()}`;
          appointments[aptIndex].meetingLink = meetingLink;
          await writeToGCS(BUCKETS.appointments, 'appointments.json', appointments);
          console.log('✅ Meeting link generated:', meetingLink);
        }
      } else if (status === 'declined' || status === 'in_pool') {
        // Notify patient about decline and pool reassignment
        await sendPatientNotification(patientId, {
          type: 'appointment_declined',
          title: 'นัดหมายถูกส่งต่อ / Appointment Reassigned',
          message: `แพทย์ ${appointment.doctorName} ไม่สามารถรับนัดหมายได้ ระบบกำลังจัดสรรแพทย์ท่านอื่นให้คุณ`,
          appointmentId,
          originalDoctorName: appointment.doctorName
        });
        console.log('✅ Decline notification sent to patient');
      } else if (status === 'cancelled') {
        await sendPatientNotification(patientId, {
          type: 'appointment_cancelled',
          title: 'นัดหมายถูกยกเลิก / Appointment Cancelled',
          message: `นัดหมายของคุณถูกยกเลิก${notes ? ': ' + notes : ''}`,
          appointmentId
        });
        console.log('✅ Cancellation notification sent to patient');
      } else if (status === 'completed') {
        await sendPatientNotification(patientId, {
          type: 'appointment_completed',
          title: 'การนัดหมายเสร็จสิ้น / Appointment Completed',
          message: `การนัดหมายกับ ${appointment.doctorName} เสร็จสิ้นแล้ว เวชระเบียนจะถูกส่งให้คุณเร็วๆ นี้`,
          appointmentId,
          doctorName: appointment.doctorName
        });
        console.log('✅ Completion notification sent to patient');
      }
    } catch (notifError) {
      console.error('⚠️ Notification error (non-blocking):', notifError.message);
    }

    // Emit WebSocket event
    const io = req.app.get('io');
    io.emit('appointment-updated', { appointmentId, status });

    console.log(`✅ Appointment ${appointmentId} updated to status: ${status}`);
    res.json({
      success: true,
      appointment: appointments[aptIndex],
      message: 'Appointment status updated'
    });
  } catch (error) {
    console.error('❌ Appointment status update error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Send notification to patient
 */
async function sendPatientNotification(patientId, notification) {
  try {
    const notificationPath = `patients/${patientId}/notifications.json`;
    let notifications = await fetchFromGCS(BUCKETS.patient, notificationPath) || {
      patientId,
      notifications: [],
      lastUpdated: new Date().toISOString()
    };

    const newNotification = {
      id: `NOTIF-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      ...notification,
      isRead: false,
      createdAt: new Date().toISOString()
    };

    notifications.notifications = notifications.notifications || [];
    notifications.notifications.unshift(newNotification);
    notifications.lastUpdated = new Date().toISOString();

    // Keep only last 100 notifications
    if (notifications.notifications.length > 100) {
      notifications.notifications = notifications.notifications.slice(0, 100);
    }

    await writeToGCS(BUCKETS.patient, notificationPath, notifications);
    return true;
  } catch (error) {
    console.error('❌ Error sending notification:', error.message);
    throw error;
  }
}

/**
 * Generate meeting code for Google Meet style links
 */
function generateMeetingCode() {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const part1 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const part3 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${part1}-${part2}-${part3}`;
}

// ============================================================================
// METADATA (Reference Data)
// ============================================================================

app.get('/api/metadata/medications', async (req, res) => {
  try {
    const medications = await fetchFromGCS(BUCKETS.metadata, 'medications.json') || [];
    res.json({ medications });
  } catch (error) {
    console.error('Medications fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/metadata/lab-tests', async (req, res) => {
  try {
    const labTests = await fetchFromGCS(BUCKETS.metadata, 'lab-tests.json') || [];
    res.json({ labTests });
  } catch (error) {
    console.error('Lab tests fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/metadata/icd10-codes', async (req, res) => {
  try {
    const icd10Codes = await fetchFromGCS(BUCKETS.metadata, 'icd10-codes.json') || [];
    res.json({ icd10Codes });
  } catch (error) {
    console.error('ICD-10 codes fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/metadata/drug-interactions', async (req, res) => {
  try {
    const drugInteractions = await fetchFromGCS(BUCKETS.metadata, 'drug-interactions.json') || [];
    res.json({ drugInteractions });
  } catch (error) {
    console.error('Drug interactions fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// AUDIT LOGGING
// ============================================================================

async function logAuditAccess(auditEntry) {
  try {
    const { patientId, userId, action, resourceId } = auditEntry;
    const logId = `${patientId}_${new Date().toISOString().split('T')[0]}`;

    const existingLog = await fetchFromGCS(BUCKETS.patient, `audit/access-logs/${logId}.json`) || { entries: [] };

    existingLog.entries.push({
      ...auditEntry,
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    });

    await writeToGCS(BUCKETS.patient, `audit/access-logs/${logId}.json`, existingLog);
  } catch (error) {
    console.error('Audit logging error:', error);
  }
}

// ============================================================================
// START SERVER WITH GCS VERIFICATION
// ============================================================================

async function startServer() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🏥 IZARA DOCTOR PORTAL - MAIN API SERVER');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Start listening immediately for faster startup
  server.listen(PORT, '0.0.0.0', () => {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`🚀 Main API Server running on http://localhost:${PORT}`);
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('📦 Connected Buckets:');
    Object.entries(BUCKETS).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });
    console.log('\n🔗 Endpoints:');
    console.log('   GET  /api/health');
    console.log('   GET  /api/dashboard/:doctorId');
    console.log('   GET  /api/patients');
    console.log('   GET  /api/patients/:patientId');
    console.log('   POST /api/emr');
    console.log('   GET  /api/emr/patient/:patientId');
    console.log('   POST /api/prescriptions');
    console.log('   GET  /api/prescriptions/patient/:patientId');
    console.log('   POST /api/lab-orders');
    console.log('   GET  /api/lab-orders/patient/:patientId');
    console.log('   GET  /api/queue/doctor/:doctorId');
    console.log('   POST /api/queue/call-next');
    console.log('   POST /api/queue/skip');
    console.log('   GET  /api/appointments');
    console.log('   GET  /api/appointments/:appointmentId');
    console.log('   GET  /api/metadata/*');
    console.log('\n🔌 WebSocket: ws://localhost:' + PORT + '/ws');
    console.log('\n📡 GCS API Server: ' + GCS_API_URL);
    console.log('\n═══════════════════════════════════════════════════════════════\n');
  });

  // Verify GCS connection in the background (non-blocking)
  verifyGCSConnection().then(gcsConnected => {
    if (!gcsConnected) {
      console.error('⚠️  WARNING: Could not connect to GCS');
      console.error('   Data operations may fail\n');
    }
  });
}

// Start the server
startServer();

module.exports = { app, server };
