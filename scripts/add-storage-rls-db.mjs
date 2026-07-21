import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: 'aws-1-eu-west-2.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.pkkmyarpimznfjrnbbmj',
  password: 'Ahmed@123Bup',
  ssl: { rejectUnauthorized: false },
  max: 1,
});

const dropSql = `
DROP POLICY IF EXISTS "Allow uploads to payment-receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow reads on payment-receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow deletes on payment-receipts" ON storage.objects;
`;

const sql = `
CREATE POLICY "Allow uploads to payment-receipts" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-receipts');

CREATE POLICY "Allow reads on payment-receipts" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'payment-receipts');

CREATE POLICY "Allow deletes on payment-receipts" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'payment-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);
`;

try {
  const client = await pool.connect();
  try {
    await client.query(dropSql);
    await client.query(sql);
    console.log('Policies added successfully!');
    
    // Verify
    const { rows } = await client.query(
      `SELECT policyname FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage'`
    );
    console.log('Current policies:', rows.map(r => r.policyname));
  } finally {
    client.release();
  }
} catch (err) {
  console.error('Error:', err.message);
} finally {
  await pool.end();
}
