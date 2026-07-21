const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

const sql = `
-- Create lessons table
CREATE TABLE IF NOT EXISTS public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  video_type TEXT NOT NULL DEFAULT 'upload',
  video_url TEXT,
  video_bunny_id TEXT,
  grade TEXT NOT NULL DEFAULT 'أولى ثانوي',
  is_published BOOLEAN NOT NULL DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (safe to re-run)
DROP POLICY IF EXISTS "Admins can read lessons" ON public.lessons;
DROP POLICY IF EXISTS "Admins can insert lessons" ON public.lessons;
DROP POLICY IF EXISTS "Admins can update lessons" ON public.lessons;
DROP POLICY IF EXISTS "Admins can delete lessons" ON public.lessons;
DROP POLICY IF EXISTS "Students can read published lessons" ON public.lessons;

-- Admin policies using email check (matches app's auth pattern)
CREATE POLICY "Admins can read lessons" ON public.lessons
  FOR SELECT TO authenticated
  USING (auth.email() = 'admin@gmail.com');

CREATE POLICY "Admins can insert lessons" ON public.lessons
  FOR INSERT TO authenticated
  WITH CHECK (auth.email() = 'admin@gmail.com');

CREATE POLICY "Admins can update lessons" ON public.lessons
  FOR UPDATE TO authenticated
  USING (auth.email() = 'admin@gmail.com');

CREATE POLICY "Admins can delete lessons" ON public.lessons
  FOR DELETE TO authenticated
  USING (auth.email() = 'admin@gmail.com');

-- Students can read published lessons
CREATE POLICY "Students can read published lessons" ON public.lessons
  FOR SELECT TO authenticated
  USING (is_published = true);

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.lessons;
EXCEPTION WHEN OTHERS THEN
  -- already added or other harmless error
END $$;

-- Storage bucket for lesson media
INSERT INTO storage.buckets (id, name, public) VALUES ('lesson-media', 'lesson-media', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies if any
DROP POLICY IF EXISTS "Admins can read lesson-media" ON storage.objects;
DROP POLICY IF EXISTS "Admins can insert lesson-media" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update lesson-media" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete lesson-media" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read lesson-media files" ON storage.objects;

CREATE POLICY "Admins can read lesson-media" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'lesson-media' AND auth.email() = 'admin@gmail.com');

CREATE POLICY "Admins can insert lesson-media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'lesson-media' AND auth.email() = 'admin@gmail.com');

CREATE POLICY "Admins can update lesson-media" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'lesson-media' AND auth.email() = 'admin@gmail.com');

CREATE POLICY "Admins can delete lesson-media" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'lesson-media' AND auth.email() = 'admin@gmail.com');

CREATE POLICY "Anyone can read lesson-media files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'lesson-media');
`;

async function main() {
  const client = new Client({
    connectionString:
      "postgresql://postgres.pkkmyarpimznfjrnbbmj:Ahmed%40123Bup@aws-1-eu-west-2.pooler.supabase.com:6543/postgres",
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log("Connected.");

  await client.query(sql);
  console.log("Migration applied successfully.");

  await client.end();
}

main().catch((e) => {
  console.error("Failed:", e.message);
  process.exit(1);
});
