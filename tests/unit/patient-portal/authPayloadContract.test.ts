import { describe, it, expect } from 'vitest';

describe('patient auth payload contract', () => {
  it('login body requires email and password keys', () => {
    const body = { email: 'patient@example.com', password: 'secret' };
    expect(Object.keys(body).sort()).toEqual(['email', 'password']);
  });

  it('register body includes required profile fields', () => {
    const body = {
      email: 'new@example.com',
      password: 'Secret1!',
      firstName: 'Test',
      lastName: 'User',
    };
    expect(body).toHaveProperty('email');
    expect(body).toHaveProperty('password');
    expect(body.firstName.length).toBeGreaterThan(0);
  });
});
