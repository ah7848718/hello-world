const { Client } = require("pg");

async function main() {
  const client = new Client({
    connectionString:
      "postgresql://postgres.pkkmyarpimznfjrnbbmj:Ahmed%40123Bup@aws-1-eu-west-2.pooler.supabase.com:6543/postgres",
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  const tables = await client.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'lessons'
  `);
  console.log("Table exists:", tables.rows.length > 0);

  const policies = await client.query(`
    SELECT policyname, permissive, roles, cmd, qual 
    FROM pg_policies 
    WHERE tablename = 'lessons'
  `);
  console.log("Policies:", JSON.stringify(policies.rows, null, 2));

  const buckets = await client.query(`
    SELECT id, name, public FROM storage.buckets WHERE id = 'lesson-media'
  `);
  console.log("Storage bucket:", JSON.stringify(buckets.rows, null, 2));

  await client.end();
}

main().catch((e) => {
  console.error("Failed:", e.message);
  process.exit(1);
});
