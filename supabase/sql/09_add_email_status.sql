-- Add email_status column to track PDF delivery status
-- Values: 'pending' (not sent), 'sent' (successfully emailed), 'failed' (email failed)

ALTER TABLE public.quiz_attempts
ADD COLUMN IF NOT EXISTS email_status text DEFAULT 'pending' CHECK (email_status IN ('pending', 'sent', 'failed'));

-- Index for filtering by email status
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_email_status ON public.quiz_attempts(email_status);

-- Add email_error column to store error details
ALTER TABLE public.quiz_attempts
ADD COLUMN IF NOT EXISTS email_error text;
