ALTER TABLE public.student_answers ADD COLUMN IF NOT EXISTS answer_audio_url text;
ALTER TABLE public.homework_answers ADD COLUMN IF NOT EXISTS answer_audio_url text;
ALTER TABLE public.homework_questions ADD COLUMN IF NOT EXISTS audio_url text;