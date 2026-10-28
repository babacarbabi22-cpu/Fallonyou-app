BEGIN;

UPDATE profiles
SET aviation_role = NULL
WHERE aviation_opt_in = false;

UPDATE profiles
SET aviation_opt_in = false
WHERE aviation_opt_in = true
  AND aviation_role IS NULL;

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_aviation_role_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_aviation_role_check
  CHECK (
    (aviation_opt_in = false AND aviation_role IS NULL)
    OR
    (
      aviation_opt_in = true
      AND aviation_role IN (
        'cabin_crew',
        'pilot',
        'airport_staff',
        'dispatcher',
        'maintenance',
        'other'
      )
    )
  );

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'layovers'
      AND column_name = 'starts_at'
      AND data_type = 'timestamp without time zone'
  ) THEN
    ALTER TABLE layovers
      ALTER COLUMN starts_at TYPE timestamptz
      USING starts_at AT TIME ZONE 'UTC';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'layovers'
      AND column_name = 'ends_at'
      AND data_type = 'timestamp without time zone'
  ) THEN
    ALTER TABLE layovers
      ALTER COLUMN ends_at TYPE timestamptz
      USING ends_at AT TIME ZONE 'UTC';
  END IF;
END
$$;

DELETE FROM layovers
WHERE ends_at < now();

COMMIT;