-- Add video_url to exam questions
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Add video_url to question options (MCQ choices)
ALTER TABLE public.question_options ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Also add video_url to homework questions for consistency
ALTER TABLE public.homework_questions ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Exam-media bucket: allow video uploads by admins (policies already exist for admins)
-- No need to change storage policies — existing admin policies cover all file types
