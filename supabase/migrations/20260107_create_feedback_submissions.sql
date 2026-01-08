-- Create feedback_submissions table for post-quiz feedback
CREATE TABLE IF NOT EXISTS public.feedback_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL UNIQUE REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Raw responses for future-proofing
  responses JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Common fields for easy aggregation
  rating_user_friendly INT,
  rating_easy INT,
  rating_options_clear INT,
  rating_instructions_clear INT,
  rating_recognizable INT,
  delivery_preference TEXT,

  rating_honest_representation INT,
  rating_trust_result INT,
  rating_profile_recognizable INT,
  rating_profile_explanation_clear INT,
  rating_presentation_structure_clear INT,
  rating_post_receipt_clarity INT,
  rating_recommend_to_others INT,

  length_preference TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_submissions_attempt_id ON public.feedback_submissions(attempt_id);
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_user_id ON public.feedback_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_created_at ON public.feedback_submissions(created_at);

ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own feedback"
  ON public.feedback_submissions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role has full access to feedback_submissions"
  ON public.feedback_submissions
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');
