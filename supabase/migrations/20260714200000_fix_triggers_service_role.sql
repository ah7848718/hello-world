-- Fix protect_student_answer_grades: allow service_role (auth.uid() IS NULL) to bypass
CREATE OR REPLACE FUNCTION public.protect_student_answer_grades()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') AND auth.uid() IS NOT NULL THEN
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

-- Fix protect_exam_attempt_grades: allow service_role (auth.uid() IS NULL) to bypass
CREATE OR REPLACE FUNCTION public.protect_exam_attempt_grades()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') AND auth.uid() IS NOT NULL THEN
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
