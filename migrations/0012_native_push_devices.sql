CREATE TABLE IF NOT EXISTS native_push_devices (
  id serial PRIMARY KEY,
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform text NOT NULL,
  token text NOT NULL,
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS native_push_device_token_unique ON native_push_devices(platform, token);
CREATE INDEX IF NOT EXISTS native_push_devices_user_idx ON native_push_devices(user_id);
