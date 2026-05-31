/**
 * Patient Data Service - Patient Profile & Health Records
 *
 * Uses GCS bucket: izara-patients-data
 * - patients.json (patient demographics)
 * - patients/{id}/vital-signs.json (vital signs)
 * - patients/{id}/phr.json (PHR data)
 * - patients/{id}/pdpa/consents.json (PDPA consents)
 * - patients/{id}/pdpa/living-will.json (living wills)
 * - patients/{id}/timeline.json (patient timeline)
 * - audit/access-logs/{id}.json (audit logs)
 *
 * Enforces PDPA consent verification before data access
 */

import { PatientRecord, HealthRecord, VitalSigns, ConsentRecord } from '../types';
import config from './config';
import {
  // Patient bucket (izara-patients-data)
  fetchAllPatients,
  fetchPatientById,
  savePatientProfile,
  fetchPatientVitals,
  savePatientVitals,
  fetchPatientPHR,
  fetchPatientLivingWill,
  fetchPatientConsents,
  savePatientConsents,
  verifyPatientConsent,
  fetchPatientTimeline,
  addTimelineEntry,
  appendAuditLog,
  GCSWriteResult,
} from './gcsDataService';
import { auditLogService, AuditResource } from './auditLogService';

// ============================================================================
// HELPER: Transform flat patient data to nested PatientRecord format
// ============================================================================

/**
 * Format patient address from raw data (string or object).
 */
function formatPatientAddress(rawPatient: any): string {
  if (!rawPatient.address) return '';
  if (typeof rawPatient.address === 'string') return rawPatient.address;
  const { street = '', district = '', province = '', postalCode = '' } = rawPatient.address;
  return `${street}, ${district}, ${province} ${postalCode}`;
}

/**
 * Transform flat patient data from GCS to nested PatientRecord format.
 * Handles both already-nested data and flat data.
 */
function transformPatientData(rawPatient: any): PatientRecord {
  // If already in correct nested format, return as-is
  if (rawPatient.demographics && rawPatient.contact && rawPatient.medicalInfo) {
    return rawPatient as PatientRecord;
  }

  // Calculate age from dateOfBirth if not provided
  let age = rawPatient.age || 0;
  if (!age && rawPatient.dateOfBirth) {
    const dob = new Date(rawPatient.dateOfBirth);
    const today = new Date();
    age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
  }

  // Transform flat data to nested format
  return {
    id: rawPatient.id,
    demographics: {
      name: rawPatient.name || rawPatient.nameEn || 'Unknown',
      dateOfBirth: rawPatient.dateOfBirth || '',
      age: age,
      gender: rawPatient.gender || 'other',
      photo: rawPatient.photo || `https://i.pravatar.cc/150?u=${rawPatient.id}`,
      idNumber: rawPatient.nationalId || rawPatient.idNumber || rawPatient.id,
    },
    contact: {
      phone: rawPatient.phone || '',
      email: rawPatient.email || '',
      address: formatPatientAddress(rawPatient),
      emergencyContact: rawPatient.emergencyContact || {
        name: 'Not provided',
        relationship: 'Unknown',
        phone: '',
      },
    },
    medicalInfo: {
      bloodType: rawPatient.bloodType,
      allergies: rawPatient.allergies || [],
      chronicConditions: rawPatient.chronicConditions || [],
      currentMedications: rawPatient.currentMedications || [],
    },
    lastVisit: rawPatient.lastVisit ? new Date(rawPatient.lastVisit) : undefined,
    nextAppointment: rawPatient.nextAppointment ? new Date(rawPatient.nextAppointment) : undefined,
    consentStatus: rawPatient.consentStatus || {
      hasConsent: true,
      dataTypesAllowed: ['PHR', 'EMR', 'Lab Results', 'Prescriptions'],
      expiresAt: new Date(2026, 11, 31),
    },
    riskLevel: rawPatient.riskLevel || 'low',
    isActive: rawPatient.isActive !== false,
  };
}

// ============================================================================
// PATIENT DATA SERVICE CLASS
// ============================================================================

class PatientDataService {
  private static instance: PatientDataService;

  private constructor() { }

  static getInstance(): PatientDataService {
    if (!PatientDataService.instance) {
      PatientDataService.instance = new PatientDataService();
    }
    return PatientDataService.instance;
  }

  // ===========================================================================
  // CONSENT VERIFICATION (PDPA Compliance)
  // ===========================================================================
  // Uses: patients/{id}/pdpa/consents.json

