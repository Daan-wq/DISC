-- M3: Migrate public.documents.storage_path -> public.quiz_attempts.pdf_path (and created_at -> pdf_created_at)
-- Idempotent and safe to re-run.

do $$
begin
  -- Only run if documents table exists
  if to_regclass('public.documents') is not null then
    -- Update attempts with the latest document per attempt
    with latest_docs as (
      select distinct on (attempt_id)
        attempt_id,
        storage_path,
        created_at
      from public.documents
      where attempt_id is not null
      order by attempt_id, created_at desc
    )
    update public.quiz_attempts qa
       set pdf_path = ld.storage_path,
           pdf_created_at = coalesce(qa.pdf_created_at, ld.created_at)
      from latest_docs ld
     where qa.id = ld.attempt_id
       and (qa.pdf_path is null or qa.pdf_path <> ld.storage_path);
  end if;
end$$;

-- Validation helpers (run manually if desired):
-- select count(*) from public.documents;
-- select count(*) from public.quiz_attempts where pdf_path is not null;
