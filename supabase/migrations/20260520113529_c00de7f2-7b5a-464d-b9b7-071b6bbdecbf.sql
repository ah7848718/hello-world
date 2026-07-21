-- Enums
CREATE TYPE public.exam_type AS ENUM ('quiz', 'assignment', 'major');
CREATE TYPE public.question_type AS ENUM ('mcq', 'true_false', 'essay');
CREATE TYPE public.attempt_status AS ENUM ('in_progress', 'submitted', 'graded');

-- exams
CREATE TABLE public.exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  type public.exam_type NOT NULL DEFAULT 'quiz',
  duration_minutes INT,
  passing_score NUMERIC DEFAULT 50,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  is_published BOOLEAN NOT NULL DEFAULT false,
  shuffle_questions BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- questions
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  type public.question_type NOT NULL,
  text TEXT NOT NULL,
  image_url TEXT,
  audio_url TEXT,
  hint TEXT,
  explanation TEXT,
  points NUMERIC NOT NULL DEFAULT 1,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- question options
CREATE TABLE public.question_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  text TEXT,
  image_url TEXT,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  order_index INT NOT NULL DEFAULT 0
);

-- attempts
CREATE TABLE public.exam_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  score NUMERIC,
  max_score NUMERIC,
  status public.attempt_status NOT NULL DEFAULT 'in_progress'
);

-- student answers
CREATE TABLE public.student_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.exam_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  selected_option_id UUID REFERENCES public.question_options(id) ON DELETE SET NULL,
  answer_text TEXT,
  answer_image_url TEXT,
  is_correct BOOLEAN,
  awarded_points NUMERIC,
  graded_by UUID,
  graded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, question_id)
);

-- assignments (optional restrict to specific students)
CREATE TABLE public.exam_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (exam_id, student_id)
);

-- indexes
CREATE INDEX idx_questions_exam ON public.questions(exam_id);
CREATE INDEX idx_options_question ON public.question_options(question_id);
CREATE INDEX idx_attempts_student ON public.exam_attempts(student_id);
CREATE INDEX idx_attempts_exam ON public.exam_attempts(exam_id);
CREATE INDEX idx_answers_attempt ON public.student_answers(attempt_id);
CREATE INDEX idx_assignments_student ON public.exam_assignments(student_id);

-- timestamps trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_exams_updated BEFORE UPDATE ON public.exams
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Helper: is student approved?
CREATE OR REPLACE FUNCTION public.is_approved_student(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND status = 'approved')
$$;

-- Helper: can student access this exam?
CREATE OR REPLACE FUNCTION public.can_access_exam(_user_id UUID, _exam_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.exams e
    WHERE e.id = _exam_id
      AND e.is_published = true
      AND public.is_approved_student(_user_id)
      AND (
        NOT EXISTS (SELECT 1 FROM public.exam_assignments WHERE exam_id = _exam_id)
        OR EXISTS (SELECT 1 FROM public.exam_assignments WHERE exam_id = _exam_id AND student_id = _user_id)
      )
  )
$$;

-- Helper: are major exam answers unlocked? (after end_at) — non-major always unlocked after submit
CREATE OR REPLACE FUNCTION public.exam_answers_unlocked(_exam_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.exams
    WHERE id = _exam_id
      AND (type <> 'major' OR (end_at IS NOT NULL AND end_at < now()))
  )
$$;

-- Enable RLS
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_assignments ENABLE ROW LEVEL SECURITY;

-- ============ exams policies ============
CREATE POLICY "Admins manage exams" ON public.exams FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Students view accessible exams" ON public.exams FOR SELECT TO authenticated
USING (
  is_published = true
  AND public.is_approved_student(auth.uid())
  AND (
    NOT EXISTS (SELECT 1 FROM public.exam_assignments WHERE exam_id = exams.id)
    OR EXISTS (SELECT 1 FROM public.exam_assignments WHERE exam_id = exams.id AND student_id = auth.uid())
  )
);

-- ============ questions policies ============
CREATE POLICY "Admins manage questions" ON public.questions FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Students view questions of accessible exams" ON public.questions FOR SELECT TO authenticated
USING (public.can_access_exam(auth.uid(), exam_id));

-- ============ options policies ============
CREATE POLICY "Admins manage options" ON public.question_options FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Students see options but is_correct is filtered via server function for major exams
CREATE POLICY "Students view options of accessible exams" ON public.question_options FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.id = question_options.question_id
      AND public.can_access_exam(auth.uid(), q.exam_id)
  )
);

-- ============ attempts policies ============
CREATE POLICY "Admins view all attempts" ON public.exam_attempts FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update attempts" ON public.exam_attempts FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Students view own attempts" ON public.exam_attempts FOR SELECT TO authenticated
USING (student_id = auth.uid());

CREATE POLICY "Students create own attempts" ON public.exam_attempts FOR INSERT TO authenticated
WITH CHECK (student_id = auth.uid() AND public.can_access_exam(auth.uid(), exam_id));

CREATE POLICY "Students update own in-progress attempts" ON public.exam_attempts FOR UPDATE TO authenticated
USING (student_id = auth.uid() AND status = 'in_progress')
WITH CHECK (student_id = auth.uid());

-- ============ student_answers policies ============
CREATE POLICY "Admins manage answers" ON public.student_answers FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Students view own answers" ON public.student_answers FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.exam_attempts a WHERE a.id = student_answers.attempt_id AND a.student_id = auth.uid()));

CREATE POLICY "Students insert own answers" ON public.student_answers FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.exam_attempts a WHERE a.id = student_answers.attempt_id AND a.student_id = auth.uid() AND a.status = 'in_progress'));

CREATE POLICY "Students update own answers" ON public.student_answers FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.exam_attempts a WHERE a.id = student_answers.attempt_id AND a.student_id = auth.uid() AND a.status = 'in_progress'))
WITH CHECK (EXISTS (SELECT 1 FROM public.exam_attempts a WHERE a.id = student_answers.attempt_id AND a.student_id = auth.uid()));

-- ============ exam_assignments policies ============
CREATE POLICY "Admins manage assignments" ON public.exam_assignments FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Students view own assignments" ON public.exam_assignments FOR SELECT TO authenticated
USING (student_id = auth.uid());

-- ============ Storage bucket for exam media ============
INSERT INTO storage.buckets (id, name, public) VALUES ('exam-media', 'exam-media', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins read exam-media" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'exam-media' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins write exam-media" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'exam-media' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update exam-media" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'exam-media' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete exam-media" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'exam-media' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Students read exam-media" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'exam-media' AND public.is_approved_student(auth.uid()));

CREATE POLICY "Students upload own answer media" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'exam-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Students update own answer media" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'exam-media' AND auth.uid()::text = (storage.foldername(name))[1]);