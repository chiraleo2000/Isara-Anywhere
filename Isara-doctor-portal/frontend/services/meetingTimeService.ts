/**
 * Meeting Time Service
 * 
 * Handles meeting time validation and window management:
 * - Check if user can join meeting (15 min before / 30 min after)
 * - Handle missed meetings with auto-reschedule to next week
 * - Notify parties about meeting window
 */

import gcsDataService from './gcsDataService';

export interface MeetingTimeRules {
  allowJoinBefore: number; // minutes (default: 15)
  allowJoinAfter: number; // minutes (default: 30)
  autoRescheduleOnMiss: boolean;
  rescheduleToNextWeek: boolean;
  maxMissedAttempts: number;
}

export interface MeetingTimeCheck {
  canJoin: boolean;
  reason: string;
  minutesUntilStart?: number;
  minutesSinceEnd?: number;
  isEarly?: boolean;
  isLate?: boolean;
  windowStart?: Date;
  windowEnd?: Date;
}

export interface MeetingWindow {
  appointmentId: string;
  scheduledTime: Date;
  windowStart: Date;
  windowEnd: Date;
  status: 'before_window' | 'in_window' | 'after_window';
}

// Default meeting time rules
export const DEFAULT_MEETING_RULES: MeetingTimeRules = {
  allowJoinBefore: 15, // Can join 15 minutes before scheduled time
  allowJoinAfter: 30, // Can join up to 30 minutes after scheduled time
  autoRescheduleOnMiss: true,
  rescheduleToNextWeek: true,
  maxMissedAttempts: 3
};

class MeetingTimeService {
  private static instance: MeetingTimeService;
  private rules: MeetingTimeRules = DEFAULT_MEETING_RULES;

  private constructor() {}

  static getInstance(): MeetingTimeService {
    if (!MeetingTimeService.instance) {
      MeetingTimeService.instance = new MeetingTimeService();
    }
    return MeetingTimeService.instance;
  }

  /**
   * Load meeting rules from GCS
   */
  async loadRules(): Promise<MeetingTimeRules> {
    try {
      const rulesData = await gcsDataService.fetchFromGCS<MeetingTimeRules>('metadata', 'meeting-rules.json');
      if (rulesData) {
        this.rules = { ...DEFAULT_MEETING_RULES, ...rulesData };
      }
    } catch (error) {
      console.warn('Using default meeting rules:', error);
    }
    return this.rules;
  }

  /**
   * Get current meeting rules
   */
  getRules(): MeetingTimeRules {
    return this.rules;
  }

  /**
   * Check if current time is within meeting window
   */
  checkMeetingWindow(appointmentDate: Date | string, appointmentTime: string): MeetingTimeCheck {
    const now = new Date();
    
    // Parse appointment date and time
    const dateStr = typeof appointmentDate === 'string' 
      ? appointmentDate 
      : appointmentDate.toISOString().split('T')[0];
    
    const [hours, minutes] = appointmentTime.split(':').map(Number);
    const meetingStart = new Date(dateStr);
    meetingStart.setHours(hours, minutes, 0, 0);

    // Calculate window boundaries
    const windowStart = new Date(meetingStart.getTime() - this.rules.allowJoinBefore * 60 * 1000);
    const windowEnd = new Date(meetingStart.getTime() + this.rules.allowJoinAfter * 60 * 1000);

    // Check if before window
    if (now < windowStart) {
      const minutesUntilStart = Math.ceil((meetingStart.getTime() - now.getTime()) / (60 * 1000));
      const minutesUntilWindow = Math.ceil((windowStart.getTime() - now.getTime()) / (60 * 1000));
      
      return {
        canJoin: false,
        reason: `การนัดหมายยังไม่ถึงเวลา คุณสามารถเข้าร่วมได้ ${this.rules.allowJoinBefore} นาทีก่อนเวลานัด (อีก ${minutesUntilWindow} นาที)`,
        minutesUntilStart,
        isEarly: true,
        windowStart,
        windowEnd
      };
    }

    // Check if after window
    if (now > windowEnd) {
      const minutesSinceEnd = Math.ceil((now.getTime() - windowEnd.getTime()) / (60 * 1000));
      
      return {
        canJoin: false,
        reason: `เลยเวลานัดหมายแล้ว ระบบอนุญาตให้เข้าได้ภายใน ${this.rules.allowJoinAfter} นาทีหลังเวลานัดเท่านั้น`,
        minutesSinceEnd,
        isLate: true,
        windowStart,
        windowEnd
      };
    }

    // Within window
    const minutesUntilStart = Math.ceil((meetingStart.getTime() - now.getTime()) / (60 * 1000));
    const isEarly = now < meetingStart;
    const isLate = now > meetingStart;

    let reason: string;
    if (isEarly) {
      reason = `คุณสามารถเข้าร่วมได้เลย (ก่อนเวลานัด ${Math.abs(minutesUntilStart)} นาที)`;
    } else if (isLate) {
      reason = `คุณสามารถเข้าร่วมได้ (หลังเวลานัด ${Math.abs(minutesUntilStart)} นาที)`;
    } else {
      reason = 'ถึงเวลานัดหมายแล้ว เข้าร่วมได้เลย';
    }

    return {
      canJoin: true,
      reason,
      minutesUntilStart: isEarly ? minutesUntilStart : undefined,
      minutesSinceEnd: isLate ? Math.abs(minutesUntilStart) : undefined,
      isEarly,
      isLate,
      windowStart,
      windowEnd
    };
  }

