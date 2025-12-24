-- M6: RLS & Index Review (idempotent)

-- Ensure RLS is enabled
alter table if exists public.allowlist       enable row level security;
alter table if exists public.quizzes         enable row level security;
alter table if exists public.quiz_attempts   enable row level security;
alter table if exists public.candidates      enable row level security;

-- Policies (drop/create to guarantee shape)
-- QUIZZES read policy
DROP POLICY IF EXISTS quizzes_read_all ON public.quizzes;
CREATE POLICY quizzes_read_all ON public.quizzes
  FOR SELECT TO authenticated
  USING (true);

-- QUIZ_ATTEMPTS select own
DROP POLICY IF EXISTS quiz_attempts_select_own ON public.quiz_attempts;
CREATE POLICY quiz_attempts_select_own ON public.quiz_attempts
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- QUIZ_ATTEMPTS insert guard
DROP POLICY IF EXISTS quiz_attempts_insert_guard ON public.quiz_attempts;
CREATE POLICY quiz_attempts_insert_guard ON public.quiz_attempts
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND public.has_active_allowlist_entry((auth.jwt() ->> 'email'), quiz_attempts.quiz_id)
  );

-- QUIZ_ATTEMPTS update own
DROP POLICY IF EXISTS quiz_attempts_update_own ON public.quiz_attempts;
DROP POLICY IF EXISTS quiz_attempts_update_own_limited ON public.quiz_attempts;
-- Only allow owners to update their attempt while no PDF metadata exists.
-- This prevents end-users from setting/modifying pdf_path/pdf_created_at; service role bypasses RLS.
CREATE POLICY quiz_attempts_update_own_limited ON public.quiz_attempts
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND pdf_path IS NULL
    AND pdf_created_at IS NULL
  );

-- Helpful indices
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_quiz ON public.quiz_attempts(user_id, quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_finished_at ON public.quiz_attempts(finished_at);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_pdf_created_at ON public.quiz_attempts(pdf_created_at);
