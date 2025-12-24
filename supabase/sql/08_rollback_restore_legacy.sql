-- Rollback: Restore legacy tables and repopulate from quiz_attempts

-- 1) Recreate profiles table (schema as before)
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  locale text DEFAULT 'nl',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Recreate documents table
CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  attempt_id uuid REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Helpful index
CREATE INDEX IF NOT EXISTS idx_documents_user_quiz ON public.documents(user_id, quiz_id);

-- 3) Repopulate documents from quiz_attempts if missing
INSERT INTO public.documents (user_id, quiz_id, attempt_id, storage_path, created_at)
SELECT qa.user_id, qa.quiz_id, qa.id as attempt_id, qa.pdf_path as storage_path, COALESCE(qa.pdf_created_at, now())
FROM public.quiz_attempts qa
LEFT JOIN public.documents d ON d.attempt_id = qa.id
WHERE qa.pdf_path IS NOT NULL
  AND d.id IS NULL;

-- 4) Optionally recreate 'chart' bucket (if you really need it back)
DO $$
BEGIN
  PERFORM storage.create_bucket('chart', public := false);
EXCEPTION WHEN OTHERS THEN
  -- Ignore error if bucket already exists or storage extension differs
  NULL;
END$$;
