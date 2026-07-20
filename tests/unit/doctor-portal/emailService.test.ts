/**
 * Doctor backend: emailService.cjs (Gmail API / simulation).
 * No real googleapis network — uses missing credentials + simulation path.
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
const emailPath = path.join(doctorBackend, 'emailService.cjs');

function loadEmail() {
  delete require.cache[emailPath];
  return require(emailPath) as {
    EmailService: new () => {
      initialize: () => Promise<void>;
      encodeMessage: (to: string, subject: string, html: string, text: string) => string;
      sendEmail: (to: string, template: { subject: string; html: string; text: string }) => Promise<Record<string, unknown>>;
      sendPasswordResetEmail: (to: string, token: string, name?: string) => Promise<Record<string, unknown>>;
      sendAdminNotification: (admin: string, data: Record<string, unknown>) => Promise<Record<string, unknown>>;
      sendApprovalNotification: (email: string, name: string) => Promise<Record<string, unknown>>;
      sendRejectionNotification: (email: string, name: string, reason?: string) => Promise<Record<string, unknown>>;
      initialized: boolean;
      gmail: unknown;
      senderEmail: string;
    };
    emailService: unknown;
  };
}

describe('emailService', () => {
  const prevCreds = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const prevAppUrl = process.env.APP_URL;

  beforeEach(() => {
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    process.env.APP_URL = 'http://localhost:5173';
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    if (prevCreds === undefined) delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    else process.env.GOOGLE_APPLICATION_CREDENTIALS = prevCreds;
    if (prevAppUrl === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = prevAppUrl;
    vi.restoreAllMocks();
  });

  it('exports EmailService class and singleton', () => {
    const mod = loadEmail();
    expect(typeof mod.EmailService).toBe('function');
    expect(mod.emailService).toBeTruthy();
  });

  it('initialize without credentials stays in simulation mode', async () => {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(doctorBackend, 'no-such-key.json');
    const { EmailService } = loadEmail();
    const svc = new EmailService();
    await svc.initialize();
    expect(svc.initialized).toBe(false);
    expect(svc.gmail).toBeNull();
  });

  it('encodeMessage produces base64url without + / =', () => {
    const { EmailService } = loadEmail();
    const svc = new EmailService();
    const encoded = svc.encodeMessage(
      'doc@example.com',
      'Subject & Test',
      '<p>Hello</p>',
      'Hello',
    );
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(encoded).not.toContain('+');
    expect(encoded).not.toContain('/');
    expect(encoded).not.toMatch(/=$/);
    const decoded = Buffer.from(encoded.replaceAll('-', '+').replaceAll('_', '/'), 'base64').toString('utf8');
    expect(decoded).toContain('To: doc@example.com');
    expect(decoded).toContain('Subject: Subject & Test');
    expect(decoded).toContain('<p>Hello</p>');
  });

  it('sendEmail simulates when not initialized', async () => {
    const { EmailService } = loadEmail();
    const svc = new EmailService();
    const result = await svc.sendEmail('a@b.com', {
      subject: 'Hi',
      html: '<p>x</p>',
      text: 'x content long enough for preview truncation checks in logs',
    });
    expect(result).toEqual({ success: true, simulated: true });
  });

  it('sendPasswordResetEmail simulates and embeds reset link', async () => {
    const { EmailService } = loadEmail();
    const svc = new EmailService();
    const spy = vi.spyOn(svc, 'sendEmail');
    const result = await svc.sendPasswordResetEmail('doc@example.com', 'tok-abc', 'Dr Alice');
    expect(result).toMatchObject({ success: true, simulated: true });
    expect(spy).toHaveBeenCalledOnce();
    const template = spy.mock.calls[0][1] as { subject: string; html: string; text: string };
    expect(template.subject).toMatch(/Reset/i);
    expect(template.html).toContain('token=tok-abc');
    expect(template.html).toContain('Dr Alice');
  });

  it('sendAdminNotification / approval / rejection simulate successfully', async () => {
    const { EmailService } = loadEmail();
    const svc = new EmailService();

    await expect(
      svc.sendAdminNotification('admin@example.com', {
        name: 'Dr Bob',
        email: 'bob@example.com',
        specialty: 'Cardiology',
        createdAt: '2026-01-01T00:00:00.000Z',
      }),
    ).resolves.toMatchObject({ success: true, simulated: true });

    await expect(svc.sendApprovalNotification('bob@example.com', 'Bob')).resolves.toMatchObject({
      success: true,
      simulated: true,
    });

    await expect(
      svc.sendRejectionNotification('bob@example.com', 'Bob', 'Incomplete docs'),
    ).resolves.toMatchObject({ success: true, simulated: true });
  });

  it('sendEmail with mocked gmail API returns success', async () => {
    const { EmailService } = loadEmail();
    const svc = new EmailService();
    const send = vi.fn(async () => ({}));
    svc.initialized = true;
    svc.gmail = { users: { messages: { send } } };

    const result = await svc.sendEmail('a@b.com', {
      subject: 'Real',
      html: '<p>y</p>',
      text: 'y',
    });
    expect(result).toEqual({ success: true, simulated: false });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'me',
        requestBody: expect.objectContaining({ raw: expect.any(String) }),
      }),
    );
  });

  it('sendEmail with mocked gmail API returns failure on throw', async () => {
    const { EmailService } = loadEmail();
    const svc = new EmailService();
    svc.initialized = true;
    svc.gmail = {
      users: {
        messages: {
          send: vi.fn(async () => {
            throw new Error('quota');
          }),
        },
      },
    };

    await expect(
      svc.sendEmail('a@b.com', { subject: 'X', html: '<p/>', text: 'x' }),
    ).resolves.toEqual({ success: false, error: 'quota' });
  });
});
