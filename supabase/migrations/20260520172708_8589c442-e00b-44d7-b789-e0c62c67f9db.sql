
CREATE TABLE public.site_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.site_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read active announcements"
  ON public.site_announcements FOR SELECT
  USING (is_active = true);

CREATE POLICY "admins can read all announcements"
  ON public.site_announcements FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins can insert announcements"
  ON public.site_announcements FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins can update announcements"
  ON public.site_announcements FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins can delete announcements"
  ON public.site_announcements FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_announcements_active ON public.site_announcements(is_active, created_at DESC);
