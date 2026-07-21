-- ============ LOGIN HISTORY ============
CREATE TABLE public.login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('login', 'logout')),
  device_type TEXT,
  device_name TEXT,
  os TEXT,
  browser TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_login_history_user ON public.login_history(user_id, created_at DESC);

ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own login history"
ON public.login_history
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins view all login history"
ON public.login_history
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
