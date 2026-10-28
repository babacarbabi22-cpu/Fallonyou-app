-- Existing and new members keep their age private until explicitly opted in.
-- Stored ages and the independent adulthood confirmation are not changed.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS show_age boolean NOT NULL DEFAULT false;