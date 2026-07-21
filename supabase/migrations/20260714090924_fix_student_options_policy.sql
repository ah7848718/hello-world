-- Allow students to see question options during an active (in_progress) attempt
-- The existing view student_question_options has security_invoker=true, so it
-- inherits the caller's RLS. This policy grants SELECT on the underlying table
-- for questions belonging to exams the student is currently attempting.
CREATE POLICY "Students view options of active exam attempts"
ON public.question_options FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.questions q
    JOIN public.exam_attempts a ON a.exam_id = q.exam_id
    WHERE q.id = question_options.question_id
      AND a.student_id = auth.uid()
      AND a.status = 'in_progress'
  )
);
