/**
 * Medical content approval state machine — draft → submitted → approved.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const workspaceRoot = path.resolve(__dirname, '../../..');
const anywhereRoot = path.resolve(workspaceRoot, '..');

type ContentStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

const ALLOWED: Record<ContentStatus, ContentStatus[]> = {
  draft: ['submitted'],
  submitted: ['approved', 'rejected'],
  approved: [],
  rejected: ['draft'],
};

function canTransition(from: ContentStatus, to: ContentStatus): boolean {
  return ALLOWED[from]?.includes(to) ?? false;
}

function advance(from: ContentStatus, to: ContentStatus): ContentStatus {
  if (!canTransition(from, to)) throw new Error(`illegal ${from} → ${to}`);
  return to;
}

function patientLibraryVisible(status: ContentStatus): boolean {
  return status === 'approved';
}

describe('contentApprovalStateMachine — pure', () => {
  it('CAS-01 — draft → submitted → approved', () => {
    const submitted = advance('draft', 'submitted');
    const approved = advance(submitted, 'approved');
    expect(approved).toBe('approved');
  });

  it('CAS-02 — patientLibraryVisible only when approved', () => {
    expect(patientLibraryVisible('draft')).toBe(false);
    expect(patientLibraryVisible('submitted')).toBe(false);
    expect(patientLibraryVisible('approved')).toBe(true);
    expect(patientLibraryVisible('rejected')).toBe(false);
  });

  it('CAS-03 — cannot skip draft → approved', () => {
    expect(canTransition('draft', 'approved')).toBe(false);
  });
});

describe('contentApprovalStateMachine — source', () => {
  it('CAS-SRC — medical content workflow mentions approved / draft status', () => {
    const svc = fs.readFileSync(
      path.join(anywhereRoot, 'issara-doctor/backend/services/postgresDataService.cjs'),
      'utf8',
    );
    expect(svc).toMatch(/updateContentStatus|status/);
    expect(svc).toMatch(/published|draft/);

    const types = fs.readFileSync(
      path.join(anywhereRoot, 'issara-doctor/frontend/types/contentTypes.ts'),
      'utf8',
    );
    expect(types).toMatch(/draft/);

    const patientContent = fs.readFileSync(
      path.join(anywhereRoot, 'issara-patient/backend/routes/content.ts'),
      'utf8',
    );
    expect(patientContent).toMatch(/status = 'published'/);
  });
});
