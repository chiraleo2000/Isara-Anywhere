-- Migration: add google_sub column to users for Google SSO account linking
-- Idempotent; safe to re-run.
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_google_sub_unique'
  ) THEN
    -- Partial unique index so NULLs don't collide
    CREATE UNIQUE INDEX idx_users_google_sub_unique
      ON users (google_sub)
      WHERE google_sub IS NOT NULL;
  END IF;
END $$;

COMMENT ON COLUMN users.google_sub IS 'Google OAuth subject (sub claim) for SSO account linking';
