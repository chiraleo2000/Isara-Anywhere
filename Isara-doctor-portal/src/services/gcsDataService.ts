/**
 * GCS Data Service - Google Cloud Storage Integration
 *
 * Handles read/write operations for all 5 Izara GCS buckets:
 * - izara-users-credentials (Auth)
 * - izara-doctors-data (Doctor)
 * - izara-patients-data (Patient)
 * - izara-appointments (Appointments)
 * - izara-meta-data (Reference)
 * 
 * NOTE: All GCS operations go through the GCS API server proxy
 * because the buckets are private and require authentication.
 */

import config, { GcsBucketType, getGcsBucketName } from './config';

// GCS API Server URL (proxied by Vite in development)
const GCS_API_BASE = '/api/storage';

// ============================================================================
// TYPES
// ============================================================================

export interface GCSReadOptions {
  cache?: boolean;
  cacheTTL?: number; // milliseconds
}

export interface GCSWriteOptions {
  makePublic?: boolean;
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface GCSWriteResult {
  success: boolean;
  url?: string;
  error?: string;
}

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const cache: Map<string, CacheEntry<any>> = new Map();
const DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(bucket: GcsBucketType, path: string): string {
  return `${bucket}:${path}`;
}

function getFromCache<T>(bucket: GcsBucketType, path: string): T | null {
  const key = getCacheKey(bucket, path);
  const entry = cache.get(key);

  if (!entry) return null;

  const now = Date.now();
  if (now - entry.timestamp > entry.ttl) {
    cache.delete(key);
    return null;
  }

  return entry.data as T;
}

function setCache<T>(bucket: GcsBucketType, path: string, data: T, ttl: number = DEFAULT_CACHE_TTL): void {
  const key = getCacheKey(bucket, path);
  cache.set(key, { data, timestamp: Date.now(), ttl });
}

export function clearCache(bucket?: GcsBucketType): void {
  if (bucket) {
    const prefix = `${bucket}:`;
    for (const key of cache.keys()) {
      if (key.startsWith(prefix)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
  console.log('🗑️ Cache cleared', bucket ? `for bucket: ${bucket}` : '(all)');
}

export function invalidateCache(bucket: GcsBucketType, path: string): void {
  const key = getCacheKey(bucket, path);
  cache.delete(key);
}

// ============================================================================
// READ OPERATIONS (From GCS Public Buckets)
// ============================================================================

/**
 * Fetch JSON data from a GCS bucket via API proxy
 */
export async function fetchFromGCS<T>(
  bucket: GcsBucketType,
  path: string,
  options: GCSReadOptions = {}
): Promise<T | null> {
  const { cache: useCache = true, cacheTTL = DEFAULT_CACHE_TTL } = options;

  // Check cache first
  if (useCache) {
    const cached = getFromCache<T>(bucket, path);
    if (cached !== null) {
      console.log(`📦 Cache hit: ${bucket}/${path}`);
      return cached;
    }
  }

  // Use API proxy for GCS reads (buckets are private)
  const apiUrl = `${GCS_API_BASE}/read?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(path)}`;
  console.log(`🌐 Fetching via API: ${bucket}/${path}`);

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`⚠️ Not found: ${bucket}/${path}`);
        return null;
      }
      throw new Error(`GCS fetch failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as T;

    // Store in cache
    if (useCache) {
      setCache(bucket, path, data, cacheTTL);
    }

    console.log(`✅ Fetched: ${bucket}/${path}`);
    return data;
  } catch (error: any) {
    console.error(`❌ GCS fetch error for ${bucket}/${path}:`, error.message);
    return null;
  }
}

/**
 * Fetch a list/array from GCS
 */
export async function fetchListFromGCS<T>(
  bucket: GcsBucketType,
  path: string,
  options: GCSReadOptions = {}
): Promise<T[]> {
  const result = await fetchFromGCS<T[]>(bucket, path, options);
  return result || [];
}

/**
 * Check if an object exists in GCS via API proxy
 */
export async function existsInGCS(bucket: GcsBucketType, path: string): Promise<boolean> {
  const apiUrl = `${GCS_API_BASE}/read?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(path)}`;

  try {
    const response = await fetch(apiUrl, { method: 'GET' });
    return response.ok;
  } catch {
    return false;
  }
}

// ============================================================================
// WRITE OPERATIONS (Via Backend API - GCS Only, No Local Fallback)
// ============================================================================

/**
 * Write JSON data to GCS via backend API proxy
 * Uses the GCS API server (proxied via Vite)
 * NO localStorage fallback - all data must go to GCS
 */
export async function writeToGCS<T>(
  bucket: GcsBucketType,
  path: string,
  data: T,
  options: GCSWriteOptions = {}
): Promise<GCSWriteResult> {
  const { makePublic = true } = options;

  // Use proxied API endpoint
  const apiUrl = `${GCS_API_BASE}/write`;

  console.log(`💾 Writing to GCS: ${bucket}/${path}`);

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bucket: bucket, // Use bucket type, server will resolve to actual bucket name
        path: path,
        data: data,
        makePublic: makePublic,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GCS write failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    // Invalidate cache for this path
    invalidateCache(bucket, path);

    console.log(`✅ Written to GCS: ${bucket}/${path}`);

    return {
      success: true,
      url: result.url,
    };
  } catch (error: any) {
    console.error(`❌ GCS write error for ${bucket}/${path}:`, error.message);

    // NO localStorage fallback - return error
    return {
      success: false,
      error: `GCS write failed: ${error.message}. Ensure the GCS API server is running.`,
    };
  }
}

/**
 * Delete an object from GCS via backend API proxy
 */
export async function deleteFromGCS(
  bucket: GcsBucketType,
  path: string
): Promise<boolean> {
  const apiUrl = `${GCS_API_BASE}/delete`;

  console.log(`🗑️ Deleting from GCS: ${bucket}/${path}`);

  try {
    const response = await fetch(apiUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bucket: bucket, // Use bucket type, server will resolve to actual bucket name
        path: path,
      }),
    });

    if (!response.ok) {
      throw new Error(`Delete failed: ${response.status}`);
    }

    // Invalidate cache
    invalidateCache(bucket, path);

    console.log(`✅ Deleted from GCS: ${bucket}/${path}`);
    return true;
  } catch (error: any) {
    console.error(`❌ GCS delete error:`, error.message);
    return false;
  }
}

// ============================================================================
// BUCKET-SPECIFIC DATA FETCHERS
// ============================================================================

// --- CREDENTIALS BUCKET (izara-users-credentials) ---
// Documented paths: users/{id}.json, sessions/{id}.json, oauth/tokens/{id}.json, login-history/{id}.json

export async function fetchUserById(userId: string): Promise<any | null> {
  return fetchFromGCS('credentials', `users/${userId}.json`);
}

export async function saveUser(userId: string, userData: any): Promise<GCSWriteResult> {
  return writeToGCS('credentials', `users/${userId}.json`, userData);
}

export async function fetchUserByEmail(email: string): Promise<any | null> {
  // First try to fetch all users index, then find by email
  const usersIndex = await fetchFromGCS<any[]>('credentials', 'users/index.json');
  if (usersIndex) {
    const userRef = usersIndex.find(u => u.email === email);
    if (userRef) {
      return fetchUserById(userRef.id);
    }
  }
  return null;
}

export async function fetchSession(sessionId: string): Promise<any | null> {
  return fetchFromGCS('credentials', `sessions/${sessionId}.json`);
}

export async function saveSession(sessionId: string, sessionData: any): Promise<GCSWriteResult> {
  return writeToGCS('credentials', `sessions/${sessionId}.json`, sessionData);
}

export async function deleteSession(sessionId: string): Promise<boolean> {
  return deleteFromGCS('credentials', `sessions/${sessionId}.json`);
}

export async function fetchOAuthTokens(userId: string): Promise<any | null> {
  return fetchFromGCS('credentials', `oauth/tokens/${userId}.json`);
}

export async function saveOAuthTokens(userId: string, tokens: any): Promise<GCSWriteResult> {
  return writeToGCS('credentials', `oauth/tokens/${userId}.json`, tokens);
}

export async function fetchLoginHistory(userId: string): Promise<any[]> {
  return fetchListFromGCS('credentials', `login-history/${userId}.json`);
}

export async function saveLoginHistory(userId: string, history: any[]): Promise<GCSWriteResult> {
  return writeToGCS('credentials', `login-history/${userId}.json`, history);
}

// --- DOCTORS BUCKET (izara-doctors-data) ---
// Documented paths: doctors.json, queue.json, doctors/{id}/schedule.json

export async function fetchAllDoctors(): Promise<any[]> {
  return fetchListFromGCS('doctor', 'doctors.json');
}

export async function saveDoctors(doctors: any[]): Promise<GCSWriteResult> {
  return writeToGCS('doctor', 'doctors.json', doctors);
}

export async function fetchDoctorById(doctorId: string): Promise<any | null> {
  const doctors = await fetchAllDoctors();
  return doctors.find(d => d.id === doctorId) || null;
}

export async function saveDoctorProfile(doctorId: string, profile: any): Promise<GCSWriteResult> {
  const doctors = await fetchAllDoctors();
  const existingIndex = doctors.findIndex(d => d.id === doctorId);
  if (existingIndex >= 0) {
    doctors[existingIndex] = { ...doctors[existingIndex], ...profile };
  } else {
    doctors.push(profile);
  }
  return writeToGCS('doctor', 'doctors.json', doctors);
}

// Patient Queue - Shared queue file (not per-doctor)
export async function fetchPatientQueue(): Promise<any[]> {
  return fetchListFromGCS('doctor', 'queue.json');
}

export async function savePatientQueue(queue: any[]): Promise<GCSWriteResult> {
  return writeToGCS('doctor', 'queue.json', queue);
}

// Get queue entries for a specific doctor
export async function fetchDoctorQueue(doctorId: string): Promise<any[]> {
  const allQueue = await fetchPatientQueue();
  return allQueue.filter(q => q.doctorId === doctorId);
}

// Doctor Schedule - Per-doctor schedule
export async function fetchDoctorSchedule(doctorId: string): Promise<any | null> {
  return fetchFromGCS('doctor', `doctors/${doctorId}/schedule.json`);
}

export async function saveDoctorSchedule(doctorId: string, schedule: any): Promise<GCSWriteResult> {
  return writeToGCS('doctor', `doctors/${doctorId}/schedule.json`, schedule);
}

// Doctor Stats
export async function fetchDoctorStats(doctorId: string): Promise<any | null> {
  return fetchFromGCS('doctor', `doctors/${doctorId}/stats.json`);
}

export async function saveDoctorStats(doctorId: string, stats: any): Promise<GCSWriteResult> {
  return writeToGCS('doctor', `doctors/${doctorId}/stats.json`, stats);
}

// --- PATIENTS BUCKET (izara-patients-data) ---
// Documented paths:
// - patients.json (demographics)
// - emrs.json (all EMR records)
// - prescriptions.json (all prescriptions)
// - lab-orders.json (all lab orders)
// - imaging-orders.json (all imaging orders)
// - patients/{id}/phr.json (PHR data)
// - patients/{id}/vital-signs.json (vitals)
// - patients/{id}/pdpa/consents.json (PDPA consents)
// - patients/{id}/pdpa/living-will.json (living wills)
// - patients/{id}/timeline.json (timeline)
// - audit/access-logs/{id}.json (audit logs)

// Patient Demographics - Single file for all patients
export async function fetchAllPatients(): Promise<any[]> {
  return fetchListFromGCS('patient', 'patients.json');
}

// Alias for fetchAllPatients (used by usePatients hook)
export const getPatients = fetchAllPatients;

export async function saveAllPatients(patients: any[]): Promise<GCSWriteResult> {
  return writeToGCS('patient', 'patients.json', patients);
}

export async function fetchPatientById(patientId: string): Promise<any | null> {
  const patients = await fetchAllPatients();
  return patients.find(p => p.id === patientId) || null;
}

export async function savePatientProfile(patientId: string, profile: any): Promise<GCSWriteResult> {
  const patients = await fetchAllPatients();
  const existingIndex = patients.findIndex(p => p.id === patientId);
  if (existingIndex >= 0) {
    patients[existingIndex] = { ...patients[existingIndex], ...profile };
  } else {
    patients.push(profile);
  }
  return writeToGCS('patient', 'patients.json', patients);
}

// EMR Records - Single file for all EMRs
export async function fetchAllEMRs(): Promise<any[]> {
  return fetchListFromGCS('patient', 'emrs.json');
}

export async function saveAllEMRs(emrs: any[]): Promise<GCSWriteResult> {
  return writeToGCS('patient', 'emrs.json', emrs);
}

export async function fetchPatientEMRs(patientId: string): Promise<any[]> {
  const allEMRs = await fetchAllEMRs();
  return allEMRs.filter(e => e.patientId === patientId);
}

export async function fetchEMRById(emrId: string): Promise<any | null> {
  const allEMRs = await fetchAllEMRs();
  return allEMRs.find(e => e.id === emrId) || null;
}

export async function saveEMR(emr: any): Promise<GCSWriteResult> {
  const allEMRs = await fetchAllEMRs();
  const existingIndex = allEMRs.findIndex(e => e.id === emr.id);
  if (existingIndex >= 0) {
    allEMRs[existingIndex] = emr;
  } else {
    allEMRs.push(emr);
  }
  return writeToGCS('patient', 'emrs.json', allEMRs);
}

// Alias for saveEMR with patientId/emrId signature (used by emrService)
export async function savePatientEMR(patientId: string, emrId: string, emr: any): Promise<GCSWriteResult> {
  return saveEMR({ ...emr, patientId, id: emrId });
}

// Prescriptions - Single file for all prescriptions
export async function fetchAllPrescriptions(): Promise<any[]> {
  return fetchListFromGCS('patient', 'prescriptions.json');
}

export async function saveAllPrescriptions(prescriptions: any[]): Promise<GCSWriteResult> {
  return writeToGCS('patient', 'prescriptions.json', prescriptions);
}

export async function fetchPatientPrescriptions(patientId: string): Promise<any[]> {
  const allPrescriptions = await fetchAllPrescriptions();
  return allPrescriptions.filter(p => p.patientId === patientId);
}

export async function fetchPrescriptionById(prescriptionId: string): Promise<any | null> {
  const allPrescriptions = await fetchAllPrescriptions();
  return allPrescriptions.find(p => p.id === prescriptionId) || null;
}

export async function savePrescription(prescription: any): Promise<GCSWriteResult> {
  const allPrescriptions = await fetchAllPrescriptions();
  const existingIndex = allPrescriptions.findIndex(p => p.id === prescription.id);
  if (existingIndex >= 0) {
    allPrescriptions[existingIndex] = prescription;
  } else {
    allPrescriptions.push(prescription);
  }
  return writeToGCS('patient', 'prescriptions.json', allPrescriptions);
}

// Lab Orders - Single file for all lab orders
export async function fetchAllLabOrders(): Promise<any[]> {
  return fetchListFromGCS('patient', 'lab-orders.json');
}

export async function saveAllLabOrders(labOrders: any[]): Promise<GCSWriteResult> {
  return writeToGCS('patient', 'lab-orders.json', labOrders);
}

export async function fetchPatientLabOrders(patientId: string): Promise<any[]> {
  const allLabOrders = await fetchAllLabOrders();
  return allLabOrders.filter(l => l.patientId === patientId);
}

export async function fetchLabOrderById(labOrderId: string): Promise<any | null> {
  const allLabOrders = await fetchAllLabOrders();
  return allLabOrders.find(l => l.id === labOrderId) || null;
}

export async function saveLabOrder(labOrder: any): Promise<GCSWriteResult> {
  const allLabOrders = await fetchAllLabOrders();
  const existingIndex = allLabOrders.findIndex(l => l.id === labOrder.id);
  if (existingIndex >= 0) {
    allLabOrders[existingIndex] = labOrder;
  } else {
    allLabOrders.push(labOrder);
  }
  return writeToGCS('patient', 'lab-orders.json', allLabOrders);
}

// Imaging Orders - Single file for all imaging orders
export async function fetchAllImagingOrders(): Promise<any[]> {
  return fetchListFromGCS('patient', 'imaging-orders.json');
}

export async function saveAllImagingOrders(imagingOrders: any[]): Promise<GCSWriteResult> {
  return writeToGCS('patient', 'imaging-orders.json', imagingOrders);
}

export async function fetchPatientImagingOrders(patientId: string): Promise<any[]> {
  const allImagingOrders = await fetchAllImagingOrders();
  return allImagingOrders.filter(i => i.patientId === patientId);
}

export async function fetchImagingOrderById(imagingOrderId: string): Promise<any | null> {
  const allImagingOrders = await fetchAllImagingOrders();
  return allImagingOrders.find(i => i.id === imagingOrderId) || null;
}

export async function saveImagingOrder(imagingOrder: any): Promise<GCSWriteResult> {
  const allImagingOrders = await fetchAllImagingOrders();
  const existingIndex = allImagingOrders.findIndex(i => i.id === imagingOrder.id);
  if (existingIndex >= 0) {
    allImagingOrders[existingIndex] = imagingOrder;
  } else {
    allImagingOrders.push(imagingOrder);
  }
  return writeToGCS('patient', 'imaging-orders.json', allImagingOrders);
}

// Patient Vital Signs - Per-patient file
export async function fetchPatientVitals(patientId: string): Promise<any | null> {
  return fetchFromGCS('patient', `patients/${patientId}/vital-signs.json`);
}

export async function savePatientVitals(patientId: string, vitals: any): Promise<GCSWriteResult> {
  return writeToGCS('patient', `patients/${patientId}/vital-signs.json`, vitals);
}

// Patient PHR - Per-patient file
export async function fetchPatientPHR(patientId: string): Promise<any | null> {
  return fetchFromGCS('patient', `patients/${patientId}/phr.json`);
}

export async function savePatientPHR(patientId: string, phr: any): Promise<GCSWriteResult> {
  return writeToGCS('patient', `patients/${patientId}/phr.json`, phr);
}

// Patient PDPA Consents - Per-patient file
export async function fetchPatientConsents(patientId: string): Promise<any | null> {
  return fetchFromGCS('patient', `patients/${patientId}/pdpa/consents.json`);
}

export async function savePatientConsents(patientId: string, consents: any): Promise<GCSWriteResult> {
  return writeToGCS('patient', `patients/${patientId}/pdpa/consents.json`, consents);
}

// Verify consent for a specific doctor/purpose
export async function verifyPatientConsent(
  patientId: string,
  doctorId: string,
  dataTypes: string[]
): Promise<boolean> {
  const consents = await fetchPatientConsents(patientId);
  if (!consents || !consents.activeConsents) return false;

  // Check if doctor has valid consent for all requested data types
  const doctorConsent = consents.activeConsents.find(
    (c: any) => c.doctorId === doctorId && c.status === 'active'
  );

  if (!doctorConsent) return false;

  // Check if consent covers all requested data types
  return dataTypes.every(dt => doctorConsent.dataTypes?.includes(dt));
}

// Patient Living Will - Per-patient file
export async function fetchPatientLivingWill(patientId: string): Promise<any | null> {
  return fetchFromGCS('patient', `patients/${patientId}/living-will.json`);
}

export async function savePatientLivingWill(patientId: string, livingWill: any): Promise<GCSWriteResult> {
  return writeToGCS('patient', `patients/${patientId}/living-will.json`, livingWill);
}

// Patient Timeline - Per-patient file
export async function fetchPatientTimeline(patientId: string): Promise<any[]> {
  return fetchListFromGCS('patient', `patients/${patientId}/timeline.json`);
}

export async function savePatientTimeline(patientId: string, timeline: any[]): Promise<GCSWriteResult> {
  return writeToGCS('patient', `patients/${patientId}/timeline.json`, timeline);
}

export async function addTimelineEntry(patientId: string, entry: any): Promise<GCSWriteResult> {
  const timeline = await fetchPatientTimeline(patientId);
  timeline.push({
    ...entry,
    id: `tl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
  });
  return savePatientTimeline(patientId, timeline);
}