  /**
   * Verify if doctor has consent to access patient data
   * Uses: patients/{id}/pdpa/consents.json
   */
  async verifyConsent(patientId: string, doctorId: string, dataTypes?: string[]): Promise<ConsentRecord | null> {
    if (!config.features.pdpaEnabled) {
      // Return dummy consent if PDPA is disabled
      return {
        id: 'consent_disabled',
        patientId,
        doctorId,
        consentType: 'ehr-access',
        granted: true,
        scope: ['phr-access', 'ehr-access', 'data-sharing'],
      };
    }

    console.log(`🔐 Verifying consent for patient ${patientId} by doctor ${doctorId}`);

    // Use the gcsDataService verifyPatientConsent function
    const hasConsent = await verifyPatientConsent(patientId, doctorId, dataTypes || ['ehr-access']);

    if (!hasConsent) {
      console.warn(`⚠️ No valid consent found for patient ${patientId}`);
      return null;
    }

    // Fetch the full consent record
    const consentsData = await fetchPatientConsents(patientId);
    if (!consentsData?.activeConsents) {
      return null;
    }

    const consent = consentsData.activeConsents.find(
      (c: any) => c.doctorId === doctorId && c.status === 'active'
    );

    if (!consent) {
      return null;
    }

    // Check if consent is still valid
    if (consent.expiresAt && new Date(consent.expiresAt) < new Date()) {
      console.warn(`⚠️ Consent expired for patient ${patientId}`);
      return null;
    }

    console.log(`✅ Consent verified for patient ${patientId}`);
    return {
      id: consent.id,
      patientId,
      doctorId,
      consentType: consent.consentType || 'ehr-access',
      granted: true,
      grantedAt: consent.grantedAt,
      expiresAt: consent.expiresAt,
      scope: consent.dataTypes || [],
    };
  }

