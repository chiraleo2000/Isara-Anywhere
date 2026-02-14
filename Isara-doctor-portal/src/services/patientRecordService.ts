/**
 * Patient Record Service - Comprehensive Patient Record Management
 *
 * Uses GCS buckets:
 * - izara-patients-data (Patient profiles, EMRs, prescriptions, lab orders)
 * - izara-meta-data (Patient index)
 *
 * This service provides a unified interface for accessing all patient-related data
 * including demographics, medical history, appointments, prescriptions, and more.
 */

import {
  PatientRecord,
  EMR,
  Prescription,
  LabOrder,
  ImagingOrder,
  Appointment,
  HealthRecord,
  VitalSigns,
} from '../types';
import {
  // Patient bucket
  fetchAllPatients,
  fetchPatientById,
  savePatientProfile,
  fetchPatientEMRs,
  fetchPatientPrescriptions,
  fetchPatientLabOrders,
  fetchPatientImagingOrders,
  fetchPatientVitals,
  fetchPatientPHR,
  fetchPatientLivingWill,
  // Appointments bucket
  fetchPatientAppointments,
  GCSWriteResult,
} from './gcsDataService';
import { patientDataService } from './patientDataService';

// ============================================================================
// TYPES (Keep for backwards compatibility)
// ============================================================================

export interface PHRData {
  patientId: string;
  demographics: {
    name: string;
    age: number;
    sex: string;
    weight: number;
    height: number;
    bmi: number;
  };
  vitalSigns: {
    date: Date;
    bloodPressure: { systolic: number; diastolic: number };
    heartRate: number;
    temperature: number;
    oxygenSaturation: number;
    bloodGlucose?: number;
  }[];
  lifestyle: {
    smoking: boolean | string;
    alcohol: boolean | string;
    exercise: string;
    diet: string;
    sleep: string;
    supplements?: string;
    otherTreatments?: string;
  };
  allergies: string[];
  chronicConditions: string[];
  currentMedications: {
    name: string;
    dosage: string;
    frequency: string;
    startDate: Date;
  }[];
  vaccinations: {
    vaccine: string;
    date: Date;
    nextDue?: Date;
  }[];
  wearableData?: {
    steps: number;
    caloriesBurned: number;
    sleepHours: number;
    activeMinutes: number;
  };
}

// Living Will types for doctor view
export interface LivingWillTreatmentView {
  treatmentType: string;
  preference: 'accept' | 'refuse' | 'conditional';
  conditions?: string;
  notes?: string;
}

export interface LivingWillTreatmentsView {
  cpr: LivingWillTreatmentView;
  mechanicalVentilation: LivingWillTreatmentView;
  artificialNutrition: LivingWillTreatmentView;
  dialysis: LivingWillTreatmentView;
  antibiotics: LivingWillTreatmentView;
  painManagement: LivingWillTreatmentView;
  organDonation: LivingWillTreatmentView;
  otherTreatments?: LivingWillTreatmentView[];
}

export interface LivingWillForDoctorView {
  id: string;
  patientId: string;
  patientName: string;
  version: string;
  status: 'draft' | 'active' | 'suspended' | 'revoked';
  effectiveDate: string;
  treatments: LivingWillTreatmentsView;
  personalStatement?: string;
  additionalInstructions?: string;
  mainRepresentative?: {
    name: string;
    relationship: string;
    phone: string;
    email?: string;
  };
  isSharedByPatient: boolean;
  sharedAt?: string;
  lastUpdated: string;
}

export interface EMRRecord {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  encounterDate: Date;
  encounterType: 'consultation' | 'follow-up' | 'emergency' | 'procedure';
  chiefComplaint: string;
  historyOfPresentIllness: string;
  reviewOfSystems: {
    constitutional: string;
    cardiovascular: string;
    respiratory: string;
    gastrointestinal: string;
    genitourinary: string;
    musculoskeletal: string;
    neurological: string;
    psychiatric: string;
    skin: string;
  };
  physicalExamination: {
    general: string;
    vitalSigns: {
      bp: string;
      hr: string;
      rr: string;
      temp: string;
      spo2: string;
    };
    heent: string;
    cardiovascular: string;
    respiratory: string;
    abdomen: string;
    extremities: string;
    neurological: string;
  };
  assessment: string;
  diagnosis: {
    code: string;
    description: string;
    type: 'primary' | 'secondary';
  }[];
  plan: string;
  prescriptions: {
    id: string;
    medication: string;
    dosage: string;
    frequency: string;
    duration: string;
  }[];
  labOrders: {
    id: string;
    test: string;
    urgency: string;
  }[];
  imagingOrders: {
    id: string;
    modality: string;
    bodyPart: string;
  }[];
  followUpInstructions: string;
  followUpDate?: Date;
  createdAt: Date;
  lastModified: Date;
  status: 'draft' | 'finalized' | 'amended';
  digitalSignature?: string;
}

