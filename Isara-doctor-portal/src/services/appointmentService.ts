/**
 * Appointment Service - Booking & Scheduling Management
 *
 * Uses GCS bucket: izara-appointments
 * - appointments.json - Main appointment index
 * - appointments/{id}.json - Individual appointment records
 * - appointments/{id}/meeting-link.json - Google Meet links
 * - {doctorId}/{date}.json - Doctor daily appointments
 *
 * Features:
 * - Telehealth appointments (Google Meet links)
 * - In-person appointments
 * - Emergency bookings
 * - Calendar event IDs
 * - Appointment status tracking
 */

import {
  Appointment,
  AppointmentStatus,
  AppointmentType,
} from '../types';
import {
  fetchAllAppointments,
  fetchAppointmentById,
  saveAppointment,
  fetchMeetingLink,
  saveMeetingLink,
  deleteMeetingLink,
  fetchDoctorAppointments,
  saveDoctorDayAppointments,
  fetchPatientAppointments,
  fetchAppointmentWithMeetLink,
  GCSWriteResult,
} from './gcsDataService';

// ============================================================================
// APPOINTMENT SERVICE CLASS
// ============================================================================

class AppointmentService {
  private static instance: AppointmentService;

  private constructor() { }

  static getInstance(): AppointmentService {
    if (!AppointmentService.instance) {
      AppointmentService.instance = new AppointmentService();
    }
    return AppointmentService.instance;
  }

  // ===========================================================================
  // FETCH APPOINTMENTS
  // ===========================================================================

  /**
   * Get all appointments
   */
  async getAllAppointments(): Promise<Appointment[]> {
    console.log('📅 Fetching all appointments from GCS...');
    const appointments = await fetchAllAppointments();
    console.log(`✅ Found ${appointments.length} appointments`);
    return appointments as Appointment[];
  }

  /**
   * Get appointment by ID
   */
  async getAppointmentById(appointmentId: string): Promise<Appointment | null> {
    console.log(`📅 Fetching appointment: ${appointmentId}`);
    const appointment = await fetchAppointmentById(appointmentId);
    return appointment as Appointment | null;
  }

  /**
   * Get appointments for a doctor (all or specific date)
   */
  async getDoctorAppointments(
    doctorId: string,
    date?: string
  ): Promise<Appointment[]> {
    console.log(`📅 Fetching appointments for doctor: ${doctorId}`);
    const appointments = await fetchDoctorAppointments(doctorId, date);
    console.log(`✅ Found ${appointments.length} appointments`);
    return appointments as Appointment[];
  }

  /**
   * Get today's appointments for a doctor
   */
  async getTodayAppointments(doctorId: string): Promise<Appointment[]> {
    const today = new Date().toISOString().split('T')[0];
    return this.getDoctorAppointments(doctorId, today);
  }

  /**
   * Get upcoming appointments for a doctor
   */
  async getUpcomingAppointments(
    doctorId: string,
    days: number = 7
  ): Promise<Appointment[]> {
    const allAppointments = await this.getDoctorAppointments(doctorId);

    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return allAppointments.filter(apt => {
      const aptDate = new Date(apt.date);
      return aptDate >= now && aptDate <= futureDate;
    });
  }

  /**
   * Get appointments for a patient
   */
  async getPatientAppointments(patientId: string): Promise<Appointment[]> {
    console.log(`📅 Fetching appointments for patient: ${patientId}`);
    const appointments = await fetchPatientAppointments(patientId);
    console.log(`✅ Found ${appointments.length} appointments`);
    return appointments as Appointment[];
  }

  /**
   * Get appointments by status
   */
  async getAppointmentsByStatus(
    doctorId: string,
    status: AppointmentStatus
  ): Promise<Appointment[]> {
    const appointments = await this.getDoctorAppointments(doctorId);
    return appointments.filter(apt => apt.status === status);
  }

  /**
   * Get appointments by type
   */
  async getAppointmentsByType(
    doctorId: string,
    type: AppointmentType
  ): Promise<Appointment[]> {
    const appointments = await this.getDoctorAppointments(doctorId);
    return appointments.filter(apt => apt.type === type);
  }

  // ===========================================================================
  // CREATE & UPDATE APPOINTMENTS
  // ===========================================================================

