/**
 * UI element contract — P0 controls from UI_ELEMENT_COVERAGE.json exist in frontend code.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');
const jsonPath = path.join(root, 'tests/UI_ELEMENT_COVERAGE.json');

type ControlRow = {
  testid: string;
  priority: string;
  status: string;
  page: string;
};

function readFrontendSources(): string {
  const dirs = [
    path.join(root, 'Isara-doctor-portal/frontend'),
    path.join(root, 'Isara-patient-portal/frontend'),
  ];
  const chunks: string[] = [];
  for (const base of dirs) {
    if (!fs.existsSync(base)) continue;
    const walk = (dir: string) => {
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory() && ent.name !== 'node_modules') walk(full);
        else if (/\.(tsx|ts|jsx|js)$/.test(ent.name)) {
          chunks.push(fs.readFileSync(full, 'utf8'));
        }
      }
    };
    walk(base);
  }
  return chunks.join('\n');
}

describe('pageElementContract — P0 UI controls in code', () => {
  const rows: ControlRow[] = fs.existsSync(jsonPath)
    ? JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
    : [];
  const p0 = rows.filter((r) => r.priority === 'P0');
  const sources = readFrontendSources();

  it('PEC-00 — UI_ELEMENT_COVERAGE.json exists with P0 rows', () => {
    expect(p0.length).toBeGreaterThan(20);
  });

  for (const row of p0) {
    it(`PEC-P0 — ${row.testid} (${row.page})`, () => {
      const tid = row.testid;
      const inAttr = sources.includes(`data-testid="${tid}"`) || sources.includes(`data-testid='${tid}'`);
      const inMap = sources.includes(`'${tid}'`) || sources.includes(`"${tid}"`);
      expect(inAttr || inMap, `missing testid ${tid} in frontend`).toBe(true);
    });
  }

  it('PEC-PHR — all PHR tab testids registered', () => {
    for (const tab of [
      'phr-tab-overview',
      'phr-tab-vitals',
      'phr-tab-medications',
      'phr-tab-allergies',
      'phr-tab-lab-imaging',
      'phr-tab-documents',
      'phr-tab-profile',
      'phr-document-upload',
    ]) {
      expect(sources).toContain(tab);
    }
    // Prescription history is embedded in medications tab (no separate tab button)
    expect(sources).toMatch(/Medication History|ประวัติการรับยา/);
  });

  it('PEC-QUEUE — queue action buttons in AppointmentQueueCard', () => {
    const card = fs.readFileSync(
      path.join(root, 'Isara-doctor-portal/frontend/components/AppointmentQueueCard.tsx'),
      'utf8',
    );
    for (const tid of ['queue-claim-btn', 'queue-ai-match-btn']) {
      expect(card).toContain(`data-testid="${tid}"`);
    }
    const hm = fs.readFileSync(
      path.join(root, 'Isara-doctor-portal/frontend/pages/meetings/HealthMeeting.tsx'),
      'utf8',
    );
    expect(hm).toContain('data-testid="confirm-appointment-btn"');
  });

  it('PEC-MSG — patient message composer send button', () => {
    const composer = fs.readFileSync(
      path.join(root, 'Isara-doctor-portal/frontend/components/PatientMessageComposer.tsx'),
      'utf8',
    );
    expect(composer).toContain('data-testid="patient-message-send-btn"');
    expect(composer).toContain('/api/patients/${patient.id}/messages');
  });

  it('PEC-MEET-SHARE — guest URL hints + validate summary CTA', () => {
    const room = fs.readFileSync(
      path.join(root, 'Isara-doctor-portal/frontend/pages/meetings/MeetingRoom.tsx'),
      'utf8',
    );
    expect(room).toContain('data-testid="guest-join-url-hint"');
    expect(room).toContain('data-testid="guest-token-url-hint"');
    const results = fs.readFileSync(
      path.join(root, 'Isara-doctor-portal/frontend/pages/meetings/MeetingResults.tsx'),
      'utf8',
    );
    expect(results).toContain('data-testid="validate-summary-btn"');
  });

  it('PEC-RECORD — patient record viewer tab testids', () => {
    const viewer = fs.readFileSync(
      path.join(root, 'Isara-doctor-portal/frontend/components/PatientRecordViewer.tsx'),
      'utf8',
    );
    expect(viewer).toMatch(/patient-record-tab-\$\{tab\.key\}/);
    for (const key of ['summary', 'emr', 'labs', 'rx', 'docs', 'meetings', 'pdpa']) {
      expect(viewer).toContain(`key: '${key}'`);
    }
  });
});
