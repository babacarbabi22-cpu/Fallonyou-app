CREATE TABLE IF NOT EXISTS uploaded_media (
  path text PRIMARY KEY,
  owner_id varchar NOT NULL,
  available_at timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS media_deletion_jobs (
  id serial PRIMARY KEY,
  owner_id varchar NOT NULL,
  path text NOT NULL,
  status varchar NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamp NOT NULL DEFAULT now(),
  lease_until timestamp,
  lease_token varchar,
  error_code varchar,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS media_deletion_owner_path
  ON media_deletion_jobs(owner_id, path);
CREATE INDEX IF NOT EXISTS media_deletion_due
  ON media_deletion_jobs(status, next_attempt_at);