  /**
   * Create a new appointment
   */
  async createAppointment(
    appointmentData: Partial<Appointment>
  ): Promise<GCSWriteResult> {
    if (!appointmentData.user) {
      return { success: false, error: 'User is required to create an appointment' };
    }

    const appointmentId = `apt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const appointment: Appointment = {
      id: appointmentId,
      user: appointmentData.user,
      patientId: appointmentData.patientId || appointmentData.user.id,
      doctorId: appointmentData.doctorId,
      doctor: appointmentData.doctor,
      date: appointmentData.date || new Date(),
      type: appointmentData.type || AppointmentType.Consultation,
      status: AppointmentStatus.Pending,
      symptoms: appointmentData.symptoms || [],
      notes: appointmentData.notes || '',
      meetLink: appointmentData.meetLink,
      calendarEventId: appointmentData.calendarEventId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log(`📅 Creating appointment: ${appointmentId}`);
    const result = await saveAppointment(appointment);

    if (result.success) {
      console.log('✅ Appointment created successfully');

      // Also update doctor's daily appointments
      if (appointment.doctorId) {
        const dateStr = new Date(appointment.date).toISOString().split('T')[0];
        await this.updateDoctorDailyAppointments(
          appointment.doctorId,
          dateStr,
          appointment
        );
      }
    }

    return result;
  }

  /**
   * Update an existing appointment
   */
  async updateAppointment(
    appointmentId: string,
    updates: Partial<Appointment>
  ): Promise<GCSWriteResult> {
    console.log(`📅 Looking for appointment: ${appointmentId}`);
    const existing = await this.getAppointmentById(appointmentId);

    if (!existing) {
      console.error(`❌ Appointment not found: ${appointmentId}`);
      return { success: false, error: 'Appointment not found' };
    }

    console.log(`✅ Found appointment, merging updates...`);
    const updated: Appointment = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };

    console.log(`📅 Saving updated appointment: ${appointmentId}`);
    const result = await saveAppointment(updated);

    if (result.success && updated.doctorId) {
      // Handle both date and appointmentDate fields
      const dateValue = updated.date || (updated as any).appointmentDate;
      if (dateValue) {
        try {
          const dateStr = new Date(dateValue).toISOString().split('T')[0];
          await this.updateDoctorDailyAppointments(
            updated.doctorId,
            dateStr,
            updated
          );
        } catch (e) {
          console.warn('Could not update doctor daily appointments:', e);
        }
      }
    }

    return result;
  }

  /**
   * Update doctor's daily appointments
   */
  private async updateDoctorDailyAppointments(
    doctorId: string,
    date: string,
    appointment: Appointment
  ): Promise<void> {
    const dailyAppointments = await fetchDoctorAppointments(doctorId, date) as Appointment[];
    const existingIndex = dailyAppointments.findIndex(a => a.id === appointment.id);

    if (existingIndex >= 0) {
      dailyAppointments[existingIndex] = appointment;
    } else {
      dailyAppointments.push(appointment);
    }

    await saveDoctorDayAppointments(doctorId, date, dailyAppointments);
  }

  // ===========================================================================
  // STATUS MANAGEMENT
  // ===========================================================================

  /**
   * Confirm an appointment
   */
  async confirmAppointment(appointmentId: string): Promise<GCSWriteResult> {
    return this.updateAppointment(appointmentId, {
      status: AppointmentStatus.Confirmed,
      confirmedAt: new Date(),
    });
  }

  /**
   * Start an appointment (mark as in progress)
   */
  async startAppointment(appointmentId: string): Promise<GCSWriteResult> {
    return this.updateAppointment(appointmentId, {
      status: AppointmentStatus.InProgress,
    });
  }

  /**
   * Complete an appointment
   */
  async completeAppointment(
    appointmentId: string,
    result?: {
      diagnosis?: string;
      treatmentPlan?: string[];
      summary?: string;
    }
  ): Promise<GCSWriteResult> {
    return this.updateAppointment(appointmentId, {
      status: AppointmentStatus.Completed,
      diagnosis: result?.diagnosis,
      treatmentPlan: result?.treatmentPlan,
      summary: result?.summary,
    });
  }

  /**
   * Cancel an appointment
   */
  async cancelAppointment(
    appointmentId: string,
    reason?: string
  ): Promise<GCSWriteResult> {
    return this.updateAppointment(appointmentId, {
      status: AppointmentStatus.Cancelled,
      notes: reason,
    });
  }

  /**
   * Mark as no-show
   */
  async markNoShow(appointmentId: string): Promise<GCSWriteResult> {
    return this.updateAppointment(appointmentId, {
      status: AppointmentStatus.NoShow,
    });
  }

  /**
   * Reschedule an appointment
   */
  async rescheduleAppointment(
    appointmentId: string,
    newDate: Date
  ): Promise<GCSWriteResult> {
    return this.updateAppointment(appointmentId, {
      status: AppointmentStatus.Rescheduled,
      date: newDate,
    });
  }

  // ===========================================================================
  // TELEHEALTH MANAGEMENT
  // ===========================================================================
  // Uses: appointments/{id}/meeting-link.json for separate meeting link storage

  /**
   * Add Google Meet link to appointment
   * Uses: appointments/{id}/meeting-link.json
   */
  async addMeetLink(
    appointmentId: string,
    meetLink: string,
    calendarEventId?: string
  ): Promise<GCSWriteResult> {
    console.log(`📹 Adding Meet link to appointment: ${appointmentId}`);

    // Save to separate meeting-link.json file
    const result = await saveMeetingLink(appointmentId, {
      meetLink,
      calendarEventId,
      createdAt: new Date().toISOString(),
    });

    if (result.success) {
      // Also update the main appointment record with the link
      await this.updateAppointment(appointmentId, {
        meetLink,
        calendarEventId,
      });
      console.log('✅ Meet link added successfully');
    }

    return result;
  }

  /**
   * Get meeting link for appointment
   * Uses: appointments/{id}/meeting-link.json
   */
  async getMeetingLink(appointmentId: string): Promise<{
    meetLink: string;
    calendarEventId?: string;
    createdAt?: string;
  } | null> {
    console.log(`📹 Fetching Meet link for appointment: ${appointmentId}`);
    return fetchMeetingLink(appointmentId);
  }

  /**
   * Remove meeting link from appointment
   */
  async removeMeetLink(appointmentId: string): Promise<boolean> {
    console.log(`📹 Removing Meet link from appointment: ${appointmentId}`);

    // Delete the meeting-link.json file
    const deleted = await deleteMeetingLink(appointmentId);

    if (deleted) {
      // Also clear from main appointment record
      await this.updateAppointment(appointmentId, {
        meetLink: undefined,
        calendarEventId: undefined,
      });
    }

    return deleted;
  }

  /**
   * Get appointment with meeting link (combined fetch)
   */
  async getAppointmentWithMeetLink(appointmentId: string): Promise<Appointment | null> {
    return fetchAppointmentWithMeetLink(appointmentId) as Promise<Appointment | null>;
  }

  /**
   * Get telehealth appointments
   */
  async getTelehealthAppointments(doctorId: string): Promise<Appointment[]> {
    return this.getAppointmentsByType(doctorId, AppointmentType.Telehealth);
  }

  /**
   * Get appointments with Meet links ready
   */
  async getReadyForMeetAppointments(doctorId: string): Promise<Appointment[]> {
    const appointments = await this.getTelehealthAppointments(doctorId);
    const readyAppointments: Appointment[] = [];

    for (const apt of appointments) {
      if (apt.status === AppointmentStatus.Confirmed) {
        // Check for meeting link in either the appointment or the separate file
        const meetingLink = apt.meetLink || (await this.getMeetingLink(apt.id))?.meetLink;
        if (meetingLink) {
          readyAppointments.push({
            ...apt,
            meetLink: meetingLink,
          });
        }
      }
    }

    return readyAppointments;
  }

  /**
   * Create telehealth appointment with Meet link
   */
  async createTelehealthAppointment(
    appointmentData: Partial<Appointment>,
    meetLink?: string,
    calendarEventId?: string
  ): Promise<GCSWriteResult> {
    // First create the appointment
    const result = await this.createAppointment({
      ...appointmentData,
      type: AppointmentType.Telehealth,
    });

    // If Meet link provided, save it separately
    if (result.success && meetLink) {
      const appointmentId = (result as any).appointmentId;
      if (appointmentId) {
        await this.addMeetLink(appointmentId, meetLink, calendarEventId);
      }
    }

    return result;
  }

  // ===========================================================================
  // STATISTICS & ANALYTICS
  // ===========================================================================

  /**
   * Get appointment statistics for a doctor
   */
  async getDoctorAppointmentStats(
    doctorId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    total: number;
    completed: number;
    cancelled: number;
    noShow: number;
    pending: number;
    byType: Record<AppointmentType, number>;
  }> {
    let appointments = await this.getDoctorAppointments(doctorId);

    // Filter by date range if provided
    if (startDate) {
      appointments = appointments.filter(
        apt => new Date(apt.date) >= startDate
      );
    }
    if (endDate) {
      appointments = appointments.filter(
        apt => new Date(apt.date) <= endDate
      );
    }

    const byType: Record<AppointmentType, number> = {
      [AppointmentType.Telehealth]: 0,
      [AppointmentType.InPerson]: 0,
      [AppointmentType.Emergency]: 0,
      [AppointmentType.FollowUp]: 0,
      [AppointmentType.Consultation]: 0,
    };

    appointments.forEach(apt => {
      if (apt.type in byType) {
        byType[apt.type]++;
      }
    });

    return {
      total: appointments.length,
      completed: appointments.filter(
        a => a.status === AppointmentStatus.Completed
      ).length,
      cancelled: appointments.filter(
        a => a.status === AppointmentStatus.Cancelled
      ).length,
      noShow: appointments.filter(
        a => a.status === AppointmentStatus.NoShow
      ).length,
      pending: appointments.filter(
        a => a.status === AppointmentStatus.Pending
      ).length,
      byType,
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const appointmentService = AppointmentService.getInstance();
export default appointmentService;
