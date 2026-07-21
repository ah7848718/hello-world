CREATE POLICY "Students view options of completed attempts"
ON public.question_options FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.questions q
    JOIN public.exam_attempts a ON a.exam_id = q.exam_id
    WHERE q.id = question_options.question_id
      AND a.student_id = auth.uid()
      AND a.status IN ('submitted', 'graded')
      AND public.exam_answers_unlocked(q.exam_id)
  )
);