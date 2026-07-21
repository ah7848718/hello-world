CREATE TABLE IF NOT EXISTS public.active_sessions (
  user_id UUID NOT NULL PRIMARY KEY,
  session_id TEXT NOT NULL,
  device_label TEXT,
  user_agent TEXT,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own active session"
ON public.active_sessions
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins view all active sessions"
ON public.active_sessions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER active_sessions_touch_updated_at
BEFORE UPDATE ON public.active_sessions
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.active_sessions;
ALTER TABLE public.active_sessions REPLICA IDENTITY FULL;