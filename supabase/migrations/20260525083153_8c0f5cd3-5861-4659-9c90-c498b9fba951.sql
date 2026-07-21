
-- 1) Remove coupon code enumeration by students. Validation already runs server-side.
DROP POLICY IF EXISTS "Approved students view active coupons" ON public.coupons;

-- 2) Tighten anon Q&A submissions: replace WITH CHECK (true) with meaningful guards.
DROP POLICY IF EXISTS "Anyone can submit questions" ON public.qna_questions;
CREATE POLICY "Public can submit guest questions"
ON public.qna_questions
FOR INSERT
TO anon, authenticated
WITH CHECK (
  -- Anonymous/guest submissions only via this policy (auth users use the authenticated policy)
  student_id IS NULL
  AND is_public = true
  AND char_length(coalesce(title, '')) BETWEEN 1 AND 200
  AND char_length(coalesce(body,  '')) <= 2000
  AND char_length(coalesce(guest_name, '')) <= 80
);

-- 3) Tighten qna-media uploads: scope path under public/ and add basic guards.
DROP POLICY IF EXISTS "Anyone can upload to qna-media" ON storage.objects;
CREATE POLICY "Public can upload qna-media to public folder"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'qna-media'
  AND (storage.foldername(name))[1] = 'public'
  AND char_length(name) <= 300
);
