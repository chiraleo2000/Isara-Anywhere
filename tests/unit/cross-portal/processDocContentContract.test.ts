/**
 * Process page doc content contracts — UI Controls Inventory, deprecations, PHR tabs.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');
const pagesRoot = path.join(root, 'Processes/Pages');

function readPage(rel: string): string {
  return fs.readFileSync(path.join(pagesRoot, rel), 'utf8');
}

function listPageDocs(): string[] {
  const out: string[] = [];
  const walk = (dir: string, prefix: string) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ent.isDirectory()) walk(path.join(dir, ent.name), `${prefix}${ent.name}/`);
      else if (ent.name.endsWith('.md') && ent.name !== 'README.md') {
        out.push(`${prefix}${ent.name}`);
      }
    }
  };
  walk(pagesRoot, '');
  return out;
}

describe('processDocContentContract', () => {
  const pageDocs = listPageDocs();

  it('PDCC-42 — all 42 page specs have UI Controls Inventory', () => {
    expect(pageDocs.length).toBe(42);
    for (const rel of pageDocs) {
      const text = readPage(rel);
      expect(text, rel).toContain('## UI Controls Inventory');
    }
  });

  it('PDCC-20 — Appointment Pool page is DEPRECATED', () => {
    const text = readPage('Doctor-Portal/20_Appointment_Pool_Management.md');
    expect(text).toMatch(/DEPRECATED/i);
    expect(text).toContain('health-meeting');
  });

  it('PDCC-PHR — PHR page documents Documents tab and patient_documents flow', () => {
    const text = readPage('Patient-Portal/06_PHR_Page.md');
    expect(text).toContain('phr-tab-documents');
    expect(text).toContain('phr-document-upload');
  });

  it('PDCC-HM — Health Meeting documents queue controls', () => {
    const text = readPage('Doctor-Portal/06_Health_Meeting_Page.md');
    expect(text).toContain('queue-list');
    expect(text).toMatch(/queue-claim|Claim/i);
  });

  it('PDCC-07 — Virtual Meeting page marked removed in overview context', () => {
    const overview = readPage('Doctor-Portal/00_Doctor_Portal_Overview.md');
    expect(overview).toContain('health-meeting');
  });

  it('PDCC-CLINICAL — Clinical_Document_Delivery workflow doc exists', () => {
    const p = path.join(root, 'Processes/Clinical_Document_Delivery_Workflows.md');
    expect(fs.existsSync(p)).toBe(true);
    expect(fs.readFileSync(p, 'utf8')).toContain('patient_documents');
  });
});
