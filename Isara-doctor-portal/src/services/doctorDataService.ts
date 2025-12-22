/**
 * Doctor Data Service - Doctor Profile & Queue Management
 *
 * Uses GCS buckets:
 * - izara-doctors-data
 *   - doctors.json (all doctor profiles)
 *   - queue.json (shared patient queue)
 *   - doctors/{id}/schedule.json (per-doctor schedules)
 * - izara-patients-data
 *   - emrs.json (all EMR records)
 *   - prescriptions.json (all prescriptions)
 *   - lab-orders.json (all lab orders)
 *   - imaging-orders.json (all imaging orders)
 * - izara-appointments
 *   - appointments.json (all appointments)
 */

import {
  EMR,
  Prescription,
  LabOrder,
  ImagingOrder,
  QueuePatient,
  Appointment,
} from '../types';

import {
  // Doctor bucket (izara-doctors-data)
  fetchAllDoctors,
  fetchDoctorById,
  saveDoctorProfile,
  fetchPatientQueue,
  savePatientQueue,
  fetchDoctorQueue,
  fetchDoctorSchedule,
  saveDoctorSchedule,
  fetchDoctorStats,
  saveDoctorStats,
  // Patient bucket (izara-patients-data)
  fetchPatientEMRs,
  saveEMR,
  fetchPatientPrescriptions,
  savePrescription,
  fetchPatientLabOrders,
  saveLabOrder,
  fetchPatientImagingOrders,
  saveImagingOrder,
  addTimelineEntry,
  // Appointments bucket (izara-appointments)
  fetchDoctorAppointments,
  saveDoctorDayAppointments,
  GCSWriteResult,
} from './gcsDataService';

// ============================================================================
// TYPES
// ============================================================================

interface DoctorStats {
  todayStats: {
    appointmentsCount: number;
    patientsSeenCount: number;
    pendingPrescriptions: number;
    unreadMessages: number;
  };
  averageConsultationTime: number;
  patientSatisfaction: number;
}

// ============================================================================
// DOCTOR DATA SERVICE CLASS
// ============================================================================

class DoctorDataService {
  private static instance: DoctorDataService;

  private constructor() {}

  static getInstance(): DoctorDataService {
    if (!DoctorDataService.instance) {
      DoctorDataService.instance = new DoctorDataService();
    }
    return DoctorDataService.instance;
  }

  // ===========================================================================
  // DOCTOR PROFILE & STATS
  // ===========================================================================

  /**
   * Get all doctors
   */
  async getAllDoctors(): Promise<any[]> {
    console.log('📋 Fetching all doctors from GCS...');
    const doctors = await fetchAllDoctors();
    console.log(`✅ Found ${doctors.length} doctors`);
    return doctors;
  }

  /**
   * Get doctor profile by ID
   * Uses: doctors.json (filters by ID)
   */
  async getDoctorProfile(doctorId: string): Promise<any | null> {
    console.log(`👨‍⚕️ Fetching doctor profile: ${doctorId}`);
    return fetchDoctorById(doctorId);
  }

  /**
   * Save/Update doctor profile
   */
  async saveDoctorProfile(doctorId: string, profile: any): Promise<boolean> {
    console.log(`💾 Saving doctor profile: ${doctorId}`);
    const result = await saveDoctorProfile(doctorId, profile);
    return result.success;
  }

  /**
   * Get doctor statistics
   */
  async getDoctorStats(doctorId: string): Promise<DoctorStats> {
    console.log(`📊 Fetching doctor stats: ${doctorId}`);

    const stats = await fetchDoctorStats(doctorId);
    if (stats) {
      return stats as DoctorStats;
    }

    // Return default stats if not found
    return this.getDefaultStats();
  }

  // ===========================================================================
  // QUEUE MANAGEMENT
  // ===========================================================================
  // Uses shared queue.json file in izara-doctors-data bucket

