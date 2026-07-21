import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env');
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n').filter(Boolean)
    .map(l => l.trim().split('=', 2))
    .filter(([k]) => k)
    .map(([k, v]) => [k.trim(), v.trim().replace(/^"|"$/g, '')])
);

const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) { console.error('Missing SUPABASE_URL or SERVICE_ROLE_KEY'); process.exit(1); }

const supabase = createClient(url, key);

const policies = [
  `CREATE POLICY IF NOT EXISTS "Allow uploads to payment-receipts" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'payment-receipts')`,
  `CREATE POLICY IF NOT EXISTS "Allow reads on payment-receipts" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'payment-receipts')`,
  `CREATE POLICY IF NOT EXISTS "Allow deletes on payment-receipts" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'payment-receipts' AND auth.uid()::text = (storage.foldername(name))[1])`,
];

async function main() {
  for (const sql of policies) {
    console.log('Executing policy...');
    const { data, error } = await supabase.rpc('exec_sql', { query: sql });
    if (error) {
      console.log('RPC failed:', error.message);
      console.log('Trying via fetch...');
      // fallback: direct REST call
      const resp = await fetch(url + '/rest/v1/rpc/exec_sql', {
        method: 'POST',
        headers: {
          'apikey': key,
          'Authorization': 'Bearer ' + key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sql }),
      });
      const text = await resp.text();
      console.log('Status:', resp.status, 'Response:', text.substring(0, 200));
    } else {
      console.log('OK:', JSON.stringify(data));
    }
  }
  
  // verify
  const { data: policies2 } = await supabase.rpc('exec_sql', {
    query: "SELECT policyname FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage'"
  });
  if (policies2) {
    console.log('Current policies:', policies2);
  }
}

main().catch(console.error);