  /**
   * Request consent from patient
   * Uses: patients/{id}/pdpa/consents.json
   */
  async requestConsent(
    patientId: string,
    doctorId: string,
    scope: string[]
  ): Promise<GCSWriteResult> {
    console.log(`📝 Requesting consent from patient ${patientId}`);

    const existingConsents = await fetchPatientConsents(patientId) || { activeConsents: [], history: [] };

    const consentRequest = {
      id: `consent_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      doctorId,
      consentType: 'ehr-access',
      status: 'pending',
      dataTypes: scope,
      requestedAt: new Date().toISOString(),
    };

    existingConsents.activeConsents.push(consentRequest);

    return savePatientConsents(patientId, existingConsents);
  }

  /**
   * Grant consent
   * Uses: patients/{id}/pdpa/consents.json
   */
  async grantConsent(
    patientId: string,
    doctorId: string,
    scope: string[],
    expiresInDays: number = 365
  ): Promise<GCSWriteResult> {
    console.log(`✅ Granting consent for patient ${patientId} to doctor ${doctorId}`);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const existingConsents = await fetchPatientConsents(patientId) || { activeConsents: [], history: [] };

    // Check if there's a pending consent request
    const pendingIndex = existingConsents.activeConsents.findIndex(
      (c: any) => c.doctorId === doctorId && c.status === 'pending'
    );

    const consent = {
      id: `consent_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      doctorId,
      consentType: 'ehr-access',
      status: 'active',
      dataTypes: scope,
      grantedAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    if (pendingIndex >= 0) {
      // Update existing pending consent
      existingConsents.activeConsents[pendingIndex] = {
        ...existingConsents.activeConsents[pendingIndex],
        ...consent,
      };
    } else {
      // Add new consent
      existingConsents.activeConsents.push(consent);
    }

    return savePatientConsents(patientId, existingConsents);
  }

  /**
   * Revoke consent
   * Uses: patients/{id}/pdpa/consents.json
   */
  async revokeConsent(patientId: string, doctorId: string): Promise<GCSWriteResult> {
    console.log(`❌ Revoking consent for patient ${patientId} from doctor ${doctorId}`);

    const existingConsents = await fetchPatientConsents(patientId) || { activeConsents: [], history: [] };

    // Find active consent for this doctor
    const activeIndex = existingConsents.activeConsents.findIndex(
      (c: any) => c.doctorId === doctorId && c.status === 'active'
    );

    if (activeIndex >= 0) {
      // Move to history
      const revokedConsent = {
        ...existingConsents.activeConsents[activeIndex],
        status: 'revoked',
        revokedAt: new Date().toISOString(),
      };
      existingConsents.history.push(revokedConsent);
      existingConsents.activeConsents.splice(activeIndex, 1);
    }

    return savePatientConsents(patientId, existingConsents);
  }

  // ===========================================================================
  // PATIENT SEARCH & LIST
  // ===========================================================================
  // Uses: patients.json in izara-patients-data bucket

  /**
   * Search patients by name, ID, email, or phone
   * Uses: patients.json
   */
  async searchPatients(query: string): Promise<PatientRecord[]> {
    console.log(`🔍 Searching patients: "${query}"`);

    const allPatients = await this.getAllPatients();

    const lowerQuery = query.toLowerCase();
    const results = allPatients.filter(p =>
      p.demographics?.name?.toLowerCase().includes(lowerQuery) ||
      p.demographics?.idNumber?.includes(query) ||
      p.contact?.email?.toLowerCase().includes(lowerQuery) ||
      p.contact?.phone?.includes(query) ||
      p.id?.includes(query)
    );

    console.log(`✅ Found ${results.length} patients matching "${query}"`);
    return results;
  }

  /**
   * Get all patients (with optional filters)
   * Uses: patients.json
   */
  async getAllPatients(filters?: {
    ageMin?: number;
    ageMax?: number;
    gender?: string;
    chronicConditions?: string[];
    riskLevel?: string;
  }): Promise<PatientRecord[]> {
    console.log('📋 Fetching all patients from GCS (patients.json)...');

    const rawPatients = await fetchAllPatients();

    // Transform raw data to PatientRecord format
    let patients: PatientRecord[] = rawPatients.map(transformPatientData);

    // Apply filters if provided
    if (filters) {
      if (filters.ageMin) {
        patients = patients.filter(p => (p.demographics?.age || 0) >= filters.ageMin);
      }
      if (filters.ageMax) {
        patients = patients.filter(p => (p.demographics?.age || 0) <= filters.ageMax);
      }
      if (filters.gender) {
        patients = patients.filter(p => p.demographics?.gender === filters.gender);
      }
      if (filters.riskLevel) {
        patients = patients.filter(p => p.riskLevel === filters.riskLevel);
      }
      if (filters.chronicConditions && filters.chronicConditions.length > 0) {
        patients = patients.filter(p =>
          filters.chronicConditions?.some(cc =>
            p.medicalInfo?.chronicConditions?.includes(cc)
          )
        );
      }
    }

    console.log(`✅ Found ${patients.length} patients`);
    return patients;
  }

  // ===========================================================================
  // PATIENT DETAILS
  // ===========================================================================

  /**
   * Get patient details by ID
   */
  async getPatientDetails(
    patientId: string,
    doctorId: string
  ): Promise<PatientRecord | null> {
    console.log(`👤 Fetching patient details: ${patientId}`);

    // Verify consent first (PDPA compliance)
    if (config.features.pdpaEnabled) {
      const consent = await this.verifyConsent(patientId, doctorId);
      if (!consent?.granted) {
        console.error('❌ No consent granted for accessing patient data');
        throw new Error('No consent granted for accessing patient data');
      }
    }

    const patient = await fetchPatientById(patientId);

    if (!patient) {
      console.warn(`⚠️ Patient ${patientId} not found`);
      return null;
    }

    // Log access for PDPA audit trail
    await this.logDataAccess(patientId, doctorId, 'patient-profile');

    return patient as PatientRecord;
  }

  /**
   * Save/Update patient profile
   */
  async savePatientDetails(
    patientId: string,
    profile: PatientRecord,
    doctorId: string
  ): Promise<GCSWriteResult> {
    console.log(`💾 Saving patient profile: ${patientId}`);

    // Verify consent
    if (config.features.pdpaEnabled) {
      const consent = await this.verifyConsent(patientId, doctorId);
      if (!consent?.granted) {
        return { success: false, error: 'No consent granted' };
      }
    }

    const result = await savePatientProfile(patientId, profile);

    if (result.success) {
      // Log the update
      await this.logDataAccess(patientId, doctorId, 'patient-profile-update');
    }

    return result;
  }

  // ===========================================================================
  // VITAL SIGNS
  // ===========================================================================

  /**
   * Get latest vital signs
   */
  async getLatestVitalSigns(patientId: string): Promise<VitalSigns | null> {
    console.log(`💓 Fetching vital signs for patient: ${patientId}`);
    const vitals = await fetchPatientVitals(patientId);
    return vitals as VitalSigns | null;
  }

  /**
   * Save vital signs
   */
  async saveVitalSigns(
    patientId: string,
    vitals: VitalSigns,
    doctorId: string
  ): Promise<GCSWriteResult> {
    console.log(`💾 Saving vital signs for patient: ${patientId}`);

    vitals.measuredAt = new Date();
    const result = await savePatientVitals(patientId, vitals);

    if (result.success) {
      await this.logDataAccess(patientId, doctorId, 'vitals-update');
    }

    return result;
  }

  // ===========================================================================
  // PHR (Personal Health Record) ACCESS
  // ===========================================================================

  /**
   * Get patient PHR
   */
  async getPatientPHR(
    patientId: string,
    doctorId: string
  ): Promise<HealthRecord[]> {
    console.log(`📋 Fetching PHR for patient: ${patientId}`);

    // Verify consent with PHR scope
    if (config.features.pdpaEnabled) {
      const consent = await this.verifyConsent(patientId, doctorId);
      if (!consent || !consent.granted || !consent.scope.includes('phr-access')) {
        throw new Error('No consent granted for PHR access');
      }
    }

    const phr = await fetchPatientPHR(patientId);

    if (phr) {
      await this.logDataAccess(patientId, doctorId, 'phr-access');
    }

    return phr || [];
  }

  // ===========================================================================
  // E-LIVING FORM (Living Will)
  // ===========================================================================

  /**
   * Get patient e-living form
   */
  async getPatientELivingForm(
    patientId: string,
    doctorId: string
  ): Promise<unknown> {
    console.log(`📜 Fetching e-living form for patient: ${patientId}`);

    // Verify consent
    if (config.features.pdpaEnabled) {
      const consent = await this.verifyConsent(patientId, doctorId);
      if (!consent?.granted) {
        throw new Error('No consent granted for e-living form access');
      }
    }

    const livingWill = await fetchPatientLivingWill(patientId);

    if (livingWill) {
      await this.logDataAccess(patientId, doctorId, 'living-will');
    }

    return livingWill;
  }

  // ===========================================================================
  // PATIENT TIMELINE
  // ===========================================================================
  // Uses: patients/{id}/timeline.json

  /**
   * Get patient timeline
   * Uses: patients/{id}/timeline.json
   */
  async getPatientTimeline(patientId: string): Promise<any[]> {
    console.log(`📅 Fetching timeline for patient: ${patientId}`);
    return fetchPatientTimeline(patientId);
  }

  /**
   * Add entry to patient timeline
   */
  async addToPatientTimeline(
    patientId: string,
    entry: {
      type: string;
      action: string;
      resourceId?: string;
      summary: string;
      doctorId?: string;
    }
  ): Promise<GCSWriteResult> {
    return addTimelineEntry(patientId, entry);
  }

  // ===========================================================================
  // AUDIT LOGGING (PDPA Compliance)
  // ===========================================================================
  // Uses: audit/access-logs/{patientId}_{date}.json

  /**
   * Log data access for PDPA audit trail
   * Uses: audit/access-logs/{patientId}_{date}.json
   */
  private async logDataAccess(
    patientId: string,
    doctorId: string,
    accessType: string
  ): Promise<void> {
    if (!config.features.auditLoggingEnabled) return;

    const logEntry = {
      patientId,
      doctorId,
      accessType,
      timestamp: new Date().toISOString(),
      source: 'doctor-portal',
      userAgent: typeof navigator === 'undefined' ? 'N/A' : navigator.userAgent,
    };

    console.log('📋 PDPA Audit Log:', logEntry);

    // Save to GCS audit log
    try {
      await appendAuditLog(patientId, logEntry);
    } catch (gcsError) {
      console.warn('⚠️ Failed to save to GCS audit log:', gcsError);
    }

    // Also use audit log service for compliance reports
    try {
      const resourceMap: Record<string, AuditResource> = {
          'phr-access': 'patient_phr',
          'living-will': 'e_living_will',
          'vitals-update': 'patient_demographics',
        };
        const auditResource = resourceMap[accessType] || 'patient_ehr';
        await auditLogService.logPatientDataAccess(
        doctorId,
        `Doctor ${doctorId}`,
        patientId,
        auditResource,
        accessType
      );
    } catch (error) {
      // Log locally if audit service fails
      console.warn('⚠️ Failed to log to audit service:', error);
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const patientDataService = PatientDataService.getInstance();
export default patientDataService;
