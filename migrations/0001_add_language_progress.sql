-- Add language level columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS lang_level text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS primary_lang varchar(10);

-- Create language_progress table
CREATE TABLE IF NOT EXISTS language_progress (
  id serial PRIMARY KEY,
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  language varchar(10) NOT NULL,
  level varchar(20) NOT NULL,
  lesson_id varchar(50) NOT NULL,
  completed_at timestamp DEFAULT now()
);

-- Unique index: one completion record per user+language+lesson
CREATE UNIQUE INDEX IF NOT EXISTS lang_progress_unique_idx
  ON language_progress (user_id, language, lesson_id);
