-- Create private storage bucket for quiz documents
-- Run this in Supabase SQL editor or via CLI after enabling the storage extension (enabled by default)
select storage.create_bucket('quiz-docs', public := false);

-- Optional: ensure no public policies exist for this bucket (access only via signed URLs or service role)
-- By default, storage.objects has RLS enabled and no policies for anonymous users.
-- You may add fine-grained policies later if building a public viewer.