// Audit Logs - Per-log file in patient bucket
export async function fetchAuditLogs(logId: string): Promise<any | null> {
  return fetchFromGCS('patient', `audit/access-logs/${logId}.json`);
}

export async function saveAuditLog(logId: string, log: any): Promise<GCSWriteResult> {
  return writeToGCS('patient', `audit/access-logs/${logId}.json`, log);
}

export async function appendAuditLog(patientId: string, auditEntry: any): Promise<GCSWriteResult> {
  const logId = `${patientId}_${new Date().toISOString().split('T')[0]}`;
  const existingLog = await fetchAuditLogs(logId) || { entries: [] };
  existingLog.entries.push({
    ...auditEntry,
    id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
  });
  return saveAuditLog(logId, existingLog);
}

// --- APPOINTMENTS BUCKET (izara-appointments) ---
// Documented paths:
// - appointments.json (main appointment index)
// - appointments/{id}.json (individual appointments)
// - appointments/{id}/meeting-link.json (Google Meet links)
// - {doctorId}/{date}.json (Doctor daily appointments)

export async function fetchAllAppointments(options: GCSReadOptions = {}): Promise<any[]> {
  return fetchListFromGCS('appointments', 'appointments.json', options);
}

export async function saveAllAppointments(appointments: any[]): Promise<GCSWriteResult> {
  return writeToGCS('appointments', 'appointments.json', appointments);
}