  /**
   * Get entire patient queue
   * Uses: queue.json
   */
  async getAllQueue(): Promise<QueuePatient[]> {
    console.log(`📋 Fetching all patient queue from GCS...`);
    const queue = await fetchPatientQueue();
    console.log(`✅ Found ${queue.length} patients in queue`);
    return queue as QueuePatient[];
  }

  /**
   * Get patient queue for a specific doctor
   * Uses: queue.json (filters by doctorId)
   */
  async getQueue(doctorId: string): Promise<QueuePatient[]> {
    console.log(`📋 Fetching queue for doctor: ${doctorId}`);
    const queue = await fetchDoctorQueue(doctorId);
    console.log(`✅ Found ${queue.length} patients in queue`);
    return queue as QueuePatient[];
  }

  /**
   * Update entire patient queue
   * Uses: queue.json
   */
  async updateAllQueue(queue: QueuePatient[]): Promise<boolean> {
    console.log(`💾 Updating entire patient queue...`);
    const result = await savePatientQueue(queue);
    if (result.success) {
      console.log('✅ Queue updated successfully');
    }
    return result.success;
  }

  /**
   * Update queue for a specific doctor
   */
  async updateQueue(doctorId: string, doctorQueue: QueuePatient[]): Promise<boolean> {
    console.log(`💾 Updating queue for doctor: ${doctorId}`);

    // Get entire queue
    const allQueue = await this.getAllQueue();

    // Remove existing entries for this doctor
    const otherDoctorsQueue = allQueue.filter(p => p.doctorId !== doctorId);

    // Merge with updated doctor queue
    const updatedQueue = [...otherDoctorsQueue, ...doctorQueue];

    const result = await savePatientQueue(updatedQueue);
    if (result.success) {
      console.log('✅ Queue updated successfully');
    }
    return result.success;
  }

  /**
   * Add patient to queue
   */
  async addToQueue(doctorId: string, patient: QueuePatient): Promise<boolean> {
    const allQueue = await this.getAllQueue();
    const doctorQueue = allQueue.filter(p => p.doctorId === doctorId);

    patient.doctorId = doctorId;
    patient.queuePosition = doctorQueue.length + 1;
    patient.queueNumber = doctorQueue.length + 1;
    patient.addedAt = new Date();

    allQueue.push(patient);
    return this.updateAllQueue(allQueue);
  }

  /**
   * Remove patient from queue
   */
  async removeFromQueue(doctorId: string, patientId: string): Promise<boolean> {
    const allQueue = await this.getAllQueue();
    const filteredQueue = allQueue.filter(
      p => !(p.doctorId === doctorId && p.patientId === patientId)
    );

    // Recalculate queue positions for this doctor
    let position = 1;
    filteredQueue.forEach(p => {
      if (p.doctorId === doctorId) {
        p.queuePosition = position;
        p.queueNumber = position;
        position++;
      }
    });

    return this.updateAllQueue(filteredQueue);
  }

  /**
   * Update patient status in queue
   */
  async updateQueuePatientStatus(
    doctorId: string,
    patientId: string,
    status: QueuePatient['status']
  ): Promise<boolean> {
    const allQueue = await this.getAllQueue();
    const patient = allQueue.find(
      p => p.doctorId === doctorId && p.patientId === patientId
    );

    if (!patient) {
      console.error(`Patient ${patientId} not found in queue for doctor ${doctorId}`);
      return false;
    }

    patient.status = status;
    patient.updatedAt = new Date();
    return this.updateAllQueue(allQueue);
  }

  /**
   * Move patient to next position in queue
   */
  async callNextPatient(doctorId: string): Promise<QueuePatient | null> {
    const queue = await this.getQueue(doctorId);
    const waitingPatients = queue.filter(p => p.status === 'waiting');

    if (waitingPatients.length === 0) {
      console.log('No waiting patients in queue');
      return null;
    }

    // Get the first waiting patient
    const nextPatient = waitingPatients[0];
    await this.updateQueuePatientStatus(doctorId, nextPatient.patientId, 'in-consultation');

    return nextPatient;
  }

  // ===========================================================================
  // SCHEDULE MANAGEMENT
  // ===========================================================================

