const { Client } = require("pg");

const sql = `
-- Check if bucket exists
DO $$
DECLARE
  bucket_exists boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'payment-receipts') INTO bucket_exists;
  
  IF NOT bucket_exists THEN
    INSERT INTO storage.buckets (id, name, public) VALUES ('payment-receipts', 'payment-receipts', false);
    RAISE NOTICE 'Created payment-receipts bucket';
  ELSE
    RAISE NOTICE 'payment-receipts bucket already exists';
  END IF;

  -- Ensure RLS policies exist
  DROP POLICY IF EXISTS "payment-receipts user upload" ON storage.objects;
  DROP POLICY IF EXISTS "payment-receipts user read own" ON storage.objects;
  DROP POLICY IF EXISTS "payment-receipts admin read all" ON storage.objects;

  CREATE POLICY "payment-receipts user upload" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'payment-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

  CREATE POLICY "payment-receipts user read own" ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'payment-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

  CREATE POLICY "payment-receipts admin read all" ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'payment-receipts' AND has_role(auth.uid(), 'admin'));
    
  RAISE NOTICE 'RLS policies applied';
END $$;
`;

async function main() {
  const client = new Client({
    connectionString:
      "postgresql://postgres.pkkmyarpimznfjrnbbmj:Ahmed%40123Bup@aws-1-eu-west-2.pooler.supabase.com:6543/postgres",
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log("Connected to Supabase.");

  await client.query(sql);
  console.log("Bucket check/creation completed.");

  await client.end();
  console.log("Done.");
}

main().catch((e) => {
  console.error("Failed:", e.message);
  process.exit(1);
});