export async function fetchAppointmentById(appointmentId: string): Promise<any | null> {
  // First try individual file
  let appointment = await fetchFromGCS('appointments', `appointments/${appointmentId}.json`);
  
  // If not found, try with /details.json subfolder (legacy format)
  if (!appointment) {
    appointment = await fetchFromGCS('appointments', `appointments/${appointmentId}/details.json`);
  }
  
  // If still not found, search in main appointments.json
  if (!appointment) {
    const allAppointments = await fetchAllAppointments();
    appointment = allAppointments.find((a: any) => a.id === appointmentId) || null;
  }
  
  return appointment;
}

export async function saveAppointment(appointment: any): Promise<GCSWriteResult> {
  console.log(`📅 Saving appointment: ${appointment.id}`);
  
  // Invalidate cache before writing to ensure fresh data
  invalidateCache('appointments', 'appointments.json');
  invalidateCache('appointments', `appointments/${appointment.id}.json`);
  
  // Save individual appointment
  const result = await writeToGCS('appointments', `appointments/${appointment.id}.json`, appointment);

  // Update the main index
  if (result.success) {
    // Fetch fresh data (cache was invalidated)
    const allAppointments = await fetchAllAppointments();
    const existingIndex = allAppointments.findIndex((a: any) => a.id === appointment.id);
    if (existingIndex >= 0) {
      allAppointments[existingIndex] = appointment;
    } else {
      allAppointments.push(appointment);
    }
    const indexResult = await writeToGCS('appointments', 'appointments.json', allAppointments);
    
    // Invalidate cache again after write
    invalidateCache('appointments', 'appointments.json');
    
    console.log(`✅ Appointment saved: ${appointment.id}, index updated: ${indexResult.success}`);
  }

  return result;
}