  /**
   * Get doctor schedule
   */
  async getDoctorSchedule(doctorId: string): Promise<any[]> {
    console.log(`📅 Fetching schedule for doctor: ${doctorId}`);
    return fetchDoctorSchedule(doctorId);
  }

  /**
   * Save doctor schedule
   */
  async saveDoctorSchedule(doctorId: string, schedule: any[]): Promise<boolean> {
    console.log(`💾 Saving schedule for doctor: ${doctorId}`);
    const result = await saveDoctorSchedule(doctorId, schedule);
    return result.success;
  }

  // ===========================================================================
  // APPOINTMENTS
  // ===========================================================================

  /**
   * Get today's appointments for a doctor
   */
  async getTodayAppointments(doctorId: string): Promise<Appointment[]> {
    const today = new Date().toISOString().split('T')[0];
    console.log(`📅 Fetching appointments for ${doctorId} on ${today}`);

    const appointments = await fetchDoctorAppointments(doctorId, today);
    console.log(`✅ Found ${appointments.length} appointments`);
    return appointments as Appointment[];
  }

  /**
   * Get all appointments for a doctor
   */
  async getAllAppointments(doctorId: string): Promise<Appointment[]> {
    console.log(`📅 Fetching all appointments for doctor: ${doctorId}`);
    const appointments = await fetchDoctorAppointments(doctorId);
    return appointments as Appointment[];
  }

  /**
   * Save daily appointments
   */
  async saveDailyAppointments(
    doctorId: string,
    date: string,
    appointments: Appointment[]
  ): Promise<boolean> {
    console.log(`💾 Saving appointments for ${doctorId} on ${date}`);
    const result = await saveDoctorDayAppointments(doctorId, date, appointments);
    return result.success;
  }

  // ===========================================================================
  // PATIENT EMR (Electronic Medical Records)
  // ===========================================================================
  // Uses: emrs.json in izara-patients-data bucket

  /**
   * Get patient EMRs
   * Uses: emrs.json (filters by patientId)
   */
  async getPatientEMRs(patientId: string): Promise<EMR[]> {
    console.log(`📋 Fetching EMRs for patient: ${patientId}`);
    const emrs = await fetchPatientEMRs(patientId);
    console.log(`✅ Found ${emrs.length} EMRs`);
    return emrs as EMR[];
  }

  /**
   * Save EMR
   * Uses: emrs.json
   */
  async saveEMR(emr: EMR): Promise<GCSWriteResult> {
    console.log(`💾 Saving EMR: ${emr.id} for patient: ${emr.patientId}`);
    emr.lastModified = new Date();
    const result = await saveEMR(emr);

    if (result.success) {
      console.log('✅ EMR saved to emrs.json');

      // Also add timeline entry
      await addTimelineEntry(emr.patientId, {
        type: 'emr',
        action: emr.id.startsWith('emr_new_') ? 'created' : 'updated',
        resourceId: emr.id,
        summary: `EMR ${emr.id.startsWith('emr_new_') ? 'created' : 'updated'} by ${emr.doctorId}`,
        doctorId: emr.doctorId,
      });
    } else {
      console.error('❌ Failed to save EMR:', result.error);
    }

    return result;
  }

  // ===========================================================================
  // PRESCRIPTIONS
  // ===========================================================================
  // Uses: prescriptions.json in izara-patients-data bucket

  /**
   * Get patient prescriptions
   * Uses: prescriptions.json (filters by patientId)
   */
  async getPatientPrescriptions(patientId: string): Promise<Prescription[]> {
    console.log(`💊 Fetching prescriptions for patient: ${patientId}`);
    const prescriptions = await fetchPatientPrescriptions(patientId);
    console.log(`✅ Found ${prescriptions.length} prescriptions`);
    return prescriptions as Prescription[];
  }