  /**
   * Get meeting window information
   */
  getMeetingWindow(appointmentDate: Date | string, appointmentTime: string): MeetingWindow {
    const now = new Date();
    
    const dateStr = typeof appointmentDate === 'string' 
      ? appointmentDate 
      : appointmentDate.toISOString().split('T')[0];
    
    const [hours, minutes] = appointmentTime.split(':').map(Number);
    const scheduledTime = new Date(dateStr);
    scheduledTime.setHours(hours, minutes, 0, 0);

    const windowStart = new Date(scheduledTime.getTime() - this.rules.allowJoinBefore * 60 * 1000);
    const windowEnd = new Date(scheduledTime.getTime() + this.rules.allowJoinAfter * 60 * 1000);

    let status: 'before_window' | 'in_window' | 'after_window';
    if (now < windowStart) {
      status = 'before_window';
    } else if (now > windowEnd) {
      status = 'after_window';
    } else {
      status = 'in_window';
    }

    return {
      appointmentId: '', // To be filled by caller
      scheduledTime,
      windowStart,
      windowEnd,
      status
    };
  }

  /**
   * Calculate next week same time slot for rescheduling
   */
  calculateNextWeekSlot(originalDate: Date | string, originalTime: string): { date: string; time: string } {
    const dateStr = typeof originalDate === 'string' 
      ? originalDate 
      : originalDate.toISOString().split('T')[0];
    
    const nextWeekDate = new Date(dateStr);
    nextWeekDate.setDate(nextWeekDate.getDate() + 7);
    
    return {
      date: nextWeekDate.toISOString().split('T')[0],
      time: originalTime
    };
  }

  /**
   * Handle missed meeting
   */
  async handleMissedMeeting(
    appointmentId: string,
    missedBy: 'patient' | 'doctor',
    currentMissedCount: number
  ): Promise<{
    rescheduled: boolean;
    newDate?: string;
    newTime?: string;
    cancelled?: boolean;
    reason: string;
  }> {
    const newMissedCount = currentMissedCount + 1;

    // Check if max attempts exceeded
    if (newMissedCount >= this.rules.maxMissedAttempts) {
      return {
        rescheduled: false,
        cancelled: true,
        reason: `นัดหมายถูกยกเลิกเนื่องจากไม่มาตามนัดเกิน ${this.rules.maxMissedAttempts} ครั้ง`
      };
    }

    // Auto reschedule to next week
    if (this.rules.autoRescheduleOnMiss && this.rules.rescheduleToNextWeek) {
      // The actual rescheduling will be done by the calling code
      // This just returns the recommendation
      return {
        rescheduled: true,
        reason: `นัดหมายจะถูกเลื่อนไปสัปดาห์หน้าเวลาเดิม (ไม่มาตามนัดครั้งที่ ${newMissedCount}/${this.rules.maxMissedAttempts}) - รอการอนุมัติจาก Admin`
      };
    }

    return {
      rescheduled: false,
      reason: 'นัดหมายถูกยกเลิกเนื่องจากไม่มาตามนัด กรุณานัดหมายใหม่'
    };
  }

  /**
   * Format time remaining message
   */
  formatTimeRemaining(minutes: number): string {
    if (minutes < 1) {
      return 'ไม่กี่วินาที';
    } else if (minutes < 60) {
      return `${minutes} นาที`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 
        ? `${hours} ชั่วโมง ${remainingMinutes} นาที`
        : `${hours} ชั่วโมง`;
    }
  }

  /**
   * Get meeting window display info
   */
  getWindowDisplayInfo(appointmentDate: Date | string, appointmentTime: string): {
    canJoinText: string;
    windowText: string;
    statusColor: 'green' | 'yellow' | 'red';
    icon: string;
  } {
    const check = this.checkMeetingWindow(appointmentDate, appointmentTime);
    
    if (check.canJoin) {
      return {
        canJoinText: 'สามารถเข้าร่วมได้',
        windowText: check.reason,
        statusColor: 'green',
        icon: '✅'
      };
    } else if (check.isEarly) {
      return {
        canJoinText: 'ยังไม่ถึงเวลา',
        windowText: check.reason,
        statusColor: 'yellow',
        icon: '⏰'
      };
    } else {
      return {
        canJoinText: 'เลยเวลาแล้ว',
        windowText: check.reason,
        statusColor: 'red',
        icon: '❌'
      };
    }
  }
}

export const meetingTimeService = MeetingTimeService.getInstance();
export default meetingTimeService;
