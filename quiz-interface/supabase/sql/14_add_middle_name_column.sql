-- Migration: Add middle_name column to candidates table
-- Created: 2026-01-31

-- Add middle_name column (tussenvoegsel) to candidates
ALTER TABLE public.candidates 
ADD COLUMN IF NOT EXISTS middle_name TEXT;

-- Create function to enforce lowercase on middle_name
CREATE OR REPLACE FUNCTION public.enforce_lowercase_middle_name()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.middle_name IS NOT NULL THEN
    NEW.middle_name := LOWER(TRIM(NEW.middle_name));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trg_lowercase_middle_name ON public.candidates;

CREATE TRIGGER trg_lowercase_middle_name
BEFORE INSERT OR UPDATE ON public.candidates
FOR EACH ROW EXECUTE FUNCTION public.enforce_lowercase_middle_name();

COMMENT ON COLUMN public.candidates.middle_name IS 'Tussenvoegsel (e.g., van, de) - automatically converted to lowercase';
