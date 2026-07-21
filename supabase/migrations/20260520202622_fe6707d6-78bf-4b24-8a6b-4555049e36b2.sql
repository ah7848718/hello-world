
-- 1) Sanitized student view of homework_options (no is_correct)
DROP POLICY IF EXISTS "Enrolled students view hw options" ON public.homework_options;

-- Admin policy already exists; ensure no anon/auth direct read by default

CREATE OR REPLACE VIEW public.student_homework_options
WITH (security_invoker = true) AS
SELECT id, question_id, text, order_index
FROM public.homework_options ho
WHERE EXISTS (
  SELECT 1 FROM public.homework_questions q
  JOIN public.homework h ON h.id = q.homework_id
  WHERE q.id = ho.question_id
    AND h.is_published = true
    AND public.is_enrolled(auth.uid(), h.course_id)
);

GRANT SELECT ON public.student_homework_options TO authenticated;

-- After submission, allow students to see is_correct on raw table (for review)
CREATE POLICY "Students view hw options after submission"
ON public.homework_options FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.homework_questions q
    JOIN public.homework_submissions s ON s.homework_id = q.homework_id
    WHERE q.id = homework_options.question_id
      AND s.student_id = auth.uid()
      AND s.status IN ('submitted', 'graded')
  )
);

-- 2) Realtime channel authorization — scope active_sessions topics to owner only
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users subscribe to own active_sessions channel only"
ON realtime.messages FOR SELECT TO authenticated
USING (
  CASE
    WHEN realtime.topic() LIKE 'active_sessions:%'
      THEN realtime.topic() = 'active_sessions:' || auth.uid()::text
    ELSE true
  END
);

CREATE POLICY "Users broadcast to own active_sessions channel only"
ON realtime.messages FOR INSERT TO authenticated
WITH CHECK (
  CASE
    WHEN realtime.topic() LIKE 'active_sessions:%'
      THEN realtime.topic() = 'active_sessions:' || auth.uid()::text
    ELSE true
  END
);

-- 3) Admin audit log for sensitive operations
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action text NOT NULL,
  target_user_id uuid,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read audit log"
ON public.admin_audit_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only service role inserts (via server functions)
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created ON public.admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin ON public.admin_audit_log(admin_id, created_at DESC);
