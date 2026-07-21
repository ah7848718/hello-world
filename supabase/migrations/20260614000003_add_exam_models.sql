-- Add model column to questions (A/B/C/D or 1/2/3/4)
ALTER TABLE questions ADD COLUMN IF NOT EXISTS model text;

-- Add model column to exam_attempts to track which model was assigned
ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS model text;

-- Create index for fast model queries
CREATE INDEX IF NOT EXISTS idx_questions_exam_model ON questions(exam_id, model);
CREATE INDEX IF NOT EXISTS idx_attempts_exam_student_model ON exam_attempts(exam_id, student_id, model);