export async function deleteAppointment(appointmentId: string): Promise<boolean> {
  // Remove from index
  const allAppointments = await fetchAllAppointments();
  const filteredAppointments = allAppointments.filter(a => a.id !== appointmentId);
  await writeToGCS('appointments', 'appointments.json', filteredAppointments);

  // Delete individual appointment file
  await deleteFromGCS('appointments', `appointments/${appointmentId}.json`);

  // Delete meeting link if exists
  await deleteFromGCS('appointments', `appointments/${appointmentId}/meeting-link.json`);

  return true;
}

// Meeting Link Management
export async function fetchMeetingLink(appointmentId: string): Promise<any | null> {
  return fetchFromGCS('appointments', `appointments/${appointmentId}/meeting-link.json`);
}

export async function saveMeetingLink(appointmentId: string, meetingData: {
  meetLink: string;
  calendarEventId?: string;
  createdAt?: string;
  expiresAt?: string;
}): Promise<GCSWriteResult> {
  const data = {
    ...meetingData,
    appointmentId,
    createdAt: meetingData.createdAt || new Date().toISOString(),
  };
  return writeToGCS('appointments', `appointments/${appointmentId}/meeting-link.json`, data);
}

export async function deleteMeetingLink(appointmentId: string): Promise<boolean> {
  return deleteFromGCS('appointments', `appointments/${appointmentId}/meeting-link.json`);
}

