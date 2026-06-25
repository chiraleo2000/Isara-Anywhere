/**
 * Client-side password policy — mirrors backend OWASP policy in owasp-middleware.cjs
 */
const MIN_LENGTH = 12;

export function validateDoctorPassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!password || password.length < MIN_LENGTH) {
    errors.push(`Password must be at least ${MIN_LENGTH} characters`);
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return { valid: errors.length === 0, errors };
}

export const DOCTOR_PASSWORD_HINT =
  'Minimum 12 characters with uppercase, lowercase, number, and special character';
