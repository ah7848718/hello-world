
-- Allow public (guest) submissions to Q&A
ALTER TABLE public.qna_questions ALTER COLUMN student_id DROP NOT NULL;
ALTER TABLE public.qna_questions ADD COLUMN IF NOT EXISTS guest_name TEXT;
ALTER TABLE public.qna_questions ADD COLUMN IF NOT EXISTS image_path TEXT;
ALTER TABLE public.qna_questions ADD COLUMN IF NOT EXISTS voice_path TEXT;

ALTER TABLE public.qna_replies ALTER COLUMN author_id DROP NOT NULL;
ALTER TABLE public.qna_replies ADD COLUMN IF NOT EXISTS image_path TEXT;
ALTER TABLE public.qna_replies ADD COLUMN IF NOT EXISTS voice_path TEXT;

-- Make sure RLS is enabled
ALTER TABLE public.qna_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qna_replies ENABLE ROW LEVEL SECURITY;

-- Public can submit questions (anonymous)
DROP POLICY IF EXISTS "Anyone can submit questions" ON public.qna_questions;
CREATE POLICY "Anyone can submit questions"
ON public.qna_questions FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Public can read answered & public questions
DROP POLICY IF EXISTS "Public can view answered public questions" ON public.qna_questions;
CREATE POLICY "Public can view answered public questions"
ON public.qna_questions FOR SELECT
TO anon, authenticated
USING (is_public = true AND status = 'answered');

-- Public can read admin replies on those questions
DROP POLICY IF EXISTS "Public can view admin replies on public questions" ON public.qna_replies;
CREATE POLICY "Public can view admin replies on public questions"
ON public.qna_replies FOR SELECT
TO anon, authenticated
USING (
  is_admin_reply = true AND EXISTS (
    SELECT 1 FROM public.qna_questions q
    WHERE q.id = qna_replies.question_id
      AND q.is_public = true
      AND q.status = 'answered'
  )
);

-- Storage bucket for Q&A media (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('qna-media', 'qna-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public can read qna-media" ON storage.objects;
CREATE POLICY "Public can read qna-media"
ON storage.objects FOR SELECT
USING (bucket_id = 'qna-media');

DROP POLICY IF EXISTS "Anyone can upload to qna-media" ON storage.objects;
CREATE POLICY "Anyone can upload to qna-media"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'qna-media');

-- Default new public questions to is_public=true so they show after admin replies
ALTER TABLE public.qna_questions ALTER COLUMN is_public SET DEFAULT true;