// Doctor Daily Appointments
export async function fetchDoctorAppointments(doctorId: string, date?: string): Promise<any[]> {
  if (date) {
    // Try doctor-specific file first, then filter from all
    const dayAppointments = await fetchListFromGCS('appointments', `${doctorId}/${date}.json`);
    if (dayAppointments && dayAppointments.length > 0) {
      return dayAppointments;
    }
  }
  
  // Fetch all and filter by ALL possible doctor ID fields
  const allAppointments = await fetchAllAppointments();
  const filtered = allAppointments.filter(a => 
    a.doctorId === doctorId || 
    a.assignedDoctorId === doctorId || 
    a.adminAssignedDoctorId === doctorId
  );
  
  // If date specified, filter by date
  if (date) {
    return filtered.filter(a => {
      const aptDate = a.date || a.appointmentDate;
      return aptDate && aptDate.startsWith(date);
    });
  }
  
  return filtered;
}

export async function saveDoctorDayAppointments(doctorId: string, date: string, appointments: any[]): Promise<GCSWriteResult> {
  return writeToGCS('appointments', `${doctorId}/${date}.json`, appointments);
}

// Patient Appointments
export async function fetchPatientAppointments(patientId: string): Promise<any[]> {
  const allAppointments = await fetchAllAppointments();
  return allAppointments.filter(a => a.patientId === patientId);
}