export interface EHRTimeline {
  patientId: string;
  events: TimelineEvent[];
}

export interface TimelineEvent {
  id: string;
  date: Date;
  type: 'consultation' | 'diagnosis' | 'prescription' | 'lab' | 'imaging' | 'hospitalization' | 'surgery' | 'vaccination';
  title: string;
  description: string;
  provider: string;
  facility: string;
  summary: string;
  documents: {
    name: string;
    url: string;
    type: string;
  }[];
}

export interface LabResult {
  id: string;
  patientId: string;
  orderDate: Date;
  collectionDate: Date;
  completedDate: Date;
  tests: {
    name: string;
    value: string;
    unit: string;
    normalRange: string;
    flag?: 'high' | 'low' | 'critical';
  }[];
  summary: string;
  interpretation?: string;
}

export interface ImagingResult {
  id: string;
  patientId: string;
  orderDate: Date;
  studyDate: Date;
  modality: 'xray' | 'ct' | 'mri' | 'ultrasound';
  bodyPart: string;
  findings: string;
  impression: string;
  radiologistName: string;
  images: string[];
}

// ============================================================================
// PATIENT RECORD SERVICE CLASS
// ============================================================================

class PatientRecordService {
  private static instance: PatientRecordService;

  private constructor() {}

  static getInstance(): PatientRecordService {
    if (!PatientRecordService.instance) {
      PatientRecordService.instance = new PatientRecordService();
    }
    return PatientRecordService.instance;
  }

  // ===========================================================================
  // PATIENT SEARCH & LIST
  // ===========================================================================

  async searchPatients(query: string): Promise<PatientRecord[]> {
    return patientDataService.searchPatients(query);
  }

  async getAllPatients(): Promise<PatientRecord[]> {
    console.log('📋 Fetching all patient records from GCS...');
    const patients = await fetchAllPatients() as PatientRecord[];
    console.log(`✅ Found ${patients.length} patient records`);
    return patients;
  }

  // ===========================================================================
  // PATIENT DETAILS
  // ===========================================================================

  async getPatientById(patientId: string): Promise<PatientRecord | null> {
    console.log(`👤 Fetching patient record: ${patientId}`);
    const patient = await fetchPatientById(patientId);
    if (!patient) {
      console.warn(`⚠️ Patient ${patientId} not found`);
      return null;
    }
    return patient as PatientRecord;
  }

  async savePatientProfile(patientId: string, profile: PatientRecord): Promise<GCSWriteResult> {
    console.log(`💾 Saving patient profile: ${patientId}`);
    return savePatientProfile(patientId, profile);
  }

  // ===========================================================================
  // PHR (Personal Health Record) - From GCS
  // Reads patient's phr.json and vital-signs.json using shared data structure
  // ===========================================================================

