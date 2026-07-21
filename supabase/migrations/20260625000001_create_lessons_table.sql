CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  video_type TEXT NOT NULL DEFAULT 'upload',
  video_url TEXT,
  video_bunny_id TEXT,
  grade TEXT NOT NULL DEFAULT 'أولى ثانوي',
  is_published BOOLEAN NOT NULL DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read lessons" ON public.lessons
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can insert lessons" ON public.lessons
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update lessons" ON public.lessons
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can delete lessons" ON public.lessons
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Students can read published lessons
CREATE POLICY "Students can read published lessons" ON public.lessons
  FOR SELECT TO authenticated
  USING (is_published = true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.lessons;

INSERT INTO storage.buckets (id, name, public) VALUES ('lesson-media', 'lesson-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins can read lesson-media" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'lesson-media' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can insert lesson-media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'lesson-media' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update lesson-media" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'lesson-media' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can delete lesson-media" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'lesson-media' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Anyone can read lesson-media files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'lesson-media');
