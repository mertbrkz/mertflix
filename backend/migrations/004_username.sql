-- Add optional username for display purposes

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS username TEXT;

-- Unique among non-null values
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_unique ON users (username);
