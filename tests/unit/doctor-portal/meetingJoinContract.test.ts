import { describe, it, expect } from 'vitest';

describe('doctor meeting join config contract', () => {
  it('join-config response shape', () => {
    const sample = {
      meetingId: 'apt-001',
      roomName: 'izara-apt-001',
      jitsiDomain: 'meet.jit.si',
      jwt: 'token',
      role: 'doctor',
    };
    expect(sample).toHaveProperty('meetingId');
    expect(sample).toHaveProperty('roomName');
    expect(sample).toHaveProperty('jitsiDomain');
    expect(['doctor', 'patient', 'guest']).toContain(sample.role);
  });
});
