ALTER TABLE profiles ADD COLUMN IF NOT EXISTS personal_preferences_consent_at timestamp;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS personal_preferences_consent_version text;