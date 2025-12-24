-- Migration: Add PDF processing status columns for robust locking
-- This replaces the fragile finished_at-based lock with a proper state machine

-- Add pdf_status column with state machine values
ALTER TABLE public.quiz_attempts
ADD COLUMN IF NOT EXISTS pdf_status text DEFAULT 'pending' 
  CHECK (pdf_status IN ('pending', 'processing', 'done', 'failed'));

-- Add processing metadata columns
ALTER TABLE public.quiz_attempts
ADD COLUMN IF NOT EXISTS processing_started_at timestamptz;

ALTER TABLE public.quiz_attempts
ADD COLUMN IF NOT EXISTS processing_token text;

ALTER TABLE public.quiz_attempts
ADD COLUMN IF NOT EXISTS pdf_error text;

-- Index for efficient claim queries (find stale locks)
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_pdf_status 
  ON public.quiz_attempts(pdf_status);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_processing_started_at 
  ON public.quiz_attempts(processing_started_at) 
  WHERE pdf_status = 'processing';

-- Composite index for the claim query pattern
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_claim 
  ON public.quiz_attempts(id, pdf_status, processing_started_at);

COMMENT ON COLUMN public.quiz_attempts.pdf_status IS 
  'PDF generation state: pending (not started), processing (in progress), done (completed), failed (error)';

COMMENT ON COLUMN public.quiz_attempts.processing_started_at IS 
  'When PDF processing started. Used for TTL-based stale lock detection (3 min timeout)';

COMMENT ON COLUMN public.quiz_attempts.processing_token IS 
  'Unique token for the processing request. Ensures only the claimer can update status';

COMMENT ON COLUMN public.quiz_attempts.pdf_error IS 
  'Error message if PDF generation failed';

-- RPC function for atomic claim with TTL-based stale lock recovery
-- Returns { claimed: true } if lock acquired, { claimed: false } otherwise
CREATE OR REPLACE FUNCTION public.claim_pdf_processing(
  p_attempt_id uuid,
  p_processing_token text,
  p_stale_cutoff timestamptz
)
RETURNS TABLE(claimed boolean) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated_count int;
BEGIN
  -- Attempt to claim the lock
  -- Conditions: NULL/pending/failed status, OR processing but stale
  UPDATE quiz_attempts
  SET 
    pdf_status = 'processing',
    processing_started_at = now(),
    processing_token = p_processing_token
  WHERE id = p_attempt_id
    AND (
      pdf_status IS NULL
      OR pdf_status IN ('pending', 'failed')
      OR (pdf_status = 'processing' AND processing_started_at < p_stale_cutoff)
    );
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  RETURN QUERY SELECT (v_updated_count > 0);
END;
$$;

-- Grant execute to authenticated users (the API uses service role anyway)
GRANT EXECUTE ON FUNCTION public.claim_pdf_processing(uuid, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_pdf_processing(uuid, text, timestamptz) TO service_role;
