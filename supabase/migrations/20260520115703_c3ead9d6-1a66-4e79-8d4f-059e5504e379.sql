
-- ============ ENUMS ============
CREATE TYPE public.video_provider AS ENUM ('bunny', 'vdocipher', 'youtube');
CREATE TYPE public.payment_method AS ENUM ('vcash', 'instapay');
CREATE TYPE public.payment_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.enrollment_status AS ENUM ('active', 'expired', 'cancelled');

-- ============ COURSES ============
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  cover_url TEXT,
  grade TEXT,
  term TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_percent INTEGER NOT NULL DEFAULT 0 CHECK (discount_percent BETWEEN 0 AND 100),
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.lectures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  video_provider public.video_provider,
  video_id TEXT,
  video_url TEXT,
  duration_seconds INTEGER,
  pdf_url TEXT,
  is_free BOOLEAN NOT NULL DEFAULT false,
  unlock_score_percent INTEGER NOT NULL DEFAULT 0 CHECK (unlock_score_percent BETWEEN 0 AND 100),
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ ENROLLMENTS ============
CREATE TABLE public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  status public.enrollment_status NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, course_id)
);

-- ============ COUPONS ============
CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_percent INTEGER NOT NULL CHECK (discount_percent BETWEEN 1 AND 100),
  max_uses INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.coupon_courses (
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  PRIMARY KEY (coupon_id, course_id)
);

-- ============ PAYMENTS ============
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE RESTRICT,
  amount NUMERIC(10,2) NOT NULL,
  method public.payment_method NOT NULL,
  receipt_url TEXT,
  transaction_ref TEXT,
  coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
  discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  status public.payment_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ LECTURE PROGRESS ============
CREATE TABLE public.lecture_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  lecture_id UUID NOT NULL REFERENCES public.lectures(id) ON DELETE CASCADE,
  watched_seconds INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  last_watched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, lecture_id)
);

-- ============ INDEXES ============
CREATE INDEX idx_units_course ON public.units(course_id, order_index);
CREATE INDEX idx_chapters_unit ON public.chapters(unit_id, order_index);
CREATE INDEX idx_lectures_chapter ON public.lectures(chapter_id, order_index);
CREATE INDEX idx_enrollments_student ON public.enrollments(student_id);
CREATE INDEX idx_payments_student ON public.payments(student_id, created_at DESC);
CREATE INDEX idx_payments_status ON public.payments(status, created_at DESC);
CREATE INDEX idx_progress_student ON public.lecture_progress(student_id);

-- ============ TRIGGERS ============
CREATE TRIGGER trg_courses_updated BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_lectures_updated BEFORE UPDATE ON public.lectures FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_payments_updated BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ HELPER FUNCTIONS ============
CREATE OR REPLACE FUNCTION public.is_enrolled(_user_id UUID, _course_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.enrollments
    WHERE student_id = _user_id AND course_id = _course_id AND status = 'active'
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;

CREATE OR REPLACE FUNCTION public.lecture_course(_lecture_id UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.course_id
  FROM public.lectures l
  JOIN public.chapters ch ON ch.id = l.chapter_id
  JOIN public.units c ON c.id = ch.unit_id
  WHERE l.id = _lecture_id
$$;

-- ============ ENABLE RLS ============
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lecture_progress ENABLE ROW LEVEL SECURITY;

-- ============ RLS POLICIES ============
-- Courses
CREATE POLICY "Admins manage courses" ON public.courses FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Approved students view published courses" ON public.courses FOR SELECT TO authenticated
  USING (is_published = true AND is_approved_student(auth.uid()));

-- Units / Chapters / Lectures (visible if parent course visible)
CREATE POLICY "Admins manage units" ON public.units FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Students view units of published courses" ON public.units FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = units.course_id AND c.is_published = true AND is_approved_student(auth.uid())));

CREATE POLICY "Admins manage chapters" ON public.chapters FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Students view chapters of published courses" ON public.chapters FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.units u JOIN public.courses c ON c.id = u.course_id
                 WHERE u.id = chapters.unit_id AND c.is_published = true AND is_approved_student(auth.uid())));

CREATE POLICY "Admins manage lectures" ON public.lectures FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Students view lectures of published courses" ON public.lectures FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.chapters ch JOIN public.units u ON u.id = ch.unit_id
                 JOIN public.courses c ON c.id = u.course_id
                 WHERE ch.id = lectures.chapter_id AND c.is_published = true AND is_approved_student(auth.uid())));

-- Enrollments
CREATE POLICY "Admins manage enrollments" ON public.enrollments FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Students view own enrollments" ON public.enrollments FOR SELECT TO authenticated
  USING (student_id = auth.uid());

-- Coupons
CREATE POLICY "Admins manage coupons" ON public.coupons FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Approved students view active coupons" ON public.coupons FOR SELECT TO authenticated
  USING (is_active = true AND is_approved_student(auth.uid()));

CREATE POLICY "Admins manage coupon_courses" ON public.coupon_courses FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Students view coupon_courses" ON public.coupon_courses FOR SELECT TO authenticated
  USING (is_approved_student(auth.uid()));

-- Payments
CREATE POLICY "Admins manage payments" ON public.payments FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Students view own payments" ON public.payments FOR SELECT TO authenticated
  USING (student_id = auth.uid());
CREATE POLICY "Students create own pending payments" ON public.payments FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid() AND status = 'pending' AND is_approved_student(auth.uid()));

-- Lecture progress
CREATE POLICY "Admins view all progress" ON public.lecture_progress FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Students manage own progress" ON public.lecture_progress FOR ALL TO authenticated
  USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

-- ============ STORAGE BUCKETS ============
INSERT INTO storage.buckets (id, name, public) VALUES ('course-covers', 'course-covers', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-receipts', 'payment-receipts', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('lecture-pdfs', 'lecture-pdfs', false) ON CONFLICT DO NOTHING;

-- course-covers: public read, admin write
CREATE POLICY "course-covers public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'course-covers');
CREATE POLICY "course-covers admin write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'course-covers' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "course-covers admin update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'course-covers' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "course-covers admin delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'course-covers' AND has_role(auth.uid(), 'admin'));

-- payment-receipts: student uploads to {userId}/, student reads own, admin reads all
CREATE POLICY "payment-receipts user upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "payment-receipts user read own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'payment-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "payment-receipts admin read all" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'payment-receipts' AND has_role(auth.uid(), 'admin'));

-- lecture-pdfs: admin write, approved students read
CREATE POLICY "lecture-pdfs admin write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'lecture-pdfs' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "lecture-pdfs admin update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'lecture-pdfs' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "lecture-pdfs admin delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'lecture-pdfs' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "lecture-pdfs approved read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'lecture-pdfs' AND is_approved_student(auth.uid()));
