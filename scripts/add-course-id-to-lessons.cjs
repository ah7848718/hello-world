const { Client } = require("pg");

const sql = `
ALTER TABLE public.lessons
ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON public.lessons (course_id);
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
  console.log("course_id column added to lessons table.");
  await client.end();
}

main().catch((e) => {
  console.error("Failed:", e.message);
  process.exit(1);
});
