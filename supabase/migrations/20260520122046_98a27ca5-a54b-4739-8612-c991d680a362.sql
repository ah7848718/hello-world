
-- Platform Settings (key/value)
CREATE TABLE public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_public BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage settings" ON public.platform_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone reads public settings" ON public.platform_settings
  FOR SELECT TO authenticated, anon
  USING (is_public = true);

-- Notifications
CREATE TYPE public.notification_audience AS ENUM ('all', 'student', 'course');
CREATE TYPE public.notification_type AS ENUM ('info', 'success', 'warning', 'course', 'exam', 'payment');

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT,
  type public.notification_type NOT NULL DEFAULT 'info',
  link TEXT,
  audience public.notification_audience NOT NULL DEFAULT 'all',
  target_student_id UUID,
  target_course_id UUID,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

CREATE POLICY "Admins manage notifications" ON public.notifications
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Students view their notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (
    public.is_approved_student(auth.uid()) AND (
      audience = 'all'
      OR (audience = 'student' AND target_student_id = auth.uid())
      OR (audience = 'course' AND public.is_enrolled(auth.uid(), target_course_id))
    )
  );

-- Notification reads
CREATE TABLE public.notification_reads (
  notification_id UUID NOT NULL,
  user_id UUID NOT NULL,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (notification_id, user_id)
);
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own reads" ON public.notification_reads
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins view all reads" ON public.notification_reads
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
