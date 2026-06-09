/**
 * Notification Service for Appointments
 * 
 * Handles all appointment-related notifications:
 * - Email notifications (via Gmail API)
 * - In-app notifications (stored in GCS)
 * - Calendar event creation (Google Calendar)
 * 
 * Workflow Requirements:
 * 1. Patient books → Notify doctor/admin
 * 2. Doctor accepts/confirms → Notify patient, update calendar, generate meeting link (online only)
 * 3. Doctor declines → Notify patient, admin; status returns to pending
 * 4. Patient cancels → Notify doctor, admin immediately
 * 5. Admin assigns → Notify doctor for confirmation
 * 6. Meeting link fails → Fallback notification
 * 7. EMR signed → Notify patient, send to health logs
 * 8. Onsite appointment → No meeting link, send symptoms to doctor via email/calendar
 */

import { BUCKETS as GCS_BUCKETS, readJSON, writeJSON } from '../utils/localStore';

// Notification types
export type NotificationType = 
  | 'appointment_requested'
  | 'appointment_confirmed'
  | 'appointment_declined'
  | 'appointment_cancelled'
  | 'appointment_assigned'
  | 'appointment_rescheduled'
  | 'meeting_link_ready'
  | 'meeting_link_failed'
  | 'meeting_reminder'
  | 'emr_signed'
  | 'emr_ready_for_review'
  | 'lab_results'
  | 'lab_results_ready';

export interface Notification {
  id: string;
  type: NotificationType;
  recipientId: string;
  recipientEmail: string;
  recipientRole: 'patient' | 'doctor' | 'admin';
  title: string;
  message: string;
  data?: {
    appointmentId?: string;
    patientId?: string;
    meetingLink?: string;
    calendarEventUrl?: string;
    symptoms?: string[];
    urgency?: string;
    doctorName?: string;
    patientName?: string;
    appointmentDate?: string;
    appointmentTime?: string;
    appointmentType?: string;
  };
  channels: ('email' | 'in-app' | 'calendar')[];
  status: 'pending' | 'sent' | 'failed';
  createdAt: string;
  sentAt?: string;
  error?: string;
}

// Helper functions
// readJSON / writeJSON are imported from utils/localStore (local filesystem under ./data)

// Helper functions to avoid nested ternaries in templates
const getUrgencyLabel = (urgency: string): string => {
  if (urgency === 'emergency') return '🚨 ฉุกเฉิน';
  if (urgency === 'urgent') return '⚠️ เร่งด่วน';
  return '✅ ปกติ';
};

const formatSymptomsHtml = (symptoms: any): string => {
  if (!symptoms) return '';
  const text = typeof symptoms === 'object' ? JSON.stringify(symptoms) : symptoms;
  return '<p><strong>รายละเอียด:</strong> ' + text + '</p>';
};

const getTimeSlotLabel = (slot: string): string => {
  if (slot === 'morning') return 'เช้า';
  if (slot === 'afternoon') return 'บ่าย';
  return 'เย็น';
};

// Portal URLs (extracted to avoid nested template literals — S4624)
const DOCTOR_PORTAL_URL = process.env.VITE_DOCTOR_PORTAL_URL || 'http://localhost:3010';
const PATIENT_PORTAL_URL = process.env.VITE_PATIENT_PORTAL_URL || 'http://localhost:3005';
const CURRENT_YEAR = new Date().getFullYear();

