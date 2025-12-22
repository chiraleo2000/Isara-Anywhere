/**
 * Appointment Reschedule Service
 * 
 * Handles automatic rescheduling of missed meetings:
 * - Reschedule to same day/time next week
 * - Track missed attempts
 * - Send back to pool after max attempts
 * - Admin approval for special cases
 */

import gcsDataService, { writeToGCS } from './gcsDataService';
import meetingTimeService, { DEFAULT_MEETING_RULES } from './meetingTimeService';

export interface RescheduleRecord {
  appointmentId: string;
  originalDate: string;
  originalTime: string;
  newDate: string;
  newTime: string;
  missedAttempt: number;
  reason: string;
  rescheduledAt: string;
  rescheduledBy: 'system' | 'admin' | 'doctor' | 'patient';
  notificationSent: boolean;
}

export interface MissedMeetingResult {
  action: 'rescheduled' | 'sent_to_pool' | 'requires_admin';
  newAppointment?: {
    date: string;
    time: string;
    attemptNumber: number;
  };
  reason: string;
  notificationMessage: string;
}

export interface AppointmentForReschedule {
  id: string;
  patientId: string;
  doctorId?: string;
  date: string;
  time: string;
  missedAttempts?: number;
  status: string;
  type?: string;
  symptoms?: string[];
}

class AppointmentRescheduleService {
  private static instance: AppointmentRescheduleService;

  private constructor() {}

  static getInstance(): AppointmentRescheduleService {
    if (!AppointmentRescheduleService.instance) {
      AppointmentRescheduleService.instance = new AppointmentRescheduleService();
    }
    return AppointmentRescheduleService.instance;
  }

  /**
   * Calculate next week same day/time
   */
  calculateNextWeekSlot(currentDate: string, currentTime: string): { date: string; time: string } {
    const date = new Date(currentDate);
    date.setDate(date.getDate() + 7); // Add 7 days
    
    return {
      date: date.toISOString().split('T')[0],
      time: currentTime // Keep same time
    };
  }

  /**
   * Handle missed meeting - auto-reschedule or send to pool
   */
  async handleMissedMeeting(appointment: AppointmentForReschedule): Promise<MissedMeetingResult> {
    const rules = meetingTimeService.getRules();
    const missedAttempts = (appointment.missedAttempts || 0) + 1;

    // Check if exceeded max attempts
    if (missedAttempts >= rules.maxMissedAttempts) {
      // Send to appointment pool for reassignment
      return this.sendToPool(appointment, missedAttempts);
    }

    // Auto-reschedule to next week
    if (rules.autoRescheduleOnMiss && rules.rescheduleToNextWeek) {
      return this.rescheduleToNextWeek(appointment, missedAttempts);
    }

    // Fallback: require admin intervention
    return {
      action: 'requires_admin',
      reason: 'การนัดหมายต้องได้รับการอนุมัติจาก Admin ก่อนเลื่อนนัด',
      notificationMessage: 'กรุณาติดต่อ Admin เพื่อจัดการนัดหมายใหม่'
    };
  }

