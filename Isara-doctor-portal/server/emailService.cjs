/**
 * Email Service - Gmail API Integration
 * 
 * Sends transactional emails for:
 * - Password reset requests
 * - Doctor registration notifications (to admin)
 * - Approval/Rejection notifications (to doctors)
 * 
 * NOTE: googleapis is lazy-loaded to avoid slow Cloud Run cold starts
 */

const path = require('node:path');
const fs = require('node:fs');

// Lazy-loaded to avoid slow Cloud Run cold starts
let google = null;
function getGoogleApis() {
  if (!google) {
    console.log('[EMAIL] Lazy-loading googleapis...');
    google = require('googleapis').google;
    console.log('[EMAIL] googleapis loaded');
  }
  return google;
}

// Email templates
const EMAIL_TEMPLATES = {
  passwordReset: (resetLink, userName) => ({
    subject: 'Reset Your Izara Doctor Portal Password',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #059669 0%, #0d9488 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .button { display: inline-block; background: #059669; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
          .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 10px 10px; }
          .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">🏥 Izara Doctor Portal</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Password Reset Request</p>
          </div>
          <div class="content">
            <h2>Hello ${userName || 'Doctor'},</h2>
            <p>We received a request to reset your password for your Izara Doctor Portal account.</p>
            <p>Click the button below to reset your password:</p>
            <div style="text-align: center;">
              <a href="${resetLink}" class="button">Reset Password</a>
            </div>
            <div class="warning">
              <strong>⚠️ Security Notice:</strong>
              <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                <li>This link expires in 1 hour</li>
                <li>If you didn't request this, please ignore this email</li>
                <li>Never share this link with anyone</li>
              </ul>
            </div>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Izara Telemedicine. All rights reserved.</p>
            <p>This is an automated message. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Hello ${userName || 'Doctor'},
      
      We received a request to reset your password for your Izara Doctor Portal account.
      
      Click this link to reset your password: ${resetLink}
      
      This link expires in 1 hour.
      If you didn't request this, please ignore this email.
      
      © ${new Date().getFullYear()} Izara Telemedicine
    `
  }),

  adminNotification: (doctorName, doctorEmail, specialty, registrationDate) => ({
    subject: `🆕 New Doctor Registration - ${doctorName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .info-box { background: white; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px; margin: 15px 0; }
          .label { font-weight: bold; color: #6b7280; font-size: 12px; text-transform: uppercase; }
          .value { font-size: 16px; color: #111827; margin-top: 5px; }
          .button { display: inline-block; background: #4f46e5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
          .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 10px 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">🏥 Admin Notification</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">New Doctor Registration</p>
          </div>
          <div class="content">
            <h2>A new doctor has registered!</h2>
            <p>Please review and approve/reject this registration:</p>
            
            <div class="info-box">
              <div style="margin-bottom: 15px;">
                <div class="label">Doctor Name</div>
                <div class="value">${doctorName}</div>
              </div>
              <div style="margin-bottom: 15px;">
                <div class="label">Email</div>
                <div class="value">${doctorEmail}</div>
              </div>
              <div style="margin-bottom: 15px;">
                <div class="label">Specialty</div>
                <div class="value">${specialty || 'Not specified'}</div>
              </div>
              <div>
                <div class="label">Registration Date</div>
                <div class="value">${new Date(registrationDate).toLocaleString()}</div>
              </div>
            </div>

            <div style="text-align: center;">
              <a href="${process.env.APP_URL || 'http://localhost:5173'}/doctor-management" class="button">Review Registration</a>
            </div>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Izara Telemedicine. All rights reserved.</p>
            <p>This notification was sent to the admin team.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      New Doctor Registration
      
      A new doctor has registered and requires approval:
      
      Doctor Name: ${doctorName}
      Email: ${doctorEmail}
      Specialty: ${specialty || 'Not specified'}
      Registration Date: ${new Date(registrationDate).toLocaleString()}
      
      Please log in to the admin panel to review this registration.
      
      © ${new Date().getFullYear()} Izara Telemedicine
    `
  }),

  approvalNotification: (doctorName) => ({
    subject: '✅ Your Izara Doctor Portal Registration is Approved!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .success-icon { font-size: 60px; margin-bottom: 20px; }
          .button { display: inline-block; background: #059669; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
          .features { background: white; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .feature { display: flex; align-items: center; margin: 10px 0; }
          .feature-icon { margin-right: 10px; color: #059669; }
          .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 10px 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="success-icon">🎉</div>
            <h1 style="margin: 0;">Registration Approved!</h1>
          </div>
          <div class="content">
            <h2>Congratulations, Dr. ${doctorName}!</h2>
            <p>Your registration to the Izara Doctor Portal has been approved. You can now access all features of the platform.</p>
            
            <div class="features">
              <h3 style="margin-top: 0;">What you can do now:</h3>
              <div class="feature">
                <span class="feature-icon">✓</span>
                <span>Manage patient records and medical history</span>
              </div>
              <div class="feature">
                <span class="feature-icon">✓</span>
                <span>Schedule and conduct virtual consultations</span>
              </div>
              <div class="feature">
                <span class="feature-icon">✓</span>
                <span>Create prescriptions and order lab tests</span>
              </div>
              <div class="feature">
                <span class="feature-icon">✓</span>
                <span>Access AI-powered clinical decision support</span>
              </div>
            </div>

            <div style="text-align: center;">
              <a href="${process.env.APP_URL || 'http://localhost:5173'}/login" class="button">Login to Your Portal</a>
            </div>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Izara Telemedicine. All rights reserved.</p>
            <p>Welcome to the Izara family!</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Congratulations, Dr. ${doctorName}!
      
      Your registration to the Izara Doctor Portal has been approved!
      
      You can now log in and access all features of the platform:
      - Manage patient records and medical history
      - Schedule and conduct virtual consultations
      - Create prescriptions and order lab tests
      - Access AI-powered clinical decision support
      
      Login here: ${process.env.APP_URL || 'http://localhost:5173'}/login
      
      Welcome to the Izara family!
      
      © ${new Date().getFullYear()} Izara Telemedicine
    `
  }),

  rejectionNotification: (doctorName, reason) => ({
    subject: '❌ Your Izara Doctor Portal Registration Status',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .reason-box { background: #fef2f2; border: 1px solid #fecaca; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 10px 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">Registration Update</h1>
          </div>
          <div class="content">
            <h2>Dear Dr. ${doctorName},</h2>
            <p>We regret to inform you that your registration to the Izara Doctor Portal was not approved at this time.</p>
            
            <div class="reason-box">
              <strong>Reason:</strong>
              <p style="margin: 10px 0 0 0;">${reason || 'Your application did not meet our current requirements.'}</p>
            </div>

            <p>If you believe this was in error or have additional documentation to provide, please contact our support team.</p>
            
            <p style="margin-top: 20px;">
              <strong>Contact Support:</strong><br>
              Email: support@izara-telemedicine.com
            </p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Izara Telemedicine. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Dear Dr. ${doctorName},
      
      We regret to inform you that your registration to the Izara Doctor Portal was not approved at this time.
      
      Reason: ${reason || 'Your application did not meet our current requirements.'}
      
      If you believe this was in error or have additional documentation to provide, please contact our support team at support@izara-telemedicine.com.
      
      © ${new Date().getFullYear()} Izara Telemedicine
    `
  })
};

class EmailService {
  gmail = null;
  initialized = false;
  senderEmail = process.env.GMAIL_SENDER_EMAIL || 'admin.test@izara.com';

  async initialize() {
    try {
      // Try to load service account credentials
      const keyFilePath = path.join(__dirname, '..', 'public', 'izara-telemedicine-dd0b6abe2bc8.json');

      if (fs.existsSync(keyFilePath)) {
        // Lazy-load googleapis only when needed
        const google = getGoogleApis();

        const auth = new google.auth.GoogleAuth({
          keyFile: keyFilePath,
          scopes: ['https://www.googleapis.com/auth/gmail.send']
        });

        this.gmail = google.gmail({ version: 'v1', auth });
        this.initialized = true;
        console.log('✅ Email service initialized with service account');
      } else {
        console.warn('⚠️ Gmail service account key not found. Email sending will be simulated.');
        this.initialized = false;
      }
    } catch (error) {
      console.error('❌ Failed to initialize email service:', error.message);
      this.initialized = false;
    }
  }

  /**
   * Encode email to base64url format for Gmail API
   */
  encodeMessage(to, subject, htmlContent, textContent) {
    const boundary = 'boundary_' + Date.now();

    const message = [
      `From: Izara Doctor Portal <${this.senderEmail}>`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset=UTF-8',
      '',
      textContent,
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset=UTF-8',
      '',
      htmlContent,
      '',
      `--${boundary}--`
    ].join('\n');

    return Buffer.from(message)
      .toString('base64')
      .replaceAll('+', '-')
      .replaceAll('/', '_')
      .replace(/=+$/, '');
  }

  /**
   * Send email using Gmail API
   */
  async sendEmail(to, template) {
    console.log(`📧 Sending email to: ${to}`);
    console.log(`   Subject: ${template.subject}`);

    if (!this.initialized || !this.gmail) {
      console.log('📧 [SIMULATED] Email would be sent:');
      console.log(`   To: ${to}`);
      console.log(`   Subject: ${template.subject}`);
      console.log(`   Content preview: ${template.text.substring(0, 100)}...`);
      return { success: true, simulated: true };
    }

    try {
      const encodedMessage = this.encodeMessage(to, template.subject, template.html, template.text);

      await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage
        }
      });

      console.log('✅ Email sent successfully');
      return { success: true, simulated: false };
    } catch (error) {
      console.error('❌ Failed to send email:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(to, resetToken, userName) {
    const resetLink = `${process.env.APP_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
    const template = EMAIL_TEMPLATES.passwordReset(resetLink, userName);
    return this.sendEmail(to, template);
  }

  /**
   * Notify admin of new doctor registration
   */
  async sendAdminNotification(adminEmail, doctorData) {
    const template = EMAIL_TEMPLATES.adminNotification(
      doctorData.name,
      doctorData.email,
      doctorData.specialty,
      doctorData.createdAt
    );
    return this.sendEmail(adminEmail, template);
  }

  /**
   * Notify doctor of approval
   */
  async sendApprovalNotification(doctorEmail, doctorName) {
    const template = EMAIL_TEMPLATES.approvalNotification(doctorName);
    return this.sendEmail(doctorEmail, template);
  }

  /**
   * Notify doctor of rejection
   */
  async sendRejectionNotification(doctorEmail, doctorName, reason) {
    const template = EMAIL_TEMPLATES.rejectionNotification(doctorName, reason);
    return this.sendEmail(doctorEmail, template);
  }
}

// Create singleton instance
const emailService = new EmailService();

module.exports = { emailService, EmailService };
