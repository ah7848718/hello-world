const { Client } = require("pg");

async function main() {
  const client = new Client({
    connectionString:
      "postgresql://postgres.pkkmyarpimznfjrnbbmj:Ahmed%40123Bup@aws-1-eu-west-2.pooler.supabase.com:6543/postgres",
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  
  const cols = await client.query(`
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles'
    ORDER BY ordinal_position
  `);
  console.log("profiles columns:", JSON.stringify(cols.rows, null, 2));

  const profiles = await client.query(`
    SELECT * FROM public.profiles WHERE id = '702ae49d-9aa9-466a-a5d3-1d2db0329661'
  `);
  console.log("admin profile:", JSON.stringify(profiles.rows, null, 2));

  await client.end();
}

main().catch((e) => {
  console.error("Failed:", e.message);
  process.exit(1);
});