  async getPHR(patientId: string): Promise<PHRData | null> {
    console.log(`📋 Fetching PHR from GCS for patient: ${patientId}`);

    try {
      // Fetch patient profile, PHR data, and vital signs from GCS
      const [patient, phrData, vitalsArray] = await Promise.all([
        fetchPatientById(patientId),
        fetchPatientPHR(patientId),
        fetchPatientVitals(patientId),
      ]);

      if (!patient) {
        console.warn(`⚠️ Patient ${patientId} not found in GCS`);
        return null;
      }

      // Get latest vitals (can be array or single object)
      let latestVitals;
      if (Array.isArray(vitalsArray)) {
        const sorted = [...vitalsArray];
        sorted.sort((a: any, b: any) =>
          new Date(b.measuredAt || b.date || 0).getTime() -
          new Date(a.measuredAt || a.date || 0).getTime()
        );
        latestVitals = sorted[0];
      } else {
        latestVitals = vitalsArray;
      }

      // Build vital signs history from patient's vital-signs.json
      let vitalSignsHistory;
      if (Array.isArray(vitalsArray)) {
        vitalSignsHistory = vitalsArray.map((v: any) => ({
          date: new Date(v.measuredAt || v.date || new Date()),
          bloodPressure: v.bloodPressure ? {
            systolic: v.bloodPressure.systolic || 0,
            diastolic: v.bloodPressure.diastolic || 0,
          } : { systolic: 0, diastolic: 0 },
          heartRate: v.heartRate?.value || 0,
          temperature: v.temperature?.value || 0,
          oxygenSaturation: v.oxygenSaturation?.value || 0,
          bloodGlucose: v.bloodGlucose?.value,
        }));
      } else if (latestVitals) {
        vitalSignsHistory = [{
          date: new Date(latestVitals.measuredAt || latestVitals.date || new Date()),
          bloodPressure: latestVitals.bloodPressure ? {
            systolic: latestVitals.bloodPressure.systolic || 0,
            diastolic: latestVitals.bloodPressure.diastolic || 0,
          } : { systolic: 0, diastolic: 0 },
          heartRate: latestVitals.heartRate?.value || 0,
          temperature: latestVitals.temperature?.value || 0,
          oxygenSaturation: latestVitals.oxygenSaturation?.value || 0,
          bloodGlucose: latestVitals.bloodGlucose?.value,
        }];
      } else {
        vitalSignsHistory = [];
      }

      // Extract medications from PHR or patient profile
      const medications = phrData?.currentMedications || patient.medicalInfo?.currentMedications || [];
      const formattedMedications = medications.map((med: any) => {
        // Handle both string format and object format
        if (typeof med === 'string') {
          return { name: med, dosage: '', frequency: '', startDate: new Date() };
        }
        return {
          name: med.name || med,
          dosage: med.dosage || '',
          frequency: med.frequency || '',
          startDate: med.startDate ? new Date(med.startDate) : new Date(),
        };
      });

      // Extract lifestyle data from PHR if available
      const lifestyle = phrData?.lifestyle || {
        smokingStatus: 'unknown',
        alcoholConsumption: 'unknown',
        exerciseFrequency: 'moderate',
      };

      // Build wearable data if available
      const wearableData = phrData?.wearableData ? {
        steps: phrData.wearableData.steps || 0,
        caloriesBurned: phrData.wearableData.caloriesBurned || 0,
        sleepHours: phrData.wearableData.sleepData?.totalHours || phrData.wearableData.sleepHours || 0,
        activeMinutes: phrData.wearableData.activeMinutes || 0,
      } : undefined;

      // Construct PHR from GCS data with proper type mapping
      const phr: PHRData = {
        patientId,
        demographics: {
          name: patient.demographics?.name || phrData?.demographics?.name || 'Unknown',
          age: patient.demographics?.age || this.calculateAge(patient.demographics?.dateOfBirth) || 0,
          sex: patient.demographics?.gender || phrData?.demographics?.gender || 'Unknown',
          weight: latestVitals?.weight?.value || phrData?.demographics?.weight || 0,
          height: latestVitals?.height?.value || phrData?.demographics?.height || 0,
          bmi: latestVitals?.bmi || this.calculateBMI(
            latestVitals?.weight?.value || phrData?.demographics?.weight,
            latestVitals?.height?.value || phrData?.demographics?.height
          ),
        },
        vitalSigns: vitalSignsHistory,
        lifestyle: {
          smoking: this.getSmokingStatus(lifestyle),
          alcohol: lifestyle.alcoholConsumption !== 'never' && lifestyle.alcoholConsumption !== 'unknown' ? lifestyle.alcoholConsumption : false,
          exercise: lifestyle.exerciseFrequency || lifestyle.exercise || 'Unknown',
          diet: lifestyle.dietType || lifestyle.diet || 'Unknown',
          sleep: lifestyle.sleepHours ? `${lifestyle.sleepHours} hours` : (lifestyle.sleep || 'Unknown'),
          supplements: lifestyle.supplements || '',
          otherTreatments: lifestyle.otherTreatments || '',
        },
        allergies: phrData?.allergies?.map((a: any) => typeof a === 'string' ? a : a.allergen) 
          || patient.medicalInfo?.allergies || [],
        chronicConditions: phrData?.chronicConditions?.map((c: any) => typeof c === 'string' ? c : c.condition) 
          || patient.medicalInfo?.chronicConditions || [],
        currentMedications: formattedMedications,
        vaccinations: (phrData?.vaccinations || []).map((v: any) => ({
          vaccine: v.vaccineName || v.name || v.vaccine || '',
          date: new Date(v.date),
          nextDue: v.nextDueDate ? new Date(v.nextDueDate) : undefined,
        })),
        wearableData,
      };

      console.log('✅ PHR loaded from GCS with', vitalSignsHistory.length, 'vital records');
      return phr;
    } catch (error) {
      console.error('❌ Error fetching PHR from GCS:', error);
      return null;
    }
  }

