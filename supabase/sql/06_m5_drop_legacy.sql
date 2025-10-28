-- M5: Drop legacy tables and delete unused storage bucket
-- Safe to run multiple times.

-- Drop tables if they exist
DROP TABLE IF EXISTS public.documents CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Attempt to delete an unused bucket 'chart' if it exists
-- storage.delete_bucket returns an error if bucket doesn't exist; swallow errors safely
DO $$
BEGIN
  PERFORM storage.delete_bucket('chart');
EXCEPTION WHEN others THEN
  -- ignore any errors (e.g., bucket missing)
  NULL;
END$$;
