-- User settings + security features

-- Users: profile + security flags
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS avatar_style TEXT NOT NULL DEFAULT 'pixel-art',
  ADD COLUMN IF NOT EXISTS avatar_seed TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Email change verification (new email ownership proof)
CREATE TABLE IF NOT EXISTS email_change_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  new_email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_email_change_codes_user_id ON email_change_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_email_change_codes_new_email ON email_change_codes(new_email);

-- Two-factor login challenges
CREATE TABLE IF NOT EXISTS login_2fa_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_login_2fa_codes_user_id ON login_2fa_codes(user_id);
