/**
 * Doctor backend: smtpEmailService.cjs
 * Coverage: template helpers, simulation send, real transporter path (mocked), presets.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const doctorBackend = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../../issara-doctor/backend',
);
const smtpPath = path.join(doctorBackend, 'smtpEmailService.cjs');

const SMTP_ENV_KEYS = [
  'SMTP_PROVIDER',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_SECURE',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM_EMAIL',
  'SMTP_FROM_NAME',
  'SMTP_TLS_REJECT_UNAUTHORIZED',
] as const;

function clearSmtpEnv() {
  for (const key of SMTP_ENV_KEYS) {
    delete process.env[key];
  }
}

function loadSmtp() {
  delete require.cache[smtpPath];
  return require(smtpPath) as {
    smtpEmailService: {
      initialize: () => void;
      verify: () => Promise<{ success: boolean; error?: string }>;
      sendRawEmail: (o: Record<string, unknown>) => Promise<Record<string, unknown>>;
      sendTemplateEmail: (o: Record<string, unknown>) => Promise<Record<string, unknown>>;
      sendAppointmentConfirmation: (o: Record<string, unknown>) => Promise<Record<string, unknown>>;
      sendAppointmentDeclined: (o: Record<string, unknown>) => Promise<Record<string, unknown>>;
      initialized: boolean;
      transporter: unknown;
      senderEmail: string | null;
      senderName: string | null;
      provider: string | null;
    };
    SmtpEmailService: new () => {
      initialize: () => void;
      verify: () => Promise<{ success: boolean; error?: string }>;
      sendRawEmail: (o: Record<string, unknown>) => Promise<Record<string, unknown>>;
      sendTemplateEmail: (o: Record<string, unknown>) => Promise<Record<string, unknown>>;
      sendAppointmentConfirmation: (o: Record<string, unknown>) => Promise<Record<string, unknown>>;
      sendAppointmentDeclined: (o: Record<string, unknown>) => Promise<Record<string, unknown>>;
      initialized: boolean;
      transporter: {
        sendMail?: (opts: unknown) => Promise<{ messageId: string }>;
        verify?: () => Promise<boolean>;
      } | null;
      senderEmail: string | null;
      senderName: string | null;
      provider: string | null;
    };
    renderTemplate: (name: string, vars?: Record<string, unknown>) => string;
    htmlToPlainText: (html: string) => string;
  };
}

describe('smtpEmailService', () => {
  const envSnapshot: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of SMTP_ENV_KEYS) {
      envSnapshot[key] = process.env[key];
    }
    clearSmtpEnv();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    clearSmtpEnv();
    for (const key of SMTP_ENV_KEYS) {
      if (envSnapshot[key] === undefined) delete process.env[key];
      else process.env[key] = envSnapshot[key];
    }
    vi.restoreAllMocks();
  });

  describe('htmlToPlainText / renderTemplate', () => {
    it('strips tags and decodes entities', () => {
      const { htmlToPlainText } = loadSmtp();
      const text = htmlToPlainText('<p>Hello<br/>&amp; World</p><script>x</script>');
      expect(text).toContain('Hello');
      expect(text).toContain('& World');
      expect(text).not.toContain('<script>');
    });

    it('escapes HTML in {{var}} and keeps {{{var}}} raw', () => {
      const { renderTemplate } = loadSmtp();
      const html = renderTemplate('appointment-confirmation', {
        patientName: '<script>x</script>',
        doctorName: 'Dr Test',
        appointmentDate: '2026-07-15',
        appointmentTime: '10:00',
        meetingLink: 'https://meet.example/abc?x=1&y=2',
        doctorNotes: '',
      });
      expect(html).not.toContain('<script>x</script>');
      expect(html).toContain('&lt;script&gt;');
      expect(html).toContain('https://meet.example/abc?x=1&y=2');
    });

    it('throws when template is missing', () => {
      const { renderTemplate } = loadSmtp();
      expect(() => renderTemplate('no-such-template', {})).toThrow(/Email template not found/);
    });

    it('omits {{#if}} blocks when variable is falsy', () => {
      const { renderTemplate } = loadSmtp();
      const withNotes = renderTemplate('appointment-confirmation', {
        patientName: 'A',
        doctorName: 'B',
        appointmentDate: 'd',
        appointmentTime: 't',
        meetingLink: '',
        doctorNotes: 'Please arrive early',
      });
      const withoutNotes = renderTemplate('appointment-confirmation', {
        patientName: 'A',
        doctorName: 'B',
        appointmentDate: 'd',
        appointmentTime: 't',
        meetingLink: '',
        doctorNotes: '',
      });
      expect(withNotes).toContain('Please arrive early');
      expect(withoutNotes).not.toContain('Please arrive early');
    });
  });

  describe('SmtpEmailService simulation mode', () => {
    it('initialize without SMTP config stays uninitialized', () => {
      const { SmtpEmailService } = loadSmtp();
      const svc = new SmtpEmailService();
      svc.initialize();
      expect(svc.initialized).toBe(false);
      expect(svc.transporter).toBeNull();
    });

    it('verify fails when not initialized', async () => {
      const { SmtpEmailService } = loadSmtp();
      const svc = new SmtpEmailService();
      svc.initialize();
      await expect(svc.verify()).resolves.toEqual({
        success: false,
        error: 'SMTP not initialized',
      });
    });

    it('sendRawEmail simulates success without transporter', async () => {
      const { SmtpEmailService } = loadSmtp();
      const svc = new SmtpEmailService();
      svc.initialize();
      const result = await svc.sendRawEmail({
        to: 'p@example.com',
        subject: 'Test',
        html: '<p>Hi</p>',
      });
      expect(result).toMatchObject({ success: true, simulated: true });
    });

    it('sendTemplateEmail returns error for missing template', async () => {
      const { SmtpEmailService } = loadSmtp();
      const svc = new SmtpEmailService();
      const result = await svc.sendTemplateEmail({
        to: 'p@example.com',
        subject: 'X',
        template: 'missing-template',
        variables: {},
      });
      expect(result.success).toBe(false);
      expect(String(result.error)).toMatch(/Email template not found/);
    });

    it('sendAppointmentConfirmation uses confirmation template (simulated)', async () => {
      const { SmtpEmailService } = loadSmtp();
      const svc = new SmtpEmailService();
      svc.initialize();
      const result = await svc.sendAppointmentConfirmation({
        to: 'p@example.com',
        patientName: 'Patient',
        doctorName: 'Doctor',
        appointmentDate: '2026-07-15',
        appointmentTime: '09:00',
        meetingLink: 'https://meet.example/r',
      });
      expect(result).toMatchObject({ success: true, simulated: true });
    });

    it('sendAppointmentDeclined uses declined template (simulated)', async () => {
      const { SmtpEmailService } = loadSmtp();
      const svc = new SmtpEmailService();
      svc.initialize();
      const result = await svc.sendAppointmentDeclined({
        to: 'p@example.com',
        patientName: 'Patient',
        doctorName: 'Doctor',
        appointmentDate: '2026-07-15',
        appointmentTime: '09:00',
        reason: 'Consult',
        declineReason: 'Unavailable',
      });
      expect(result).toMatchObject({ success: true, simulated: true });
    });
  });

  describe('SmtpEmailService with mocked transporter', () => {
    it('sendRawEmail uses transporter.sendMail and returns messageId', async () => {
      const { SmtpEmailService } = loadSmtp();
      const svc = new SmtpEmailService();
      const sendMail = vi.fn(async () => ({ messageId: 'mid-123' }));
      svc.initialized = true;
      svc.transporter = { sendMail };
      svc.senderEmail = 'noreply@izara.com';
      svc.senderName = 'Izara';

      const result = await svc.sendRawEmail({
        to: 'p@example.com',
        cc: 'cc@example.com',
        subject: 'Hello',
        html: '<b>Hi</b>',
        text: 'Hi',
      });

      expect(result).toEqual({ success: true, messageId: 'mid-123' });
      expect(sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'p@example.com',
          cc: 'cc@example.com',
          subject: 'Hello',
          html: '<b>Hi</b>',
        }),
      );
    });

    it('sendRawEmail returns failure when sendMail throws', async () => {
      const { SmtpEmailService } = loadSmtp();
      const svc = new SmtpEmailService();
      svc.initialized = true;
      svc.transporter = {
        sendMail: vi.fn(async () => {
          throw new Error('SMTP down');
        }),
      };
      svc.senderEmail = 'noreply@izara.com';
      svc.senderName = 'Izara';

      const result = await svc.sendRawEmail({
        to: 'p@example.com',
        subject: 'Hello',
        html: '<p>x</p>',
      });
      expect(result).toEqual({ success: false, error: 'SMTP down' });
    });

    it('verify succeeds when transporter.verify resolves', async () => {
      const { SmtpEmailService } = loadSmtp();
      const svc = new SmtpEmailService();
      svc.initialized = true;
      svc.transporter = { verify: vi.fn(async () => true) };
      await expect(svc.verify()).resolves.toEqual({ success: true });
    });

    it('verify returns error when transporter.verify throws', async () => {
      const { SmtpEmailService } = loadSmtp();
      const svc = new SmtpEmailService();
      svc.initialized = true;
      svc.transporter = {
        verify: vi.fn(async () => {
          throw new Error('auth failed');
        }),
      };
      await expect(svc.verify()).resolves.toEqual({
        success: false,
        error: 'auth failed',
      });
    });
  });

  describe('initialize with env + nodemailer', () => {
    it('initializes transporter when SMTP_HOST and credentials are set', () => {
      process.env.SMTP_HOST = 'smtp.example.com';
      process.env.SMTP_PORT = '587';
      process.env.SMTP_USER = 'user';
      process.env.SMTP_PASS = 'pass';
      process.env.SMTP_FROM_EMAIL = 'from@example.com';
      process.env.SMTP_FROM_NAME = 'From Name';

      const { SmtpEmailService } = loadSmtp();
      const svc = new SmtpEmailService();
      svc.initialize();
      expect(svc.initialized).toBe(true);
      expect(svc.transporter).toBeTruthy();
      expect(svc.senderEmail).toBe('from@example.com');
      expect(svc.senderName).toBe('From Name');
      expect(svc.provider).toBe('custom');
    });

    it('uses gmail preset host when SMTP_PROVIDER=gmail', () => {
      process.env.SMTP_PROVIDER = 'gmail';
      process.env.SMTP_USER = 'user@gmail.com';
      process.env.SMTP_PASS = 'app-pass';

      const { SmtpEmailService } = loadSmtp();
      const svc = new SmtpEmailService();
      svc.initialize();
      expect(svc.initialized).toBe(true);
      expect(svc.provider).toBe('gmail');
    });
  });
});