  /**
   * Reschedule appointment to next week same time
   */
  async rescheduleToNextWeek(
    appointment: AppointmentForReschedule, 
    missedAttempts: number
  ): Promise<MissedMeetingResult> {
    const nextSlot = this.calculateNextWeekSlot(appointment.date, appointment.time);
    
    try {
      // Update appointment in GCS
      const updatedAppointment = {
        ...appointment,
        date: nextSlot.date,
        time: nextSlot.time,
        scheduledDate: nextSlot.date,
        scheduledTime: nextSlot.time,
        missedAttempts,
        status: 'rescheduled',
        lastRescheduledAt: new Date().toISOString(),
        rescheduledReason: 'missed_meeting_auto_reschedule'
      };

      // Save updated appointment
      await writeToGCS(
        'appointments',
        `appointments/${appointment.id}.json`,
        updatedAppointment
      );

      // Create reschedule record for audit
      const rescheduleRecord: RescheduleRecord = {
        appointmentId: appointment.id,
        originalDate: appointment.date,
        originalTime: appointment.time,
        newDate: nextSlot.date,
        newTime: nextSlot.time,
        missedAttempt: missedAttempts,
        reason: 'ผู้เข้าร่วมไม่เข้าประชุมภายในเวลาที่กำหนด',
        rescheduledAt: new Date().toISOString(),
        rescheduledBy: 'system',
        notificationSent: false
      };

      // Save reschedule record
      await this.saveRescheduleRecord(rescheduleRecord);

      // Format Thai date for notification
      const thaiDate = new Date(nextSlot.date).toLocaleDateString('th-TH', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      return {
        action: 'rescheduled',
        newAppointment: {
          date: nextSlot.date,
          time: nextSlot.time,
          attemptNumber: missedAttempts + 1
        },
        reason: `เลื่อนนัดอัตโนมัติไปสัปดาห์หน้า (ครั้งที่ ${missedAttempts} ที่พลาด)`,
        notificationMessage: `การนัดหมายของคุณถูกเลื่อนไปวันที่ ${thaiDate} เวลา ${nextSlot.time} น. เนื่องจากไม่มีผู้เข้าร่วมประชุม`
      };
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      return {
        action: 'requires_admin',
        reason: 'เกิดข้อผิดพลาดในการเลื่อนนัด กรุณาติดต่อ Admin',
        notificationMessage: 'ไม่สามารถเลื่อนนัดอัตโนมัติได้ กรุณาติดต่อเจ้าหน้าที่'
      };
    }
  }

  /**
   * Send appointment to pool for reassignment
   */
  async sendToPool(
    appointment: AppointmentForReschedule, 
    missedAttempts: number
  ): Promise<MissedMeetingResult> {
    try {
      // Create pool entry
      const poolEntry = {
        id: `pool_${appointment.id}_${Date.now()}`,
        appointmentId: appointment.id,
        patientId: appointment.patientId,
        originalDoctorId: appointment.doctorId,
        symptoms: appointment.symptoms || [],
        type: appointment.type || 'general',
        priority: 'medium',
        reason: 'max_missed_attempts',
        missedAttempts,
        addedAt: new Date().toISOString(),
        status: 'awaiting_assignment',
        requiresAdminApproval: true // Require admin approval after max misses
      };

      // Get existing pool
      let pool = await gcsDataService.fetchFromGCS<any[]>('appointments', 'appointment-pool.json') || [];
      pool.push(poolEntry);
      
      // Save updated pool
      await writeToGCS('appointments', 'appointment-pool.json', pool);

      // Update original appointment status
      const updatedAppointment = {
        ...appointment,
        status: 'in_pool',
        sentToPoolAt: new Date().toISOString(),
        poolReason: 'max_missed_attempts',
        missedAttempts
      };

      await writeToGCS(
        'appointments',
        `appointments/${appointment.id}.json`,
        updatedAppointment
      );

      return {
        action: 'sent_to_pool',
        reason: `เกินจำนวนครั้งที่พลาด (${missedAttempts} ครั้ง) - ส่งไปยังระบบจับคู่ใหม่`,
        notificationMessage: 'การนัดหมายของคุณถูกส่งกลับไปยังระบบเพื่อจับคู่แพทย์ใหม่ เนื่องจากพลาดนัดหลายครั้ง Admin จะติดต่อกลับเพื่อจัดเวลานัดใหม่'
      };
    } catch (error) {
      console.error('Error sending to pool:', error);
      return {
        action: 'requires_admin',
        reason: 'เกิดข้อผิดพลาด กรุณาติดต่อ Admin',
        notificationMessage: 'ไม่สามารถดำเนินการได้ กรุณาติดต่อเจ้าหน้าที่'
      };
    }
  }

  /**
   * Admin override: manually reschedule
   */
  async adminReschedule(
    appointment: AppointmentForReschedule,
    newDate: string,
    newTime: string,
    adminId: string
  ): Promise<MissedMeetingResult> {
    try {
      const updatedAppointment = {
        ...appointment,
        date: newDate,
        time: newTime,
        scheduledDate: newDate,
        scheduledTime: newTime,
        status: 'confirmed',
        missedAttempts: 0, // Reset missed attempts on admin reschedule
        lastRescheduledAt: new Date().toISOString(),
        rescheduledBy: adminId,
        rescheduledReason: 'admin_override'
      };

      await writeToGCS(
        'appointments',
        `appointments/${appointment.id}.json`,
        updatedAppointment
      );

      const rescheduleRecord: RescheduleRecord = {
        appointmentId: appointment.id,
        originalDate: appointment.date,
        originalTime: appointment.time,
        newDate,
        newTime,
        missedAttempt: appointment.missedAttempts || 0,
        reason: 'Admin จัดเวลานัดใหม่',
        rescheduledAt: new Date().toISOString(),
        rescheduledBy: 'admin',
        notificationSent: false
      };

      await this.saveRescheduleRecord(rescheduleRecord);

      const thaiDate = new Date(newDate).toLocaleDateString('th-TH', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      return {
        action: 'rescheduled',
        newAppointment: {
          date: newDate,
          time: newTime,
          attemptNumber: 1
        },
        reason: 'Admin จัดเวลานัดใหม่สำเร็จ',
        notificationMessage: `การนัดหมายของคุณถูกจัดเวลาใหม่โดย Admin เป็นวันที่ ${thaiDate} เวลา ${newTime} น.`
      };
    } catch (error) {
      console.error('Error in admin reschedule:', error);
      throw error;
    }
  }

  /**
   * Save reschedule record for audit trail
   */
  private async saveRescheduleRecord(record: RescheduleRecord): Promise<void> {
    try {
      let records = await gcsDataService.fetchFromGCS<RescheduleRecord[]>(
        'appointments',
        'reschedule-records.json'
      ) || [];
      
      records.push(record);
      
      await writeToGCS('appointments', 'reschedule-records.json', records);
    } catch (error) {
      console.error('Error saving reschedule record:', error);
    }
  }

  /**
   * Get reschedule history for an appointment
   */
  async getRescheduleHistory(appointmentId: string): Promise<RescheduleRecord[]> {
    try {
      const records = await gcsDataService.fetchFromGCS<RescheduleRecord[]>(
        'appointments',
        'reschedule-records.json'
      ) || [];
      
      return records.filter(r => r.appointmentId === appointmentId);
    } catch (error) {
      console.error('Error getting reschedule history:', error);
      return [];
    }
  }

  /**
   * Check if appointment needs rescheduling (scheduled task)
   */
  async checkAndRescheduleMissedMeetings(): Promise<void> {
    try {
      // Get all appointments from GCS
      const appointmentsIndex = await gcsDataService.fetchFromGCS<any[]>(
        'appointments',
        'appointments-index.json'
      ) || [];

      const now = new Date();
      const rules = meetingTimeService.getRules();

      for (const apt of appointmentsIndex) {
        if (apt.status !== 'confirmed' && apt.status !== 'rescheduled') {
          continue;
        }

        // Check if appointment time window has passed
        const aptDateTime = new Date(`${apt.date}T${apt.time}`);
        const windowEnd = new Date(aptDateTime.getTime() + rules.allowJoinAfter * 60 * 1000);

        if (now > windowEnd) {
          // Meeting window has passed, check if meeting was not started
          if (!apt.meetingStarted && !apt.completed) {
            console.log(`Auto-rescheduling missed appointment: ${apt.id}`);
            await this.handleMissedMeeting(apt);
          }
        }
      }
    } catch (error) {
      console.error('Error in scheduled reschedule check:', error);
    }
  }
}

const appointmentRescheduleService = AppointmentRescheduleService.getInstance();
export default appointmentRescheduleService;
