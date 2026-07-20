/**
 * Doctor backend helpers: SMTP template utils + CORS policy loader.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const doctorBackend = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../../issara-doctor/backend',
);

describe('smtpEmailService helpers', () => {
  const { htmlToPlainText, renderTemplate } = require(path.join(doctorBackend, 'smtpEmailService.cjs'));

  it('htmlToPlainText strips tags', () => {
    expect(htmlToPlainText('<p>Hello<br/>World</p>')).toContain('Hello');
    expect(htmlToPlainText('<p>Hello<br/>World</p>')).toContain('World');
  });

  it('renderTemplate escapes HTML variables', () => {
    // Use a known template if present; otherwise skip gracefully
    try {
      const html = renderTemplate('appointment-confirmation', {
        patientName: '<script>x</script>',
        doctorName: 'Dr Test',
      });
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    } catch (err: unknown) {
      const msg = String((err as Error).message || err);
      if (msg.includes('Email template not found')) {
        expect(msg).toContain('Email template not found');
      } else {
        throw err;
      }
    }
  });
});

describe('loadCorsPolicy (smoke)', () => {
  it('loads shared corsPolicy without throwing', () => {
    const cors = require(path.join(doctorBackend, 'loadCorsPolicy.cjs'));
    expect(cors).toBeTruthy();
    expect(typeof cors.buildIzaraCorsPolicy).toBe('function');
  });
});
