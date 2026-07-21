import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env');
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map(l => l.trim().split('=', 2))
    .filter(([k]) => k)
    .map(([k, v]) => [k.trim(), v.trim().replace(/^"|"$/g, '')])
);

const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) { console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }

const sql = `
-- Allow authenticated users to upload files to payment-receipts
CREATE POLICY "Allow uploads to payment-receipts" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-receipts');

-- Allow users to view their own uploaded files in payment-receipts
CREATE POLICY "Allow own file reads in payment-receipts" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'payment-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own files in payment-receipts
CREATE POLICY "Allow own file deletes in payment-receipts" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'payment-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);
`;

(async () => {
  const admin = createClient(url, serviceKey);
  
  // Try exec_sql first
  const { data, error } = await admin.rpc('exec_sql', { query: sql });
  if (error) {
    console.log('exec_sql RPC not available or failed:', error.message);
    console.log('Trying direct SQL via service_role...');
    
    // Alternative: use the management API
    // Check existing policies first
    const { data: policies } = await admin.rpc('exec_sql', {
      query: "SELECT policyname FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage'"
    });
    if (policies) {
      const existing = policies.map(function(p) { return p.policyname; });
      console.log('Existing policies:', existing);
      if (existing.includes('Allow uploads to payment-receipts')) {
        console.log('Policies already exist!');
        return;
      }
    }
    
    console.log('Could not add policies via RPC. Add manually via Supabase Dashboard:');
    console.log('SQL > New query > Paste:');
    console.log(sql);
    process.exit(1);
  }
  console.log('Policies added successfully!');
})().catch(console.error);