// Email templates
const EMAIL_TEMPLATES = {
  appointmentRequested: (data: any) => ({
    subject: `🏥 คำขอนัดหมายใหม่จาก ${data.patientName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #059669, #0d9488); color: white; padding: 25px; border-radius: 10px 10px 0 0; text-align: center; }
          .content { background: #f9fafb; padding: 25px; border: 1px solid #e5e7eb; }
          .info-box { background: white; border: 1px solid #e5e7eb; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .symptoms { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .button { display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 15px 0; }
          .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 10px 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">🏥 Izara Telemedicine</h1>
            <p style="margin: 10px 0 0 0;">คำขอนัดหมายใหม่</p>
          </div>
          <div class="content">
            <h2>สวัสดีคุณหมอ,</h2>
            <p>มีคำขอนัดหมายใหม่จากผู้ป่วย:</p>
            
            <div class="info-box">
              <p><strong>ผู้ป่วย:</strong> ${data.patientName}</p>
              <p><strong>อีเมล:</strong> ${data.patientEmail}</p>
              <p><strong>รูปแบบการพบแพทย์:</strong> ${data.appointmentType === 'telehealth' ? '📹 ออนไลน์' : '🏥 ที่โรงพยาบาล'}</p>
              <p><strong>ความเร่งด่วน:</strong> ${getUrgencyLabel(data.urgency)}</p>
              <p><strong>วันที่ต้องการ:</strong> ${data.preferredDates?.join(', ') || 'ไม่ระบุ'}</p>
              <p><strong>ช่วงเวลา:</strong> ${getTimeSlotLabel(data.preferredTimeSlot)}</p>
            </div>

            <div class="symptoms">
              <h3 style="margin-top: 0;">📋 อาการของผู้ป่วย:</h3>
              <p><strong>อาการหลัก:</strong> ${data.reason || 'ไม่ระบุ'}</p>
              ${formatSymptomsHtml(data.symptoms)}
            </div>

            <div style="text-align: center;">
              <a href="${DOCTOR_PORTAL_URL}/appointment-pool" class="button">ดูคำขอนัดหมาย</a>
            </div>
          </div>
          <div class="footer">
            <p>© ${CURRENT_YEAR} Izara Telemedicine</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `คำขอนัดหมายใหม่จาก ${data.patientName}\n\nอาการ: ${data.reason}\nรูปแบบ: ${data.appointmentType}\n\nกรุณาตรวจสอบและยืนยันนัดหมาย`
  }),

  appointmentConfirmed: (data: any) => ({
    subject: `✅ นัดหมายของคุณได้รับการยืนยันแล้ว - ${data.appointmentDate}`,
    html: `
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
          </div>
          <div class="content">
            <h2>สวัสดี ${data.patientName},</h2>
            <p>นัดหมายของคุณได้รับการยืนยันจาก ${data.doctorName} แล้ว</p>
            
            <div class="info-box">
              <p><strong>📅 วันที่:</strong> ${data.appointmentDate}</p>
              <p><strong>🕐 เวลา:</strong> ${data.appointmentTime}</p>
              <p><strong>👨‍⚕️ แพทย์:</strong> ${data.doctorName}</p>
              <p><strong>📍 รูปแบบ:</strong> ${data.appointmentType === 'telehealth' ? '📹 ออนไลน์' : '🏥 ที่โรงพยาบาล'}</p>
            </div>

            ${data.meetingLink ? `
            <div class="meeting-link">
              <h3 style="margin-top: 0;">🔗 ลิงก์เข้าประชุม</h3>
              <p>คุณสามารถเข้าร่วมได้ 15 นาทีก่อนเวลานัด</p>
              <a href="${data.meetingLink}" class="button button-blue">เข้าร่วมการประชุม</a>
            </div>
            ` : `
            <div class="info-box" style="background: #fef3c7; border-color: #f59e0b;">
              <p><strong>📍 สถานที่นัดหมาย:</strong></p>
              <p>กรุณามาพบแพทย์ที่โรงพยาบาลตามวันและเวลาที่กำหนด</p>
            </div>
            `}

            <div style="text-align: center;">
              <a href="${data.calendarEventUrl}" class="button">➕ เพิ่มในปฏิทิน</a>
              <a href="${PATIENT_PORTAL_URL}/appointments" class="button">📋 ดูนัดหมาย</a>
            </div>
          </div>
          <div class="footer">
            <p>หากมีข้อสงสัยกรุณาติดต่อ support@izara-telemedicine.com</p>
            <p>© ${CURRENT_YEAR} Izara Telemedicine</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: 'นัดหมายยืนยันแล้ว!\n\nวันที่: ' + data.appointmentDate + '\nเวลา: ' + data.appointmentTime + '\nแพทย์: ' + data.doctorName + (data.meetingLink ? '\nลิงก์เข้าประชุม: ' + data.meetingLink : '')
  }),

  appointmentDeclined: (data: any) => ({
    subject: `📋 แพทย์ไม่สามารถรับนัดหมายได้ - กำลังจัดหาแพทย์ท่านอื่น`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 25px; border-radius: 10px 10px 0 0; text-align: center; }
          .content { background: #f9fafb; padding: 25px; border: 1px solid #e5e7eb; }
          .info-box { background: white; border: 1px solid #e5e7eb; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 10px 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">📋 อัปเดตสถานะนัดหมาย</h1>
          </div>
          <div class="content">
            <h2>สวัสดี ${data.patientName},</h2>
            <p>${data.doctorName} ไม่สามารถรับนัดหมายในช่วงเวลาที่คุณต้องการได้</p>
            <p><strong>แต่ไม่ต้องกังวล!</strong> ระบบกำลังจัดหาแพทย์ท่านอื่นที่เหมาะสมให้คุณ</p>
            
            <div class="info-box">
              <p>🔄 สถานะ: <strong>กำลังจัดหาแพทย์</strong></p>
              <p>คุณจะได้รับการแจ้งเตือนเมื่อมีแพทย์ยืนยันนัดหมายใหม่</p>
            </div>
          </div>
          <div class="footer">
            <p>© ${CURRENT_YEAR} Izara Telemedicine</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `แพทย์ไม่สามารถรับนัดหมายได้\n\nระบบกำลังจัดหาแพทย์ท่านอื่นให้คุณ คุณจะได้รับการแจ้งเตือนเมื่อมีแพทย์ยืนยันนัดหมายใหม่`
  }),

  appointmentCancelled: (data: any) => ({
    subject: `❌ นัดหมายถูกยกเลิก - ${data.appointmentDate}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #dc2626, #ef4444); color: white; padding: 25px; border-radius: 10px 10px 0 0; text-align: center; }
          .content { background: #f9fafb; padding: 25px; border: 1px solid #e5e7eb; }
          .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 10px 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">❌ นัดหมายถูกยกเลิก</h1>
          </div>
          <div class="content">
            <p>นัดหมายวันที่ ${data.appointmentDate} เวลา ${data.appointmentTime} ถูกยกเลิกแล้ว</p>
            <p><strong>ยกเลิกโดย:</strong> ${data.cancelledBy === 'patient' ? 'ผู้ป่วย' : 'แพทย์/ผู้ดูแลระบบ'}</p>
            ${data.reason ? `<p><strong>เหตุผล:</strong> ${data.reason}</p>` : ''}
          </div>
          <div class="footer">
            <p>© ${CURRENT_YEAR} Izara Telemedicine</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `นัดหมายถูกยกเลิก\n\nวันที่: ${data.appointmentDate}\nเวลา: ${data.appointmentTime}\nยกเลิกโดย: ${data.cancelledBy}`
  }),

  appointmentAssigned: (data: any) => ({
    subject: `📋 มีนัดหมายใหม่มอบหมายให้คุณ - รอการยืนยัน`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #7c3aed, #8b5cf6); color: white; padding: 25px; border-radius: 10px 10px 0 0; text-align: center; }
          .content { background: #f9fafb; padding: 25px; border: 1px solid #e5e7eb; }
          .info-box { background: white; border: 1px solid #e5e7eb; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .symptoms { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .button { display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 15px 0; }
          .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 10px 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">📋 นัดหมายใหม่รอการยืนยัน</h1>
          </div>
          <div class="content">
            <h2>สวัสดีคุณหมอ ${data.doctorName},</h2>
            <p>ผู้ดูแลระบบได้มอบหมายนัดหมายใหม่ให้คุณ กรุณาตรวจสอบและยืนยัน</p>
            
            <div class="info-box">
              <p><strong>ผู้ป่วย:</strong> ${data.patientName}</p>
              <p><strong>วันที่เสนอ:</strong> ${data.appointmentDate}</p>
              <p><strong>เวลา:</strong> ${data.appointmentTime}</p>
              <p><strong>รูปแบบ:</strong> ${data.appointmentType === 'telehealth' ? '📹 ออนไลน์' : '🏥 ที่โรงพยาบาล'}</p>
            </div>

            <div class="symptoms">
              <h3 style="margin-top: 0;">📋 อาการของผู้ป่วย:</h3>
              <p>${data.reason || 'ไม่ระบุ'}</p>
            </div>

            <div style="text-align: center;">
              <a href="${DOCTOR_PORTAL_URL}/appointment-pool" class="button">ยืนยัน/ปฏิเสธนัดหมาย</a>
            </div>
          </div>
          <div class="footer">
            <p>© ${CURRENT_YEAR} Izara Telemedicine</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `นัดหมายใหม่รอการยืนยัน\n\nผู้ป่วย: ${data.patientName}\nวันที่: ${data.appointmentDate}\nเวลา: ${data.appointmentTime}\n\nกรุณาเข้าไปยืนยันนัดหมาย`
  }),

  emrSigned: (data: any) => ({
    subject: `📄 บันทึกการรักษาพร้อมให้ตรวจสอบแล้ว`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #059669, #10b981); color: white; padding: 25px; border-radius: 10px 10px 0 0; text-align: center; }
          .content { background: #f9fafb; padding: 25px; border: 1px solid #e5e7eb; }
          .button { display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 15px 0; }
          .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 10px 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">📄 บันทึกการรักษาพร้อมแล้ว</h1>
          </div>
          <div class="content">
            <h2>สวัสดี ${data.patientName},</h2>
            <p>${data.doctorName} ได้จัดทำบันทึกการรักษาเสร็จสิ้นแล้ว</p>
            <p>คุณสามารถดูรายละเอียดได้ในประวัติสุขภาพของคุณ</p>
            
            <div style="text-align: center;">
              <a href="${PATIENT_PORTAL_URL}/phr" class="button">ดูประวัติสุขภาพ</a>
            </div>
          </div>
          <div class="footer">
            <p>© ${CURRENT_YEAR} Izara Telemedicine</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `บันทึกการรักษาพร้อมแล้ว\n\n${data.doctorName} ได้จัดทำบันทึกการรักษาเสร็จสิ้นแล้ว คุณสามารถดูรายละเอียดได้ในประวัติสุขภาพของคุณ`
  }),

  meetingLinkFailed: (data: any) => ({
    subject: `⚠️ ไม่สามารถสร้างลิงก์ประชุมได้ - กรุณาติดต่อผู้ดูแลระบบ`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 25px; border-radius: 10px 10px 0 0; text-align: center; }
          .content { background: #f9fafb; padding: 25px; border: 1px solid #e5e7eb; }
          .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 10px 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">⚠️ ปัญหาลิงก์ประชุม</h1>
          </div>
          <div class="content">
            <p>ระบบไม่สามารถสร้างลิงก์ประชุมสำหรับนัดหมายวันที่ ${data.appointmentDate} ได้</p>
            <p>ผู้ดูแลระบบกำลังดำเนินการแก้ไข คุณจะได้รับลิงก์ใหม่เร็วๆ นี้</p>
            <p>หากต้องการความช่วยเหลือ กรุณาติดต่อ support@izara-telemedicine.com</p>
          </div>
          <div class="footer">
            <p>© ${CURRENT_YEAR} Izara Telemedicine</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `ปัญหาลิงก์ประชุม\n\nระบบไม่สามารถสร้างลิงก์ประชุมได้ ผู้ดูแลระบบกำลังดำเนินการแก้ไข`
  })
};

class NotificationService {
  private readonly adminEmail: string;

  constructor() {
    this.adminEmail = process.env.ADMIN_EMAIL || 'admin.test@izara.com';
  }

  /**
   * Create a notification record
   * Stores in:
   * - General notifications list (metadata bucket)
   * - User-specific notifications for patient portal
   * - Doctor-specific notifications for doctor portal (when recipient is a doctor)
   */
  async createNotification(notification: Omit<Notification, 'id' | 'status' | 'createdAt'>): Promise<Notification> {
    const id = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const fullNotification: Notification = {
      ...notification,
      id,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    // Store notification in general list
    let notifications = await readJSON(GCS_BUCKETS.METADATA, 'notifications.json') || [];
    notifications.push(fullNotification);
    await writeJSON(GCS_BUCKETS.METADATA, 'notifications.json', notifications);

    // Store user-specific notification for in-app display
    const userNotificationsPath = `users/${notification.recipientId}/notifications.json`;
    let userNotifications = await readJSON(GCS_BUCKETS.METADATA, userNotificationsPath) || [];
    userNotifications.unshift(fullNotification);
    // Keep only last 100 notifications per user
    userNotifications = userNotifications.slice(0, 100);
    await writeJSON(GCS_BUCKETS.METADATA, userNotificationsPath, userNotifications);

    // IMPORTANT: Also store in doctor-portal-specific location for doctors
    // The doctor portal reads from GCS_BUCKETS.DOCTOR: doctors/{doctorId}/notifications.json
    if (notification.recipientRole === 'doctor' && notification.recipientId && notification.recipientId !== 'unassigned') {
      try {
        const doctorNotificationPath = `doctors/${notification.recipientId}/notifications.json`;
        
        // Read existing doctor notifications
        let doctorData: any = null;
        try {
          doctorData = await readJSON(GCS_BUCKETS.DOCTOR, doctorNotificationPath);
        } catch (err) {
          // File doesn't exist yet - will create new
          console.debug('[NOTIFICATION] Doctor notification file not found, creating new:', (err as Error).message);
        }
        
        if (!doctorData) {
          doctorData = {
            doctorId: notification.recipientId,
            notifications: [],
            lastUpdated: new Date().toISOString()
          };
        }
        
        // Format notification for doctor portal
        const doctorNotification = {
          id: fullNotification.id,
          type: fullNotification.type,
          title: fullNotification.title,
          message: fullNotification.message,
          data: {
            appointmentId: fullNotification.data?.appointmentId,
            patientId: fullNotification.data?.patientId,
            patientName: fullNotification.data?.patientName,
            meetingLink: fullNotification.data?.meetingLink,
            appointmentDate: fullNotification.data?.appointmentDate,
            appointmentTime: fullNotification.data?.appointmentTime,
            urgency: fullNotification.data?.urgency,
            symptoms: fullNotification.data?.symptoms,
          },
          isRead: false,
          createdAt: fullNotification.createdAt
        };
        
        doctorData.notifications = doctorData.notifications || [];
        doctorData.notifications.unshift(doctorNotification);
        
        // Keep only last 100 notifications
        if (doctorData.notifications.length > 100) {
          doctorData.notifications = doctorData.notifications.slice(0, 100);
        }
        
        doctorData.lastUpdated = new Date().toISOString();
        
        await writeJSON(GCS_BUCKETS.DOCTOR, doctorNotificationPath, doctorData);
        console.log(`✅ [NOTIFICATION] Doctor notification stored for ${notification.recipientId}: ${fullNotification.type}`);
      } catch (err) {
        console.error(`⚠️ [NOTIFICATION] Failed to store doctor notification:`, err);
        // Don't fail the main notification creation
      }
    }

    return fullNotification;
  }

  /**
   * Send notification via email (simulated for now)
   */
  async sendEmail(to: string, template: { subject: string; html: string; text: string }): Promise<boolean> {
    console.log(`📧 [EMAIL] Sending to: ${to}`);
    console.log(`📧 [EMAIL] Subject: ${template.subject}`);
    // In production, integrate with Gmail API or other email service
    // For now, log the email
    console.log(`📧 [EMAIL] Content preview: ${template.text.substring(0, 100)}...`);
    return true;
  }

  /**
   * Generate Google Calendar event URL
   */
  generateCalendarUrl(data: {
    title: string;
    description: string;
    startDateTime: string;
    endDateTime: string;
    location?: string;
  }): string {
    const startDate = new Date(data.startDateTime).toISOString().replaceAll(/[-:]/g, '').split('.')[0] + 'Z';
    const endDate = new Date(data.endDateTime).toISOString().replaceAll(/[-:]/g, '').split('.')[0] + 'Z';
    
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(data.title)}&dates=${startDate}/${endDate}&details=${encodeURIComponent(data.description)}&location=${encodeURIComponent(data.location || '')}`;
  }

  /**
   * Generate Video Meeting link using Jitsi Meet
   * Jitsi Meet provides free, secure, anonymous video conferencing
   * No Google account required - works for patients, doctors, and guests
   */
  async generateMeetingLink(appointmentId: string): Promise<string | null> {
    try {
      // Use Jitsi Meet - free, open-source, anonymous access
      const JITSI_DOMAIN = process.env.JITSI_DOMAIN || 'meet.jit.si';
      
      // Generate a secure, unique room name
      const timestamp = Date.now().toString(36);
      const randomPart = Math.random().toString(36).substring(2, 8);
      const roomName = `Izara-${appointmentId.substring(0, 8)}-${timestamp}-${randomPart}`;
      
      // Build Jitsi URL with configuration for medical consultations
      const patientLabel =
        appointmentData.patientName
        || appointmentData.patient_name
        || appointmentData.patientNameThai
        || 'Patient';

      const config = new URLSearchParams({
        'config.prejoinPageEnabled': 'false',
        'config.requireDisplayName': 'false',
        'userInfo.displayName': patientLabel,
        'config.startWithAudioMuted': 'false',
        'config.startWithVideoMuted': 'false',
        'config.enableClosePage': 'true',
        'config.disableDeepLinking': 'true',
        'interfaceConfig.TOOLBAR_BUTTONS': JSON.stringify([
          'microphone', 'camera', 'desktop', 'chat', 'raisehand',
          'participants-pane', 'tileview', 'hangup', 'recording'
        ]),
        'interfaceConfig.SETTINGS_SECTIONS': JSON.stringify(['devices', 'language']),
        'interfaceConfig.DISABLE_JOIN_LEAVE_NOTIFICATIONS': 'false',
        'interfaceConfig.SHOW_CHROME_EXTENSION_BANNER': 'false'
      });
      
      const meetLink = `https://${JITSI_DOMAIN}/${roomName}#${config.toString()}`;
      
      console.log(`🔗 [MEETING] Generated Jitsi Meet link for ${appointmentId}: https://${JITSI_DOMAIN}/${roomName}`);
      return meetLink;
    } catch (error) {
      console.error('Failed to generate meeting link:', error);
      return null;
    }
  }

  // Appointment Notifications

  async notifyAppointmentRequested(appointmentData: any): Promise<void> {
    const template = EMAIL_TEMPLATES.appointmentRequested(appointmentData);
    
    // Notify doctor if specific doctor selected
    if (appointmentData.doctorId && appointmentData.doctorId !== 'unassigned') {
      await this.createNotification({
        type: 'appointment_requested',
        recipientId: appointmentData.doctorId,
        recipientEmail: appointmentData.doctorEmail || '',
        recipientRole: 'doctor',
        title: 'คำขอนัดหมายใหม่',
        message: `${appointmentData.patientName} ส่งคำขอนัดหมาย`,
        data: appointmentData,
        channels: ['email', 'in-app']
      });
      await this.sendEmail(appointmentData.doctorEmail, template);
    }

    // Always notify admin
    await this.createNotification({
      type: 'appointment_requested',
      recipientId: 'admin',
      recipientEmail: this.adminEmail,
      recipientRole: 'admin',
      title: 'คำขอนัดหมายใหม่',
      message: `${appointmentData.patientName} ส่งคำขอนัดหมาย`,
      data: appointmentData,
      channels: ['email', 'in-app']
    });
    await this.sendEmail(this.adminEmail, template);
  }

  /**
   * Notify when doctor confirms appointment
   * Returns the meeting link and calendar URL for storage in appointment
   */
  async notifyAppointmentConfirmed(appointmentData: any): Promise<{ meetingLink: string | null; calendarEventUrl: string }> {
    // Generate meeting link for online appointments
    let meetingLink: string | null = null;
    if (appointmentData.appointmentType === 'telehealth' || appointmentData.type === 'telehealth') {
      meetingLink = await this.generateMeetingLink(appointmentData.appointmentId);
      if (!meetingLink) {
        // Send fallback notification if meeting link generation fails
        await this.notifyMeetingLinkFailed(appointmentData);
      }
      console.log(`🔗 [MEETING] Generated meeting link for ${appointmentData.appointmentId}: ${meetingLink}`);
    }

    // Generate calendar URL
    const startDateTime = new Date(`${appointmentData.appointmentDate}T${appointmentData.appointmentTime}:00`);
    const endDateTime = new Date(startDateTime.getTime() + 30 * 60 * 1000); // 30 min appointment
    
    const calendarEventUrl = this.generateCalendarUrl({
      title: `นัดหมายแพทย์ - ${appointmentData.doctorName}`,
      description: 'นัดหมายกับ ' + appointmentData.doctorName + '\n' + (appointmentData.reason || '') + '\n' + (meetingLink ? 'ลิงก์ประชุม: ' + meetingLink : ''),
      startDateTime: startDateTime.toISOString(),
      endDateTime: endDateTime.toISOString(),
      location: meetingLink || 'โรงพยาบาล'
    });

    const template = EMAIL_TEMPLATES.appointmentConfirmed({
      ...appointmentData,
      meetingLink,
      calendarEventUrl
    });

    // Notify patient
    await this.createNotification({
      type: 'appointment_confirmed',
      recipientId: appointmentData.patientId,
      recipientEmail: appointmentData.patientEmail,
      recipientRole: 'patient',
      title: 'นัดหมายยืนยันแล้ว',
      message: `นัดหมายวันที่ ${appointmentData.appointmentDate} เวลา ${appointmentData.appointmentTime} ได้รับการยืนยันแล้ว${meetingLink ? ' พร้อมลิงก์เข้าประชุม' : ''}`,
      data: { ...appointmentData, meetingLink, calendarEventUrl },
      channels: ['email', 'in-app', 'calendar']
    });
    await this.sendEmail(appointmentData.patientEmail, template);

    console.log(`✅ [NOTIFICATION] Appointment confirmed notification sent to ${appointmentData.patientEmail}`);
    return { meetingLink, calendarEventUrl };
  }

  /**
   * Notify when doctor declines appointment
   */
  async notifyAppointmentDeclined(appointmentData: any): Promise<void> {
    const template = EMAIL_TEMPLATES.appointmentDeclined(appointmentData);

    // Notify patient
    await this.createNotification({
      type: 'appointment_declined',
      recipientId: appointmentData.patientId,
      recipientEmail: appointmentData.patientEmail,
      recipientRole: 'patient',
      title: 'แพทย์ไม่สามารถรับนัดหมายได้',
      message: 'ระบบกำลังจัดหาแพทย์ท่านอื่นให้คุณ',
      data: appointmentData,
      channels: ['email', 'in-app']
    });
    await this.sendEmail(appointmentData.patientEmail, template);

    // Notify admin to reschedule
    await this.createNotification({
      type: 'appointment_declined',
      recipientId: 'admin',
      recipientEmail: this.adminEmail,
      recipientRole: 'admin',
      title: 'แพทย์ปฏิเสธนัดหมาย',
      message: `${appointmentData.doctorName} ไม่สามารถรับนัดหมายจาก ${appointmentData.patientName} ได้`,
      data: appointmentData,
      channels: ['email', 'in-app']
    });
  }

  /**
   * Notify when appointment is cancelled
   */
  async notifyAppointmentCancelled(appointmentData: any, cancelledBy: 'patient' | 'doctor' | 'admin'): Promise<void> {
    const template = EMAIL_TEMPLATES.appointmentCancelled({ ...appointmentData, cancelledBy });

    // Notify doctor
    if (appointmentData.doctorId && appointmentData.doctorId !== 'unassigned') {
      await this.createNotification({
        type: 'appointment_cancelled',
        recipientId: appointmentData.doctorId,
        recipientEmail: appointmentData.doctorEmail || '',
        recipientRole: 'doctor',
        title: 'นัดหมายถูกยกเลิก',
        message: `นัดหมายกับ ${appointmentData.patientName} ถูกยกเลิกโดย${cancelledBy === 'patient' ? 'ผู้ป่วย' : 'ผู้ดูแลระบบ'}`,
        data: { ...appointmentData, cancelledBy },
        channels: ['email', 'in-app']
      });
      if (appointmentData.doctorEmail) {
        await this.sendEmail(appointmentData.doctorEmail, template);
      }
    }

    // Notify patient if cancelled by doctor/admin
    if (cancelledBy !== 'patient') {
      await this.createNotification({
        type: 'appointment_cancelled',
        recipientId: appointmentData.patientId,
        recipientEmail: appointmentData.patientEmail,
        recipientRole: 'patient',
        title: 'นัดหมายถูกยกเลิก',
        message: `นัดหมายวันที่ ${appointmentData.appointmentDate} ถูกยกเลิก`,
        data: { ...appointmentData, cancelledBy },
        channels: ['email', 'in-app']
      });
      await this.sendEmail(appointmentData.patientEmail, template);
    }

    // Always notify admin
    await this.createNotification({
      type: 'appointment_cancelled',
      recipientId: 'admin',
      recipientEmail: this.adminEmail,
      recipientRole: 'admin',
      title: 'นัดหมายถูกยกเลิก',
      message: `นัดหมายระหว่าง ${appointmentData.patientName} และ ${appointmentData.doctorName} ถูกยกเลิก`,
      data: { ...appointmentData, cancelledBy },
      channels: ['email', 'in-app']
    });
  }

  /**
   * Notify when admin assigns appointment to doctor
   */
  async notifyAppointmentAssigned(appointmentData: any): Promise<void> {
    const template = EMAIL_TEMPLATES.appointmentAssigned(appointmentData);

    // Notify assigned doctor
    await this.createNotification({
      type: 'appointment_assigned',
      recipientId: appointmentData.doctorId,
      recipientEmail: appointmentData.doctorEmail || '',
      recipientRole: 'doctor',
      title: 'นัดหมายใหม่มอบหมายให้คุณ',
      message: `มีนัดหมายจาก ${appointmentData.patientName} รอการยืนยัน`,
      data: appointmentData,
      channels: ['email', 'in-app']
    });
    if (appointmentData.doctorEmail) {
      await this.sendEmail(appointmentData.doctorEmail, template);
    }
  }

  /**
   * Notify when meeting link generation fails
   */
  async notifyMeetingLinkFailed(appointmentData: any): Promise<void> {
    const template = EMAIL_TEMPLATES.meetingLinkFailed(appointmentData);

    // Notify patient
    await this.createNotification({
      type: 'meeting_link_failed',
      recipientId: appointmentData.patientId,
      recipientEmail: appointmentData.patientEmail,
      recipientRole: 'patient',
      title: 'ปัญหาลิงก์ประชุม',
      message: 'ระบบกำลังดำเนินการแก้ไข',
      data: appointmentData,
      channels: ['email', 'in-app']
    });
    await this.sendEmail(appointmentData.patientEmail, template);

    // Notify admin to resolve
    await this.createNotification({
      type: 'meeting_link_failed',
      recipientId: 'admin',
      recipientEmail: this.adminEmail,
      recipientRole: 'admin',
      title: '⚠️ ปัญหาลิงก์ประชุม',
      message: `ไม่สามารถสร้างลิงก์ประชุมสำหรับนัดหมาย ${appointmentData.appointmentId}`,
      data: appointmentData,
      channels: ['email', 'in-app']
    });
  }

  /**
   * Notify when EMR is signed and ready
   */
  async notifyEMRSigned(appointmentData: any): Promise<void> {
    const template = EMAIL_TEMPLATES.emrSigned(appointmentData);

    // Notify patient
    await this.createNotification({
      type: 'emr_signed',
      recipientId: appointmentData.patientId,
      recipientEmail: appointmentData.patientEmail,
      recipientRole: 'patient',
      title: 'บันทึกการรักษาพร้อมแล้ว',
      message: 'คุณสามารถดูบันทึกการรักษาได้ในประวัติสุขภาพ',
      data: appointmentData,
      channels: ['email', 'in-app']
    });
    await this.sendEmail(appointmentData.patientEmail, template);
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(userId: string): Promise<Notification[]> {
    const userNotificationsPath = `users/${userId}/notifications.json`;
    return await readJSON(GCS_BUCKETS.METADATA, userNotificationsPath) || [];
  }

  /**
   * Mark notification as read
   */
  async markAsRead(userId: string, notificationId: string): Promise<void> {
    const userNotificationsPath = `users/${userId}/notifications.json`;
    let notifications = await readJSON(GCS_BUCKETS.METADATA, userNotificationsPath) || [];
    
    notifications = notifications.map((n: any) => 
      n.id === notificationId ? { ...n, read: true, readAt: new Date().toISOString() } : n
    );
    
    await writeJSON(GCS_BUCKETS.METADATA, userNotificationsPath, notifications);
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;
