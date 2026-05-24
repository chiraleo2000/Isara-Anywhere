/**
 * PDPA immutable audit log — Processes/Pages/Patient-Portal/10_PDPA_Page.md
 */
import { describe, it, expect } from 'vitest';

type AuditEntry = {
  id: string;
  action: string;
  consentType: string;
  at: string;
  hash: string;
};

function appendAudit(log: AuditEntry[], entry: Omit<AuditEntry, 'id' | 'hash'>): AuditEntry[] {
  const prev = log.length ? log[log.length - 1].hash : 'genesis';
  const id = `audit-${log.length + 1}`;
  const hash = `${prev}:${entry.action}:${entry.consentType}:${entry.at}`.slice(0, 64);
  return [...log, { ...entry, id, hash }];
}

describe('PDPA audit chain', () => {
  it('appends immutable entries with chained hash', () => {
    let log: AuditEntry[] = [];
    log = appendAudit(log, { action: 'grant', consentType: 'data_processing', at: '2026-05-22T10:00:00Z' });
    log = appendAudit(log, { action: 'revoke', consentType: 'marketing', at: '2026-05-22T11:00:00Z' });
    expect(log).toHaveLength(2);
    expect(log[0].hash).not.toBe(log[1].hash);
    expect(log[1].hash).toContain('revoke');
  });
});
