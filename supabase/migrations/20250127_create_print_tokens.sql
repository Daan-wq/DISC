-- Create print_tokens table for one-time print access tokens
CREATE TABLE IF NOT EXISTS public.print_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token UUID NOT NULL UNIQUE,
  attempt_id UUID NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_print_tokens_token ON public.print_tokens(token);
CREATE INDEX IF NOT EXISTS idx_print_tokens_attempt_id ON public.print_tokens(attempt_id);
CREATE INDEX IF NOT EXISTS idx_print_tokens_user_id ON public.print_tokens(user_id);

-- Add RLS policies
ALTER TABLE public.print_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only see their own tokens
CREATE POLICY "Users can view own print tokens"
  ON public.print_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can do everything (for API endpoints)
CREATE POLICY "Service role has full access to print tokens"
  ON public.print_tokens
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Add comment
COMMENT ON TABLE public.print_tokens IS 'One-time tokens for secure client-side PDF generation via browser print';
