-- Fail private for both legacy stories and uploads that omit their audience.
ALTER TABLE stories ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'connections';