// Appointment with Meeting Link (combined fetch)
export async function fetchAppointmentWithMeetLink(appointmentId: string): Promise<any | null> {
  const [appointment, meetingLink] = await Promise.all([
    fetchAppointmentById(appointmentId),
    fetchMeetingLink(appointmentId),
  ]);

  if (!appointment) return null;

  return {
    ...appointment,
    meetingLink: meetingLink?.meetLink,
    calendarEventId: meetingLink?.calendarEventId,
  };
}

// --- APPOINTMENT POOL (izara-appointments) ---
// Documented paths:
// - appointment-pool/pool.json (pool index)
// - appointment-pool/items/{poolId}.json (individual pool items)

export interface AppointmentPoolItem {
  id: string;
  appointmentId: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  originalDoctorId?: string;
  originalDoctorName?: string;
  requiredSpecialty: string;
  matchedSpecialties: string[];
  symptoms: string[];
  symptomDescription?: string;
  urgency: 'normal' | 'urgent' | 'emergency';
  preferredDates: string[];
  preferredTimeSlot: 'morning' | 'afternoon' | 'evening';
  appointmentType: 'telehealth' | 'in_person';
  poolReason: 'no_doctor_selected' | 'doctor_unavailable' | 'doctor_rejected' | 'meeting_missed' | 'rescheduled';
  poolStatus: 'pending' | 'ai_matched' | 'doctor_claimed' | 'admin_assigned' | 'admin_pending_approval' | 'confirmed' | 'expired';
  aiMatchedDoctorId?: string;
  aiMatchedDoctorName?: string;
  aiMatchReason?: string;
  claimedByDoctorId?: string;
  claimedByDoctorName?: string;
  adminAssignedDoctorId?: string;
  adminAssignedDoctorName?: string;
  adminApprovalRequired: boolean;
  adminApproved?: boolean;
  adminApprovedBy?: string;
  adminApprovedAt?: string;
  assignedDate?: string;
  assignedTime?: string;
  missedCount: number;
  maxMissedAttempts: number;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

export async function fetchAllPoolItems(): Promise<AppointmentPoolItem[]> {
  return fetchListFromGCS('appointments', 'appointment-pool/pool.json');
}

export async function saveAllPoolItems(items: AppointmentPoolItem[]): Promise<GCSWriteResult> {
  return writeToGCS('appointments', 'appointment-pool/pool.json', items);
}

export async function fetchPoolItemById(poolId: string): Promise<AppointmentPoolItem | null> {
  return fetchFromGCS('appointments', `appointment-pool/items/${poolId}.json`);
}

export async function savePoolItem(item: AppointmentPoolItem): Promise<GCSWriteResult> {
  // Save individual item
  const result = await writeToGCS('appointments', `appointment-pool/items/${item.id}.json`, item);

  // Update the main index
  if (result.success) {
    const allItems = await fetchAllPoolItems();
    const existingIndex = allItems.findIndex(i => i.id === item.id);
    if (existingIndex >= 0) {
      allItems[existingIndex] = item;
    } else {
      allItems.push(item);
    }
    await writeToGCS('appointments', 'appointment-pool/pool.json', allItems);
  }

  return result;
}

export async function fetchPoolItemsBySpecialty(specialty: string): Promise<AppointmentPoolItem[]> {
  const allItems = await fetchAllPoolItems();
  return allItems.filter(item => 
    item.matchedSpecialties?.includes(specialty) || 
    item.requiredSpecialty === specialty
  );
}

export async function fetchPendingPoolItems(): Promise<AppointmentPoolItem[]> {
  const allItems = await fetchAllPoolItems();
  return allItems.filter(item => 
    item.poolStatus === 'pending' || item.poolStatus === 'ai_matched'
  );
}

export async function fetchPoolItemsByDoctor(doctorId: string): Promise<AppointmentPoolItem[]> {
  const allItems = await fetchAllPoolItems();
  return allItems.filter(item => 
    item.claimedByDoctorId === doctorId ||
    item.aiMatchedDoctorId === doctorId ||
    item.adminAssignedDoctorId === doctorId
  );
}

// --- METADATA BUCKET (izara-meta-data) ---
// Documented paths:
// - medications.json (drug database)
// - lab-tests.json (lab test catalog)
// - icd10-codes.json (ICD-10 diagnosis codes)
// - drug-interactions.json (drug interaction database)
// - reference-ranges.json (normal value ranges)

export async function fetchMedications(): Promise<any[]> {
  return fetchListFromGCS('metadata', 'medications.json', { cacheTTL: 30 * 60 * 1000 }); // 30 min cache
}

export async function fetchLabTests(): Promise<any[]> {
  return fetchListFromGCS('metadata', 'lab-tests.json', { cacheTTL: 30 * 60 * 1000 });
}

export async function fetchICD10Codes(): Promise<any[]> {
  return fetchListFromGCS('metadata', 'icd10-codes.json', { cacheTTL: 60 * 60 * 1000 }); // 1 hour cache
}

export async function fetchDrugInteractions(): Promise<any[]> {
  return fetchListFromGCS('metadata', 'drug-interactions.json', { cacheTTL: 30 * 60 * 1000 });
}

export async function fetchReferenceRanges(): Promise<any[]> {
  return fetchListFromGCS('metadata', 'reference-ranges.json', { cacheTTL: 60 * 60 * 1000 });
}

// Check drug interactions between medications
export async function checkDrugInteractions(drugIds: string[]): Promise<any[]> {
  const interactions = await fetchDrugInteractions();
  const foundInteractions: any[] = [];

  // Check each pair of drugs
  for (let i = 0; i < drugIds.length; i++) {
    for (let j = i + 1; j < drugIds.length; j++) {
      const drug1 = drugIds[i];
      const drug2 = drugIds[j];

      const interaction = interactions.find(
        (int: any) =>
          (int.drug1Id === drug1 && int.drug2Id === drug2) ||
          (int.drug1Id === drug2 && int.drug2Id === drug1)
      );

      if (interaction) {
        foundInteractions.push(interaction);
      }
    }
  }

  return foundInteractions;
}

// Get reference range for a specific test
export async function getReferenceRange(
  testCode: string,
  ageGroup?: 'adult' | 'pediatric' | 'geriatric',
  gender?: 'male' | 'female'
): Promise<any | null> {
  const ranges = await fetchReferenceRanges();
  return ranges.find(
    (r: any) =>
      r.testCode === testCode &&
      (!ageGroup || r.ageGroup === ageGroup || r.ageGroup === 'all') &&
      (!gender || r.gender === gender || r.gender === 'all')
  ) || null;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Core operations
  fetchFromGCS,
  fetchListFromGCS,
  writeToGCS,
  deleteFromGCS,
  existsInGCS,

  // Cache management
  clearCache,
  invalidateCache,

  // Credentials bucket (izara-users-credentials)
  fetchUserById,
  saveUser,
  fetchUserByEmail,
  fetchSession,
  saveSession,
  deleteSession,
  fetchOAuthTokens,
  saveOAuthTokens,
  fetchLoginHistory,
  saveLoginHistory,

  // Doctors bucket (izara-doctors-data)
  fetchAllDoctors,
  saveDoctors,
  fetchDoctorById,
  saveDoctorProfile,
  fetchPatientQueue,
  savePatientQueue,
  fetchDoctorQueue,
  fetchDoctorSchedule,
  saveDoctorSchedule,
  fetchDoctorStats,
  saveDoctorStats,

  // Patients bucket (izara-patients-data)
  fetchAllPatients,
  saveAllPatients,
  fetchPatientById,
  savePatientProfile,
  fetchAllEMRs,
  saveAllEMRs,
  fetchPatientEMRs,
  fetchEMRById,
  saveEMR,
  fetchAllPrescriptions,
  saveAllPrescriptions,
  fetchPatientPrescriptions,
  fetchPrescriptionById,
  savePrescription,
  fetchAllLabOrders,
  saveAllLabOrders,
  fetchPatientLabOrders,
  fetchLabOrderById,
  saveLabOrder,
  fetchAllImagingOrders,
  saveAllImagingOrders,
  fetchPatientImagingOrders,
  fetchImagingOrderById,
  saveImagingOrder,
  fetchPatientVitals,
  savePatientVitals,
  fetchPatientPHR,
  savePatientPHR,
  fetchPatientConsents,
  savePatientConsents,
  verifyPatientConsent,
  fetchPatientLivingWill,
  savePatientLivingWill,
  fetchPatientTimeline,
  savePatientTimeline,
  addTimelineEntry,
  fetchAuditLogs,
  saveAuditLog,
  appendAuditLog,

  // Appointments bucket (izara-appointments)
  fetchAllAppointments,
  saveAllAppointments,
  fetchAppointmentById,
  saveAppointment,
  deleteAppointment,
  fetchMeetingLink,
  saveMeetingLink,
  deleteMeetingLink,
  fetchDoctorAppointments,
  saveDoctorDayAppointments,
  fetchPatientAppointments,
  fetchAppointmentWithMeetLink,
  
  // Appointment Pool (izara-appointments/appointment-pool)
  fetchAllPoolItems,
  saveAllPoolItems,
  fetchPoolItemById,
  savePoolItem,
  fetchPoolItemsBySpecialty,
  fetchPendingPoolItems,
  fetchPoolItemsByDoctor,

  // Metadata bucket (izara-meta-data)
  fetchMedications,
  fetchLabTests,
  fetchICD10Codes,
  fetchDrugInteractions,
  fetchReferenceRanges,
  checkDrugInteractions,
  getReferenceRange,
};
