
-- Books bucket (public covers + signed pdfs handled by RLS)
INSERT INTO storage.buckets (id, name, public) VALUES ('books', 'books', false)
ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('homework-media', 'homework-media', false)
ON CONFLICT (id) DO NOTHING;

-- ============ BOOKS ============
CREATE TABLE IF NOT EXISTS public.books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  cover_url text,
  pdf_url text,
  price numeric NOT NULL DEFAULT 0,
  grade text,
  is_published boolean NOT NULL DEFAULT false,
  order_index integer NOT NULL DEFAULT 0,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage books" ON public.books FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Students view published books" ON public.books FOR SELECT TO authenticated
  USING (is_published = true AND public.is_approved_student(auth.uid()));

CREATE TRIGGER books_touch BEFORE UPDATE ON public.books
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ HOMEWORK ============
DO $$ BEGIN
  CREATE TYPE public.homework_status AS ENUM ('draft','submitted','graded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.hw_question_type AS ENUM ('mcq','true_false','short','essay');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.homework (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  due_at timestamptz,
  total_points numeric NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage homework" ON public.homework FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Enrolled students view homework" ON public.homework FOR SELECT TO authenticated
  USING (is_published = true AND public.is_enrolled(auth.uid(), course_id));

CREATE TRIGGER homework_touch BEFORE UPDATE ON public.homework
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.homework_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  homework_id uuid NOT NULL REFERENCES public.homework(id) ON DELETE CASCADE,
  type public.hw_question_type NOT NULL,
  text text NOT NULL,
  image_url text,
  points numeric NOT NULL DEFAULT 1,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.homework_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage hw questions" ON public.homework_questions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Enrolled students view hw questions" ON public.homework_questions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.homework h WHERE h.id = homework_id
    AND h.is_published = true AND public.is_enrolled(auth.uid(), h.course_id)));

CREATE TABLE IF NOT EXISTS public.homework_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.homework_questions(id) ON DELETE CASCADE,
  text text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  order_index integer NOT NULL DEFAULT 0
);
ALTER TABLE public.homework_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage hw options" ON public.homework_options FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Enrolled students view hw options" ON public.homework_options FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.homework_questions q
    JOIN public.homework h ON h.id = q.homework_id
    WHERE q.id = question_id AND h.is_published = true AND public.is_enrolled(auth.uid(), h.course_id)));

CREATE TABLE IF NOT EXISTS public.homework_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  homework_id uuid NOT NULL REFERENCES public.homework(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  status public.homework_status NOT NULL DEFAULT 'draft',
  submitted_at timestamptz,
  score numeric,
  max_score numeric,
  feedback text,
  graded_by uuid,
  graded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(homework_id, student_id)
);
ALTER TABLE public.homework_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage hw submissions" ON public.homework_submissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Students view own submissions" ON public.homework_submissions FOR SELECT TO authenticated
  USING (student_id = auth.uid());
CREATE POLICY "Students create own submissions" ON public.homework_submissions FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid() AND EXISTS (SELECT 1 FROM public.homework h
    WHERE h.id = homework_id AND h.is_published = true AND public.is_enrolled(auth.uid(), h.course_id)));
CREATE POLICY "Students update own drafts" ON public.homework_submissions FOR UPDATE TO authenticated
  USING (student_id = auth.uid() AND status = 'draft') WITH CHECK (student_id = auth.uid());

CREATE TRIGGER hw_subm_touch BEFORE UPDATE ON public.homework_submissions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.homework_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.homework_submissions(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.homework_questions(id) ON DELETE CASCADE,
  selected_option_id uuid,
  answer_text text,
  answer_image_url text,
  is_correct boolean,
  awarded_points numeric,
  graded_by uuid,
  graded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.homework_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage hw answers" ON public.homework_answers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Students view own answers" ON public.homework_answers FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.homework_submissions s
    WHERE s.id = submission_id AND s.student_id = auth.uid()));
CREATE POLICY "Students insert own answers" ON public.homework_answers FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.homework_submissions s
    WHERE s.id = submission_id AND s.student_id = auth.uid() AND s.status = 'draft'));
CREATE POLICY "Students update own answers" ON public.homework_answers FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.homework_submissions s
    WHERE s.id = submission_id AND s.student_id = auth.uid() AND s.status = 'draft'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.homework_submissions s
    WHERE s.id = submission_id AND s.student_id = auth.uid()));

-- ============ STORAGE POLICIES ============
-- books bucket
CREATE POLICY "Admins manage books bucket" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'books' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'books' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Approved students read books bucket" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'books' AND public.is_approved_student(auth.uid()));

-- homework-media bucket: admin all, students own folder
CREATE POLICY "Admins manage hw media" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'homework-media' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'homework-media' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Students upload own hw media" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'homework-media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Students read own hw media" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'homework-media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Students update own hw media" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'homework-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_homework_course ON public.homework(course_id);
CREATE INDEX IF NOT EXISTS idx_hw_questions_hw ON public.homework_questions(homework_id);
CREATE INDEX IF NOT EXISTS idx_hw_options_q ON public.homework_options(question_id);
CREATE INDEX IF NOT EXISTS idx_hw_subm_hw ON public.homework_submissions(homework_id);
CREATE INDEX IF NOT EXISTS idx_hw_subm_student ON public.homework_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_hw_answers_subm ON public.homework_answers(submission_id);
