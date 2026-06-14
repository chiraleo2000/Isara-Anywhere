/**
 * Maps Processes/*.md pages to Vitest regression files — gate for documentation coverage.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  ALL_PROCESS_WORKFLOW_ENTRIES,
  DOCTOR_PORTAL_PROCESS_TESTS,
  PATIENT_PORTAL_PROCESS_TESTS,
  MEETING_SERVER_PROCESS_TESTS,
  HIGH_LEVEL_WORKFLOW_TESTS,
  uniqueUnitTestFiles,
} from './processWorkflowRegistry.ts';

const root = path.resolve(__dirname, '../../..');
const unitRoot = path.join(root, 'tests/unit');

describe('processPageCoverage — full Processes documentation registry', () => {
  for (const entry of ALL_PROCESS_WORKFLOW_ENTRIES) {
    it(`PCOV — ${path.basename(entry.processDoc)} [${entry.priority}] has unit tests`, () => {
      expect(fs.existsSync(path.join(root, entry.processDoc)), `missing doc ${entry.processDoc}`).toBe(true);
      expect(entry.unitTests.length, `no tests mapped for ${entry.processDoc}`).toBeGreaterThan(0);
      for (const testRel of entry.unitTests) {
        const testPath = path.join(unitRoot, testRel);
        expect(fs.existsSync(testPath), `missing test ${testRel} for ${entry.processDoc}`).toBe(true);
      }
    });
  }

  it('PCOV-DOC — all 22 doctor portal process pages registered', () => {
    expect(DOCTOR_PORTAL_PROCESS_TESTS).toHaveLength(22);
  });

  it('PCOV-PAT — all 16 patient portal process pages registered', () => {
    expect(PATIENT_PORTAL_PROCESS_TESTS).toHaveLength(16);
  });

  it('PCOV-MS — meeting server process pages registered', () => {
    expect(MEETING_SERVER_PROCESS_TESTS.length).toBeGreaterThanOrEqual(4);
  });

  it('PCOV-50 — registry covers 50+ process documents', () => {
    expect(ALL_PROCESS_WORKFLOW_ENTRIES.length).toBeGreaterThanOrEqual(50);
  });

  it('PCOV-HL — high-level workflow documents registered', () => {
    const docs = HIGH_LEVEL_WORKFLOW_TESTS.map((e) => e.processDoc);
    expect(docs).toContain('Processes/Appointment_Workflows.md');
    expect(docs).toContain('Processes/Health_Records_Processes.md');
    expect(docs).toContain('Processes/FULL_WORKFLOW_CONTRACT.md');
    expect(docs).toContain('Processes/VIDEO_MEETING_JITSI_GEMINI.md');
    expect(docs).toContain('Processes/Combined_Workflows_And_Actions.md');
    expect(docs).toContain('Processes/Separated_Workflows_And_Functions.md');
  });

  it('PCOV-UNIQUE — registry maps to existing test files only', () => {
    const files = uniqueUnitTestFiles();
    expect(files.length).toBeGreaterThan(80);
    for (const f of files) {
      expect(fs.existsSync(path.join(unitRoot, f)), `registry references missing ${f}`).toBe(true);
    }
  });

  it('PCOV-ALL — core Process directories exist', () => {
    for (const dir of [
      'Processes/Pages/Doctor-Portal',
      'Processes/Pages/Patient-Portal',
      'Processes/Pages/Meeting-Server',
    ]) {
      expect(fs.existsSync(path.join(root, dir))).toBe(true);
    }
  });
});
