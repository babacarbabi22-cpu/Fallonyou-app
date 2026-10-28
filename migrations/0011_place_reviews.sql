-- Additive community reviews, independent from booking suppliers.
CREATE TABLE IF NOT EXISTS place_reviews (
  id serial PRIMARY KEY,
  author_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  place_key text NOT NULL,
  kind text NOT NULL,
  place_name text NOT NULL,
  city text NOT NULL,
  country text NOT NULL,
  rating integer NOT NULL,
  review text NOT NULL,
  recommendation text NOT NULL DEFAULT '',
  hidden boolean NOT NULL DEFAULT false,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS place_reviews_author_place ON place_reviews(author_id, place_key);
CREATE INDEX IF NOT EXISTS place_reviews_place ON place_reviews(place_key);
CREATE INDEX IF NOT EXISTS place_reviews_feed ON place_reviews(hidden, id);
CREATE TABLE IF NOT EXISTS place_review_reports (
  id serial PRIMARY KEY,
  review_id integer NOT NULL REFERENCES place_reviews(id) ON DELETE CASCADE,
  reporter_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  details text NOT NULL DEFAULT '',
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS place_reviews_one_report ON place_review_reports(review_id, reporter_id);
CREATE INDEX IF NOT EXISTS place_review_reports_pending ON place_review_reports(resolved, id);
