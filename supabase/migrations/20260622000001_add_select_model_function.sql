-- Function: select_model_for_attempt
-- Implements the model selection algorithm at the DB level:
-- 1. Excludes all models the student has used in completed attempts
-- 2. Avoids giving the same model as the student's last attempt
--    if there are other unused models available
-- 3. If all models used and cycle_models=true, recycles avoiding last model
-- 4. If all models used and cycle_models=false, returns null (blocked)

CREATE OR REPLACE FUNCTION public.select_model_for_attempt(
  _exam_id uuid,
  _student_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _available_models text[];
  _used_models text[];
  _last_model text;
  _cycle_models boolean;
  _exam_category text;
  _candidates text[];
  _selected text;
BEGIN
  -- Get exam settings
  SELECT cycle_models, exam_category INTO _cycle_models, _exam_category
  FROM public.exams
  WHERE id = _exam_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('model', null, 'blocked', true, 'reason', 'الامتحان غير موجود');
  END IF;

  -- Get all distinct models from questions for this exam
  SELECT ARRAY_AGG(DISTINCT q.model ORDER BY q.model)
  INTO _available_models
  FROM public.questions q
  WHERE q.exam_id = _exam_id AND q.model IS NOT NULL;

  IF _available_models IS NULL OR array_length(_available_models, 1) = 0 THEN
    RETURN jsonb_build_object('model', null, 'blocked', false);
  END IF;

  -- Comprehensive: pick from ALL models, never exclude
  IF _exam_category = 'comprehensive' THEN
    _candidates := _available_models;
    IF _last_model IS NOT NULL AND array_length(_candidates, 1) > 1 THEN
      SELECT ARRAY(
        SELECT unnest(_available_models)
        EXCEPT
        SELECT _last_model
      ) INTO _candidates;
    END IF;
    IF _candidates IS NOT NULL AND array_length(_candidates, 1) > 0 THEN
      _selected := _candidates[1 + floor(random() * array_length(_candidates, 1))::int];
      RETURN jsonb_build_object('model', _selected, 'blocked', false);
    END IF;
    _selected := _available_models[1];
    RETURN jsonb_build_object('model', _selected, 'blocked', false);
  END IF;

  -- Regular: exclude used models
  SELECT ARRAY_AGG(DISTINCT ea.model ORDER BY ea.model)
  INTO _used_models
  FROM public.exam_attempts ea
  WHERE ea.exam_id = _exam_id
    AND ea.student_id = _student_id
    AND ea.status IN ('submitted', 'graded')
    AND ea.model IS NOT NULL;

  SELECT ea.model INTO _last_model
  FROM public.exam_attempts ea
  WHERE ea.exam_id = _exam_id
    AND ea.student_id = _student_id
    AND ea.status IN ('submitted', 'graded')
    AND ea.model IS NOT NULL
  ORDER BY ea.submitted_at DESC NULLS LAST
  LIMIT 1;

  IF _used_models IS NOT NULL THEN
    SELECT ARRAY(
      SELECT unnest(_available_models)
      EXCEPT
      SELECT unnest(_used_models)
    ) INTO _candidates;
  ELSE
    _candidates := _available_models;
  END IF;

  IF _candidates IS NOT NULL AND array_length(_candidates, 1) > 0 THEN
    IF _last_model IS NOT NULL AND array_length(_candidates, 1) > 1 THEN
      SELECT ARRAY(
        SELECT unnest(_candidates)
        EXCEPT
        SELECT _last_model
      ) INTO _candidates;
    END IF;
    IF _candidates IS NOT NULL AND array_length(_candidates, 1) > 0 THEN
      _selected := _candidates[1 + floor(random() * array_length(_candidates, 1))::int];
      RETURN jsonb_build_object('model', _selected, 'blocked', false);
    END IF;
    _selected := _candidates[1];
    RETURN jsonb_build_object('model', _selected, 'blocked', false);
  END IF;

  IF NOT _cycle_models THEN
    RETURN jsonb_build_object('model', null, 'blocked', true, 'reason', 'لا توجد نماذج متاحة للاختبار. تم استنفاذ جميع النماذج.');
  END IF;

  _candidates := _available_models;
  IF _last_model IS NOT NULL AND array_length(_candidates, 1) > 1 THEN
    SELECT ARRAY(
      SELECT unnest(_available_models)
      EXCEPT
      SELECT _last_model
    ) INTO _candidates;
  END IF;

  IF _candidates IS NOT NULL AND array_length(_candidates, 1) > 0 THEN
    _selected := _candidates[1 + floor(random() * array_length(_candidates, 1))::int];
    RETURN jsonb_build_object('model', _selected, 'blocked', false);
  END IF;

  _selected := _available_models[1];
  RETURN jsonb_build_object('model', _selected, 'blocked', false);
END;
$$;

COMMENT ON FUNCTION public.select_model_for_attempt IS 'Selects a random model for a student exam attempt, avoiding reused and consecutive same models.';
