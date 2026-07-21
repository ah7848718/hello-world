-- Add media columns for question explanations
ALTER TABLE questions ADD COLUMN IF NOT EXISTS explanation_image_url text;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS explanation_audio_url text;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS explanation_video_url text;
