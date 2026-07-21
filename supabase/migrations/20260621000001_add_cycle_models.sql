-- Add cycle_models setting for exam model recycling behavior
ALTER TABLE exams ADD COLUMN IF NOT EXISTS cycle_models boolean DEFAULT false;
