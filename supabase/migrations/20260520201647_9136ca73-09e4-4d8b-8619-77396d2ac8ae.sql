-- 1) Sanitized view for students (no is_correct)
CREATE OR REPLACE VIEW public.student_question_options
WITH (security_invoker = true) AS
SELECT id, question_id, text, image_url, order_index
FROM public.question_options;

GRANT SELECT ON public.student_question_options TO authenticated;

-- Restrict student SELECT on underlying table (admins keep their ALL policy)
DROP POLICY IF EXISTS "Students view options of accessible exams" ON public.question_options;

-- 2) Trigger: protect student_answers grade fields
CREATE OR REPLACE FUNCTION public.protect_student_answer_grades()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.is_correct := NULL;
      NEW.awarded_points := NULL;
      NEW.graded_by := NULL;
      NEW.graded_at := NULL;
    ELSE
      NEW.is_correct := OLD.is_correct;
      NEW.awarded_points := OLD.awarded_points;
      NEW.graded_by := OLD.graded_by;
      NEW.graded_at := OLD.graded_at;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_student_answer_grades ON public.student_answers;
CREATE TRIGGER trg_protect_student_answer_grades
BEFORE INSERT OR UPDATE ON public.student_answers
FOR EACH ROW EXECUTE FUNCTION public.protect_student_answer_grades();

-- 3) Trigger: protect exam_attempts grade/status fields
CREATE OR REPLACE FUNCTION public.protect_exam_attempt_grades()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.score := NULL;
      NEW.max_score := NULL;
      NEW.status := 'in_progress';
      NEW.submitted_at := NULL;
    ELSE
      NEW.score := OLD.score;
      NEW.max_score := OLD.max_score;
      NEW.status := OLD.status;
      NEW.submitted_at := OLD.submitted_at;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_exam_attempt_grades ON public.exam_attempts;
CREATE TRIGGER trg_protect_exam_attempt_grades
BEFORE INSERT OR UPDATE ON public.exam_attempts
FOR EACH ROW EXECUTE FUNCTION public.protect_exam_attempt_grades();

-- 4) Server-side grading RPC
CREATE OR REPLACE FUNCTION public.submit_exam_attempt(_attempt_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt record;
  v_score numeric := 0;
  v_max numeric := 0;
  v_needs_manual boolean := false;
  v_uid uuid := auth.uid();
BEGIN
  SELECT * INTO v_attempt FROM public.exam_attempts WHERE id = _attempt_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'attempt_not_found'; END IF;
  IF v_attempt.student_id <> v_uid THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF v_attempt.status <> 'in_progress' THEN RAISE EXCEPTION 'already_submitted'; END IF;

  SELECT COALESCE(SUM(points), 0) INTO v_max
  FROM public.questions WHERE exam_id = v_attempt.exam_id;

  SELECT EXISTS(
    SELECT 1 FROM public.questions
    WHERE exam_id = v_attempt.exam_id AND type = 'essay'
  ) INTO v_needs_manual;

  UPDATE public.student_answers sa
  SET is_correct = (
        sa.selected_option_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.question_options qo
          WHERE qo.id = sa.selected_option_id AND qo.is_correct = true
        )
      ),
      awarded_points = CASE
        WHEN sa.selected_option_id IS NOT NULL
             AND EXISTS (
               SELECT 1 FROM public.question_options qo
               WHERE qo.id = sa.selected_option_id AND qo.is_correct = true
             )
        THEN (SELECT q.points FROM public.questions q WHERE q.id = sa.question_id)
        ELSE 0
      END,
      graded_at = now()
  FROM public.questions q
  WHERE sa.attempt_id = _attempt_id
    AND q.id = sa.question_id
    AND q.type IN ('mcq', 'true_false');

  SELECT COALESCE(SUM(awarded_points), 0) INTO v_score
  FROM public.student_answers WHERE attempt_id = _attempt_id;

  UPDATE public.exam_attempts
  SET submitted_at = now(),
      status = CASE WHEN v_needs_manual THEN 'submitted'::attempt_status ELSE 'graded'::attempt_status END,
      score = v_score,
      max_score = v_max
  WHERE id = _attempt_id;

  RETURN jsonb_build_object('score', v_score, 'max_score', v_max, 'needs_manual', v_needs_manual);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_exam_attempt(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.submit_exam_attempt(uuid) TO authenticated;