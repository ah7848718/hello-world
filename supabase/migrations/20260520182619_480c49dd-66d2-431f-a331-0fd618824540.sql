
-- 1) Add month column to courses
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS month text;

-- 2) Bundles table
CREATE TABLE IF NOT EXISTS public.bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  cover_url text,
  grade text,
  bundle_type text NOT NULL DEFAULT 'term',
  term text,
  months text[],
  price numeric NOT NULL DEFAULT 0,
  discount_percent integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT false,
  order_index integer NOT NULL DEFAULT 0,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bundles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage bundles" ON public.bundles
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Students view published bundles" ON public.bundles
  FOR SELECT TO authenticated
  USING (is_published = true AND is_approved_student(auth.uid()));

CREATE TRIGGER bundles_touch_updated
  BEFORE UPDATE ON public.bundles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3) Bundle <-> Courses
CREATE TABLE IF NOT EXISTS public.bundle_courses (
  bundle_id uuid NOT NULL REFERENCES public.bundles(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  PRIMARY KEY (bundle_id, course_id)
);

ALTER TABLE public.bundle_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage bundle_courses" ON public.bundle_courses
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Students view bundle_courses" ON public.bundle_courses
  FOR SELECT TO authenticated
  USING (is_approved_student(auth.uid()));

-- 4) Payments: support bundle payments
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS bundle_id uuid;
ALTER TABLE public.payments ALTER COLUMN course_id DROP NOT NULL;
ALTER TABLE public.payments ADD CONSTRAINT payments_course_or_bundle
  CHECK (course_id IS NOT NULL OR bundle_id IS NOT NULL);

-- 5) Enrollments: track source bundle
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS bundle_id uuid;

-- 6) Homework & Exams: link to lecture (optional)
ALTER TABLE public.homework ADD COLUMN IF NOT EXISTS lecture_id uuid;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS lecture_id uuid;

CREATE INDEX IF NOT EXISTS idx_homework_lecture ON public.homework(lecture_id);
CREATE INDEX IF NOT EXISTS idx_exams_lecture ON public.exams(lecture_id);
CREATE INDEX IF NOT EXISTS idx_bundle_courses_course ON public.bundle_courses(course_id);