  // Helper to calculate age from date of birth
  private calculateAge(dateOfBirth?: string): number {
    if (!dateOfBirth) return 0;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  // Helper to calculate BMI
  private calculateBMI(weightKg?: number, heightCm?: number): number {
    if (!weightKg || !heightCm || heightCm === 0) return 0;
    const heightM = heightCm / 100;
    return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
  }

  // Helper to get smoking status (extracted to avoid nested ternary)
  private getSmokingStatus(lifestyle: any): string | boolean {
    if (lifestyle.smokingStatus === 'current' || lifestyle.smokingStatus === 'occasional') {
      return lifestyle.smokingStatus;
    }
    if (lifestyle.smokingStatus === 'never') {
      return false;
    }
    return lifestyle.smokingStatus || false;
  }

  // Helper to get lab result flag (extracted to avoid nested ternary)
  private getLabResultFlag(status: string): 'high' | 'critical' | undefined {
    if (status === 'abnormal') return 'high';
    if (status === 'critical') return 'critical';
    return undefined;
  }

  // ===========================================================================
  // LIVING WILL (E-Living) - From GCS
  // Respects PDPA consent - only returns if patient has shared
  // ===========================================================================

  async getLivingWill(patientId: string): Promise<LivingWillForDoctorView | null> {
    console.log(`📋 Fetching Living Will from GCS for patient: ${patientId}`);

    try {
      // Fetch patient info and living will
      const [patient, livingWill] = await Promise.all([
        fetchPatientById(patientId),
        fetchPatientLivingWill(patientId),
      ]);

      if (!livingWill) {
        console.log(`ℹ️ No Living Will exists for patient ${patientId}`);
        return null;
      }

      // Check PDPA consent - critical check
      if (!livingWill.pdpaConsent?.isSharedWithDoctors) {
        console.log(`🔒 Living Will exists but patient has not shared it with doctors`);
        return null; // Patient hasn't consented to share
      }

      // Only return active or suspended (not draft or revoked)
      if (livingWill.status === 'draft' || livingWill.status === 'revoked') {
        console.log(`ℹ️ Living Will is ${livingWill.status}, not visible to doctors`);
        return null;
      }

      const patientName = patient?.fullName || 
                         patient?.demographics?.fullName || 
                         `Patient ${patientId}`;

      // Find main representative
      const mainRep = livingWill.representatives?.find((r: any) => r.isMainRepresentative);

      const doctorView: LivingWillForDoctorView = {
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

      console.log(`✅ Living Will loaded for patient ${patientId}`);
      return doctorView;
    } catch (error) {
      console.error('❌ Error fetching Living Will from GCS:', error);
      return null;
    }
  }

  // ===========================================================================
  // EMRs (Electronic Medical Records) - From GCS
  // ===========================================================================

  async getEMRs(patientId: string): Promise<EMRRecord[]> {
    console.log(`📋 Fetching EMRs from GCS for patient: ${patientId}`);

    try {
      const emrs = await fetchPatientEMRs(patientId);

      if (emrs.length === 0) {
        console.warn(`⚠️ No EMRs found for patient ${patientId}`);
        return [];
      }

      // Convert to EMRRecord format
      const emrRecords: EMRRecord[] = emrs.map((emr: any) => ({
        id: emr.id,
        patientId: emr.patientId,
        doctorId: emr.doctorId,
        doctorName: emr.doctorName,
        encounterDate: new Date(emr.encounterDate),
        encounterType: emr.encounterType || 'consultation',
        chiefComplaint: emr.chiefComplaint || '',
        historyOfPresentIllness: emr.historyOfPresentIllness || '',
        reviewOfSystems: emr.reviewOfSystems || {},
        physicalExamination: emr.physicalExamination || {},
        assessment: emr.assessment || '',
        diagnosis: emr.diagnosis || [],
        plan: emr.treatmentPlan || '',
        prescriptions: emr.prescriptions || [],
        labOrders: emr.investigations?.filter((i: any) => i.type === 'lab') || [],
        imagingOrders: emr.investigations?.filter((i: any) => i.type === 'imaging') || [],
        followUpInstructions: emr.followUpInstructions || '',
        followUpDate: emr.followUpDate ? new Date(emr.followUpDate) : undefined,
        createdAt: new Date(emr.createdAt),
        lastModified: new Date(emr.lastModified),
        status: emr.status || 'draft',
        digitalSignature: emr.digitalSignature,
      }));

      console.log(`✅ Found ${emrRecords.length} EMRs from GCS`);
      return emrRecords;
    } catch (error) {
      console.error('❌ Error fetching EMRs from GCS:', error);
      return [];
    }
  }

  // ===========================================================================
  // EHR Timeline - From GCS
  // ===========================================================================

  async getEHRTimeline(patientId: string): Promise<EHRTimeline> {
    console.log(`📋 Building EHR timeline from GCS for patient: ${patientId}`);

    try {
      // Fetch all data in parallel
      const [emrs, prescriptions, labOrders, imagingOrders, _appointments] = await Promise.all([
        fetchPatientEMRs(patientId),
        fetchPatientPrescriptions(patientId),
        fetchPatientLabOrders(patientId),
        fetchPatientImagingOrders(patientId),
        fetchPatientAppointments(patientId),
      ]);

      const events: TimelineEvent[] = [];

      // Add EMR consultations
      emrs.forEach((emr: any) => {
        events.push({
          id: emr.id,
          date: new Date(emr.encounterDate),
          type: 'consultation',
          title: `${emr.encounterType?.charAt(0).toUpperCase()}${emr.encounterType?.slice(1)} Visit`,
          description: emr.chiefComplaint || 'Medical consultation',
          provider: emr.doctorName || 'Unknown',
          facility: 'Izara Telemedicine',
          summary: emr.assessment || '',
          documents: [],
        });
      });

      // Add prescriptions
      prescriptions.forEach((rx: any) => {
        events.push({
          id: rx.id,
          date: new Date(rx.prescribedDate || new Date()),
          type: 'prescription',
          title: `Prescription - ${rx.medication}`,
          description: `${rx.dosage} - ${rx.frequency}`,
          provider: rx.prescribedBy || 'Unknown',
          facility: 'Izara Telemedicine',
          summary: rx.instructions || '',
          documents: [],
        });
      });

      // Add lab orders
      labOrders.forEach((lab: any) => {
        events.push({
          id: lab.id,
          date: new Date(lab.orderedDate),
          type: 'lab',
          title: `Lab Order - ${lab.testName}`,
          description: `Status: ${lab.status}`,
          provider: lab.orderedBy || 'Unknown',
          facility: lab.labName || 'Izara Laboratory',
          summary: lab.results?.map((r: any) => `${r.testName}: ${r.value}`).join(', ') || '',
          documents: [],
        });
      });

      // Add imaging orders
      imagingOrders.forEach((img: any) => {
        events.push({
          id: img.id,
          date: new Date(img.orderedDate),
          type: 'imaging',
          title: `Imaging - ${img.examType}`,
          description: `${img.bodyPart} - ${img.status}`,
          provider: img.orderedBy || 'Unknown',
          facility: img.facility || 'Izara Imaging',
          summary: img.results || '',
          documents: img.imageUrls?.map((url: string) => ({
            name: 'Image',
            url,
            type: 'image',
          })) || [],
        });
      });

      // Sort by date (most recent first)
      events.sort((a, b) => b.date.getTime() - a.date.getTime());

      console.log(`✅ Built timeline with ${events.length} events from GCS`);

      return { patientId, events };
    } catch (error) {
      console.error('❌ Error building EHR timeline:', error);
      return { patientId, events: [] };
    }
  }

  // ===========================================================================
  // Lab Results - From GCS
  // ===========================================================================

  async getLabResults(patientId: string): Promise<LabResult[]> {
    console.log(`🧪 Fetching lab results from GCS for patient: ${patientId}`);

    try {
      const labOrders = await fetchPatientLabOrders(patientId);
      const completedLabs = labOrders.filter((lab: any) =>
        lab.status === 'Completed' || lab.status === 'completed'
      );

      const results: LabResult[] = completedLabs.map((lab: any) => ({
        id: lab.id,
        patientId,
        orderDate: new Date(lab.orderedDate),
        collectionDate: new Date(lab.scheduledDate || lab.orderedDate),
        completedDate: new Date(lab.completedDate || lab.orderedDate),
        tests: (lab.results || []).map((r: any) => ({
          name: r.testName,
          value: r.value,
          unit: r.unit,
          normalRange: r.referenceRange,
          flag: this.getLabResultFlag(r.status),
        })),
        summary: lab.testName,
        interpretation: lab.notes,
      }));

      console.log(`✅ Found ${results.length} lab results from GCS`);
      return results;
    } catch (error) {
      console.error('❌ Error fetching lab results from GCS:', error);
      return [];
    }
  }

  // ===========================================================================
  // Imaging Results - From GCS
  // ===========================================================================

  async getImagingResults(patientId: string): Promise<ImagingResult[]> {
    console.log(`🔬 Fetching imaging results from GCS for patient: ${patientId}`);

    try {
      const imagingOrders = await fetchPatientImagingOrders(patientId);
      const completedImaging = imagingOrders.filter((img: any) =>
        img.status === 'Completed' || img.status === 'completed'
      );

      const results: ImagingResult[] = completedImaging.map((img: any) => ({
        id: img.id,
        patientId,
        orderDate: new Date(img.orderedDate),
        studyDate: new Date(img.completedDate || img.scheduledDate || img.orderedDate),
        modality: img.examType?.toLowerCase() || 'xray',
        bodyPart: img.bodyPart,
        findings: img.results || '',
        impression: img.results || '',
        radiologistName: img.orderedBy || 'Unknown',
        images: img.imageUrls || [],
      }));

      console.log(`✅ Found ${results.length} imaging results from GCS`);
      return results;
    } catch (error) {
      console.error('❌ Error fetching imaging results from GCS:', error);
      return [];
    }
  }

  // ===========================================================================
  // COMPREHENSIVE PATIENT RECORD
  // ===========================================================================

  async getCompletePatientRecord(patientId: string): Promise<{
    patient: PatientRecord | null;
    emrs: EMR[];
    prescriptions: Prescription[];
    labOrders: LabOrder[];
    imagingOrders: ImagingOrder[];
    appointments: Appointment[];
    vitals: VitalSigns | null;
    phr: HealthRecord[];
  }> {
    console.log(`📋 Fetching complete record from GCS for patient: ${patientId}`);

    const [
      patient,
      emrs,
      prescriptions,
      labOrders,
      imagingOrders,
      appointments,
      vitals,
      phr,
    ] = await Promise.all([
      fetchPatientById(patientId),
      fetchPatientEMRs(patientId),
      fetchPatientPrescriptions(patientId),
      fetchPatientLabOrders(patientId),
      fetchPatientImagingOrders(patientId),
      fetchPatientAppointments(patientId),
      fetchPatientVitals(patientId),
      fetchPatientPHR(patientId),
    ]);

    console.log('✅ Complete patient record loaded from GCS');

    return {
      patient: patient as PatientRecord | null,
      emrs: emrs as EMR[],
      prescriptions: prescriptions as Prescription[],
      labOrders: labOrders as LabOrder[],
      imagingOrders: imagingOrders as ImagingOrder[],
      appointments: appointments as Appointment[],
      vitals: vitals as VitalSigns | null,
      phr: (phr || []) as HealthRecord[],
    };
  }

  // ===========================================================================
  // MEDICAL HISTORY SUMMARY
  // ===========================================================================

  async getMedicalHistorySummary(patientId: string): Promise<{
    allergies: string[];
    chronicConditions: string[];
    currentMedications: string[];
    pastProcedures: string[];
    recentDiagnoses: string[];
    lastVisit: Date | null;
  }> {
    const [patient, emrs, prescriptions] = await Promise.all([
      fetchPatientById(patientId),
      fetchPatientEMRs(patientId),
      fetchPatientPrescriptions(patientId),
    ]);

    const recentDiagnoses = emrs
      .slice(0, 5)
      .flatMap(emr => (emr.diagnosis || []).map((d: any) => d.description))
      .filter((v, i, a) => a.indexOf(v) === i);

    const currentMedications = prescriptions.map(rx => rx.medication);

    const sortedEMRs = [...emrs];
    sortedEMRs.sort((a, b) =>
      new Date(b.encounterDate).getTime() - new Date(a.encounterDate).getTime()
    );
    const lastVisit = sortedEMRs.length > 0 ? new Date(sortedEMRs[0].encounterDate) : null;

    return {
      allergies: patient?.medicalInfo?.allergies || [],
      chronicConditions: patient?.medicalInfo?.chronicConditions || [],
      currentMedications: patient?.medicalInfo?.currentMedications || currentMedications,
      pastProcedures: [],
      recentDiagnoses,
      lastVisit,
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const patientRecordService = PatientRecordService.getInstance();
export default patientRecordService;
