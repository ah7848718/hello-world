-- Add exam_category column for Regular / Comprehensive exam classification
-- Regular: instant result, show answers, model exclusion logic
-- Comprehensive: no instant result, answers hidden until admin approval, no model exclusion

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exams' AND column_name = 'exam_category'
  ) THEN
    ALTER TABLE exams ADD COLUMN exam_category text NOT NULL DEFAULT 'regular';
  END IF;
END $$;

-- Add check constraint if not already present
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
      WHERE table_name = 'exams' AND constraint_name = 'exams_exam_category_check'
  ) THEN
    ALTER TABLE exams ADD CONSTRAINT exams_exam_category_check
      CHECK (exam_category IN ('regular', 'comprehensive'));
  END IF;
END $$;
