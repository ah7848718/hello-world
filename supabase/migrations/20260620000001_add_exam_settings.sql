-- Add exam-level settings for multiple attempts, instant result
ALTER TABLE exams ADD COLUMN IF NOT EXISTS allow_multiple_attempts boolean DEFAULT false;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS max_attempts integer;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS instant_result boolean DEFAULT false;
