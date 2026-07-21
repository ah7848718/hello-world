-- Helper: validate exam-media path access for students
CREATE OR REPLACE FUNCTION public.can_read_exam_media_path(_uid uuid, _path text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_parts text[];
  v_qid uuid;
  v_exam uuid;
BEGIN
  IF _path IS NULL THEN RETURN false; END IF;
  v_parts := string_to_array(_path, '/');
  -- Question media: questions/{question_id}/...
  IF v_parts[1] = 'questions' AND COALESCE(array_length(v_parts, 1), 0) >= 2 THEN
    BEGIN
      v_qid := v_parts[2]::uuid;
    EXCEPTION WHEN OTHERS THEN RETURN false;
    END;
    SELECT exam_id INTO v_exam FROM public.questions WHERE id = v_qid;
    RETURN v_exam IS NOT NULL AND public.can_access_exam(_uid, v_exam);
  END IF;
  -- Own folder (student answers): {user_id}/...
  RETURN v_parts[1] = _uid::text;
END;
$$;

-- =========== exam-media ===========
DROP POLICY IF EXISTS "Students read exam-media" ON storage.objects;
DROP POLICY IF EXISTS "Students read own exam-media" ON storage.objects;

CREATE POLICY "Students read exam-media (scoped)" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'exam-media' AND public.can_read_exam_media_path(auth.uid(), name));

-- =========== lecture-pdfs ===========
DROP POLICY IF EXISTS "lecture-pdfs approved read" ON storage.objects;

CREATE POLICY "lecture-pdfs enrolled read" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'lecture-pdfs'
  AND EXISTS (
    SELECT 1 FROM public.chapters ch
    JOIN public.units u ON u.id = ch.unit_id
    WHERE ch.id::text = (storage.foldername(name))[1]
      AND public.is_enrolled(auth.uid(), u.course_id)
  )
);

-- =========== books bucket ===========
DROP POLICY IF EXISTS "Approved students read books bucket" ON storage.objects;

CREATE POLICY "Students read book covers" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'books'
  AND (storage.foldername(name))[1] = 'covers'
  AND public.is_approved_student(auth.uid())
);

CREATE POLICY "Students read purchased book pdfs" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'books'
  AND (storage.foldername(name))[1] = 'pdfs'
  AND EXISTS (
    SELECT 1
    FROM public.book_orders bo
    JOIN public.books b ON b.id = bo.book_id
    WHERE bo.student_id = auth.uid()
      AND bo.status IN ('approved', 'shipped')
      AND b.pdf_url = storage.objects.name
  )
);