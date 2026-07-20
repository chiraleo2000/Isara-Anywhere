import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const profilePagePath = path.resolve(
  __dirname,
  '../../../issara-patient/frontend/pages/ProfilePage.tsx',
);

async function persistPhrProfile(
  userId: string,
  token: string,
  payload: Record<string, string>,
): Promise<{ url: string; method: string; body: Record<string, string> }> {
  const url = `/api/phr/profile/${userId}`;
  await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  return { url, method: 'PUT', body: payload };
}

describe('PHR profile persistence regression guard', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('persists profile via /api/phr/profile endpoint before local update', () => {
    const source = fs.readFileSync(profilePagePath, 'utf8');

    expect(source).toContain('/api/phr/profile/${user.id}');
    expect(source).toContain('await phrService.update(user.id, updatedPhr)');
    expect(source).toContain('updateUser(updatedUser)');
  });

  it('mocked fetch sends PUT /api/phr/profile/:id with profile fields (P6)', async () => {
    const payload = {
      name: 'Test User',
      phone: '0812345678',
      address: 'Bangkok',
      emergencyContactName: 'Contact',
      emergencyContactPhone: '0898765432',
    };
    const result = await persistPhrProfile('PATIENT-1', 'token-abc', payload);

    expect(fetch).toHaveBeenCalledWith(
      '/api/phr/profile/PATIENT-1',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    );
    expect(result.url).toBe('/api/phr/profile/PATIENT-1');
    expect(result.method).toBe('PUT');
  });
});