  /**
   * Save prescription
   * Uses: prescriptions.json
   */
  async savePrescription(prescription: Prescription & { patientId: string; [key: string]: any }): Promise<GCSWriteResult> {
    console.log(`💾 Saving prescription: ${prescription.id}`);
    const result = await savePrescription(prescription);

    if (result.success) {
      console.log('✅ Prescription saved to prescriptions.json');

      // Also add timeline entry
      const rxData = prescription as any;
      await addTimelineEntry(prescription.patientId, {
        type: 'prescription',
        action: 'created',
        resourceId: prescription.id,
        summary: `Prescription created with ${rxData.medications?.length || 0} medications`,
        doctorId: rxData.doctorId,
      });
    } else {
      console.error('❌ Failed to save prescription:', result.error);
    }

    return result;
  }

  // ===========================================================================
  // LAB ORDERS
  // ===========================================================================
  // Uses: lab-orders.json in izara-patients-data bucket

  /**
   * Get patient lab orders
   * Uses: lab-orders.json (filters by patientId)
   */
  async getPatientLabOrders(patientId: string): Promise<LabOrder[]> {
    console.log(`🧪 Fetching lab orders for patient: ${patientId}`);
    const labOrders = await fetchPatientLabOrders(patientId);
    console.log(`✅ Found ${labOrders.length} lab orders`);
    return labOrders as LabOrder[];
  }

  /**
   * Save lab order
   * Uses: lab-orders.json
   */
  async saveLabOrder(labOrder: LabOrder & { patientId: string; [key: string]: any }): Promise<GCSWriteResult> {
    console.log(`💾 Saving lab order: ${labOrder.id}`);
    const result = await saveLabOrder(labOrder);

    if (result.success) {
      console.log('✅ Lab order saved to lab-orders.json');

      // Also add timeline entry
      const labData = labOrder as any;
      await addTimelineEntry(labOrder.patientId, {
        type: 'lab_order',
        action: 'created',
        resourceId: labOrder.id,
        summary: `Lab order created: ${labData.tests?.length || 0} tests ordered`,
        doctorId: labData.doctorId,
      });
    } else {
      console.error('❌ Failed to save lab order:', result.error);
    }

    return result;
  }

  // ===========================================================================
  // IMAGING ORDERS
  // ===========================================================================
  // Uses: imaging-orders.json in izara-patients-data bucket

  /**
   * Get patient imaging orders
   * Uses: imaging-orders.json (filters by patientId)
   */
  async getPatientImagingOrders(patientId: string): Promise<ImagingOrder[]> {
    console.log(`🔬 Fetching imaging orders for patient: ${patientId}`);
    const imagingOrders = await fetchPatientImagingOrders(patientId);
    console.log(`✅ Found ${imagingOrders.length} imaging orders`);
    return imagingOrders as ImagingOrder[];
  }

  /**
   * Save imaging order
   * Uses: imaging-orders.json
   */
  async saveImagingOrder(imagingOrder: ImagingOrder & { [key: string]: any }): Promise<GCSWriteResult> {
    console.log(`💾 Saving imaging order: ${imagingOrder.id}`);
    const result = await saveImagingOrder(imagingOrder);

    if (result.success) {
      console.log('✅ Imaging order saved to imaging-orders.json');

      // Also add timeline entry
      const imgData = imagingOrder as any;
      await addTimelineEntry(imgData.patientId, {
        type: 'imaging_order',
        action: 'created',
        resourceId: imagingOrder.id,
        summary: `Imaging order created: ${imgData.type || imagingOrder.modality || 'Imaging study'}`,
        doctorId: imagingOrder.doctorId,
      });
    } else {
      console.error('❌ Failed to save imaging order:', result.error);
    }

    return result;
  }

  // ===========================================================================
  // HELPER METHODS
  // ===========================================================================

  /**
   * Get default statistics
   */
  private getDefaultStats(): DoctorStats {
    return {
      todayStats: {
        appointmentsCount: 0,
        patientsSeenCount: 0,
        pendingPrescriptions: 0,
        unreadMessages: 0,
      },
      averageConsultationTime: 0,
      patientSatisfaction: 0,
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const doctorDataService = DoctorDataService.getInstance();
export default doctorDataService;
