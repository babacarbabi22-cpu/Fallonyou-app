-- Work status on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS work_status text;

-- Work opportunity fields on events
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_opportunity boolean DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS opportunity_type text;
