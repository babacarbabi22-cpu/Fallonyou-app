ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS aviation_opt_in boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS aviation_role text;
UPDATE profiles SET aviation_role = NULL WHERE aviation_opt_in = false;
UPDATE profiles SET aviation_opt_in = false WHERE aviation_opt_in = true AND aviation_role IS NULL;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_aviation_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_aviation_role_check
  CHECK (
    (aviation_opt_in = false AND aviation_role IS NULL)
    OR
    (aviation_opt_in = true AND aviation_role IN ('cabin_crew', 'pilot', 'airport_staff', 'dispatcher', 'maintenance', 'other'))
  );

CREATE TABLE IF NOT EXISTS layovers (
  id serial PRIMARY KEY,
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  city text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  activity_type text NOT NULL CHECK (activity_type IN ('coffee', 'meal', 'sightseeing', 'workout', 'shopping', 'nightlife', 'rest', 'other')),
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS layovers_active_idx ON layovers (starts_at, ends_at);
CREATE INDEX IF NOT EXISTS layovers_user_starts_idx ON layovers (user_id, starts_at);
CREATE INDEX IF NOT EXISTS layovers_city_starts_idx ON layovers (city, starts_at);