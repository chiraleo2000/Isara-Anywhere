-- ============================================================================
-- Seed SSO test users for Playwright Group N (Google SSO) tests.
-- All passwords use bcrypt hash of "TestPass123!" (cost 10).
-- Idempotent: ON CONFLICT updates the row.
-- ============================================================================

-- Active patient with password set (SSO success path)
INSERT INTO users (id, patient_id, email, password_hash, name, role,
                   is_active, is_approved, is_verified, approval_status,
                   created_at, updated_at)
VALUES ('PATIENT-SSO-EXISTING', 'PATIENT-SSO-EXISTING',
        'existing-patient@izara.test',
        '$2b$10$XQH/sLpUg3D9wT/Bm4VYJOpHIuOzfLrxvJqUq6Y9eU0qZJG6KQ.4S',
        'Existing Patient', 'patient',
        true, true, true, 'approved', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  password_hash = EXCLUDED.password_hash,
  is_active = true,
  approval_status = 'approved',
  updated_at = NOW();

-- Approved doctor with password set (SSO success path)
INSERT INTO users (id, doctor_id, email, password_hash, name, role,
                   is_active, is_approved, is_verified, approval_status,
                   medical_license_number, specialty,
                   created_at, updated_at)
VALUES ('DOC-SSO-APPROVED', 'DOC-SSO-APPROVED',
        'approved-doctor@izara.test',
        '$2b$10$XQH/sLpUg3D9wT/Bm4VYJOpHIuOzfLrxvJqUq6Y9eU0qZJG6KQ.4S',
        'Approved Doctor', 'doctor',
        true, true, true, 'approved',
        'TEST-LIC-001', 'General Practice', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email, password_hash = EXCLUDED.password_hash,
  is_active = true, is_approved = true, approval_status = 'approved',
  updated_at = NOW();

-- Pending doctor (SSO → 403 pending_approval)
INSERT INTO users (id, doctor_id, email, password_hash, name, role,
                   is_active, is_approved, is_verified, approval_status,
                   medical_license_number, specialty,
                   created_at, updated_at)
VALUES ('DOC-SSO-PENDING', 'DOC-SSO-PENDING',
        'pending-doctor@izara.test',
        '$2b$10$XQH/sLpUg3D9wT/Bm4VYJOpHIuOzfLrxvJqUq6Y9eU0qZJG6KQ.4S',
        'Pending Doctor', 'doctor',
        true, false, true, 'pending',
        'TEST-LIC-002', 'General Practice', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email, password_hash = EXCLUDED.password_hash,
  is_active = true, is_approved = false, approval_status = 'pending',
  updated_at = NOW();

-- Rejected doctor (SSO → 403 account_rejected)
INSERT INTO users (id, doctor_id, email, password_hash, name, role,
                   is_active, is_approved, is_verified, approval_status,
                   medical_license_number, specialty,
                   created_at, updated_at)
VALUES ('DOC-SSO-REJECTED', 'DOC-SSO-REJECTED',
        'rejected-doctor@izara.test',
        '$2b$10$XQH/sLpUg3D9wT/Bm4VYJOpHIuOzfLrxvJqUq6Y9eU0qZJG6KQ.4S',
        'Rejected Doctor', 'doctor',
        false, false, true, 'rejected',
        'TEST-LIC-003', 'General Practice', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email, password_hash = EXCLUDED.password_hash,
  is_active = false, approval_status = 'rejected', updated_at = NOW();

-- Patient with `!google-sso!` placeholder password (SSO → 403 password_not_set)
INSERT INTO users (id, patient_id, email, password_hash, name, role,
                   is_active, is_approved, is_verified, approval_status,
                   created_at, updated_at)
VALUES ('PATIENT-SSO-STUB', 'PATIENT-SSO-STUB',
        'google-only-stub@izara.test',
        '!google-sso!',
        'Stub Patient', 'patient',
        true, true, true, 'approved', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email, password_hash = '!google-sso!',
  is_active = true, approval_status = 'approved', updated_at = NOW();

-- Cleanup: remove any orphan `!google-sso!` stub rows from older auto-provision
-- iterations (but keep the explicit stub above).
DELETE FROM users
WHERE password_hash = '!google-sso!'
  AND id NOT IN ('PATIENT-SSO-STUB')
  AND created_at < NOW() - INTERVAL '1 hour';
