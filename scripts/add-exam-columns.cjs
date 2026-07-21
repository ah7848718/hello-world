const { Client } = require("pg");

const client = new Client({
  connectionString:
    "postgresql://postgres.pkkmyarpimznfjrnbbmj:Ahmed%40123Bup@aws-1-eu-west-2.pooler.supabase.com:6543/postgres",
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await client.connect();
  console.log("Connected.");

  // Get existing columns
  const { rows } = await client.query(
    "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'exams'"
  );
  const existing = rows.map((r) => r.column_name);
  console.log("Existing columns:", existing.join(", "));

  const alterations = [
    { name: "allow_multiple_attempts", def: "boolean default false" },
    { name: "max_attempts", def: "integer" },
    { name: "instant_result", def: "boolean default true" },
    { name: "cycle_models", def: "boolean default false" },
    { name: "exam_category", def: "text default 'regular'::text" },
    { name: "shuffle_questions", def: "boolean default false" },
    { name: "description", def: "text" },
    { name: "start_at", def: "timestamptz" },
    { name: "lecture_id", def: "uuid" },
    { name: "created_by", def: "uuid" },
  ];

  for (const col of alterations) {
    if (!existing.includes(col.name)) {
      const sql = `ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS ${col.name} ${col.def};`;
      console.log(`Adding column: ${col.name}`);
      await client.query(sql);
    } else {
      console.log(`Column already exists: ${col.name}`);
    }
  }

  console.log("Migration applied successfully.");
  await client.end();
}

main().catch((e) => {
  console.error("Failed:", e.message);
  process.exit(1);
});
