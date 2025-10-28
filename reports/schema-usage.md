# Schema Usage Inventory

This report summarizes where legacy entities were referenced before the lean schema refactor.

## Findings

- profiles
  - Only defined in SQL files. No runtime code paths depend on `public.profiles`.
  - Files:
    - `apps/quiz-interface/supabase/sql/01_schema.sql` (removed in lean base schema)
    - `apps/quiz-interface/supabase/sql/02_policies.sql` (skeleton and policies removed)

- documents
  - Previously used by `app/api/quiz/finish/route.ts` to insert a row after uploading a PDF.
  - Signed URL API `app/api/documents/signed-url/route.ts` used the `documents` table for ownership and path.
  - Both refactored to use `quiz_attempts.pdf_path` and `quiz_attempts.pdf_created_at`.

- storage bucket: chart
  - No references in code. Not created in storage migrations. Dropped safely in `06_m5_drop_legacy.sql` if present.

- storage bucket: quiz-docs
  - In use. Created in `03_storage.sql`.
  - Used by:
    - `apps/quiz-interface/app/api/quiz/finish/route.ts` (upload PDF)
    - `apps/quiz-interface/app/api/documents/signed-url/route.ts` (sign attempt PDF)

## Backup Guidance (pre-drop)

- Export `public.profiles` and `public.documents` via Supabase SQL/Studio:
  - Profiles: SELECT * FROM public.profiles
  - Documents: SELECT * FROM public.documents
- Save as CSV/JSON into `apps/quiz-interface/backups/`.

## Post-Refactor State

- Retained tables: `public.allowlist`, `public.quizzes`, `public.quiz_attempts`, `public.candidates`.
- Consolidated: PDF metadata stored on `public.quiz_attempts (pdf_path, pdf_created_at)`.
- Dropped: `public.profiles`, `public.documents` (see rollback script to restore if needed).
