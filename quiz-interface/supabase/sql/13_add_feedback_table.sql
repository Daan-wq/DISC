-- Migration: Add feedback table for post-questionnaire feedback
-- Created: 2026-01-31

-- Feedback table for storing user feedback after completing the DISC questionnaire
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attempt_id UUID REFERENCES public.quiz_attempts(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  
  -- Question 1: How personal was the invitation email? (1-10)
  q1_personal_email INTEGER CHECK (q1_personal_email >= 1 AND q1_personal_email <= 10),
  
  -- Question 2: How clear were the instructions? (1-10)
  q2_clear_instructions INTEGER CHECK (q2_clear_instructions >= 1 AND q2_clear_instructions <= 10),
  
  -- Question 3: How pleasant was filling out the questionnaire? (1-10)
  q3_pleasant_experience INTEGER CHECK (q3_pleasant_experience >= 1 AND q3_pleasant_experience <= 10),
  
  -- Question 4: How much did you recognize yourself? (1-10)
  q4_self_recognition INTEGER CHECK (q4_self_recognition >= 1 AND q4_self_recognition <= 10),
  
  -- Question 5: How much do you need more explanation? (1-10)
  q5_need_explanation INTEGER CHECK (q5_need_explanation >= 1 AND q5_need_explanation <= 10),
  
  -- Question 6: Comments and tips (open text)
  q6_comments TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_feedback_user ON public.feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON public.feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_attempt ON public.feedback(attempt_id);

-- RLS policies for feedback table
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Users can insert their own feedback
CREATE POLICY feedback_insert_own ON public.feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own feedback
CREATE POLICY feedback_select_own ON public.feedback
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role can do everything (for admin access)
CREATE POLICY feedback_service_all ON public.feedback
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.feedback IS 'Stores feedback from users after completing the DISC questionnaire';
COMMENT ON COLUMN public.feedback.q1_personal_email IS 'Hoe persoonlijk vond je de mail waarin je werd uitgenodigd? (1-10)';
COMMENT ON COLUMN public.feedback.q2_clear_instructions IS 'Hoe duidelijk vond je de instructies voorafgaand aan de vragenlijst? (1-10)';
COMMENT ON COLUMN public.feedback.q3_pleasant_experience IS 'Hoe prettig vond je het om de vragenlijst in te vullen? (1-10)';
COMMENT ON COLUMN public.feedback.q4_self_recognition IS 'In welke mate herkende je jezelf in de uitkomsten? (1-10)';
COMMENT ON COLUMN public.feedback.q5_need_explanation IS 'In hoeverre heb je behoefte aan meer uitleg? (1-10)';
COMMENT ON COLUMN public.feedback.q6_comments IS 'Welke opmerkingen en/of tips heb je voor ons?';
