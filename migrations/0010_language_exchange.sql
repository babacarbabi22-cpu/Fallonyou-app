-- Additive migration. Existing speakers are NOT enrolled as volunteer helpers.
CREATE TABLE IF NOT EXISTS language_helpers (
  user_id varchar PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  offered_languages text[] NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS language_exchange_requests (
  id serial PRIMARY KEY,
  from_user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  language varchar(10) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  match_id integer REFERENCES matches(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS language_exchange_pair_language_idx
  ON language_exchange_requests (from_user_id, to_user_id, language);
CREATE INDEX IF NOT EXISTS language_exchange_recipient_idx
  ON language_exchange_requests (to_user_id, status);
