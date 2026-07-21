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
const anonKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY;

if (!url || !serviceKey) { console.error('Missing env vars'); process.exit(1); }

const admin = createClient(url, serviceKey);

// Check bucket exists
const { data: buckets } = await admin.storage.listBuckets();
const b = buckets.find(x => x.name === 'payment-receipts');
console.log('payment-receipts bucket:', JSON.stringify({ id: b?.id, name: b?.name, public: b?.public }, null, 2));

if (!b) { console.log('Bucket missing!'); process.exit(1); }

// Test listing (admin)
const { data: listData } = await admin.storage.from('payment-receipts').list();
console.log('Admin list:', (listData?.length ?? 0) + ' items');

// Test upload with anon key (simulates real client upload)
const anon = createClient(url, anonKey);
const testPath = `_rls_test/test-${Date.now()}.txt`;
const { data: upData, error: upErr } = await anon.storage.from('payment-receipts').upload(testPath, new Blob(['test']), { contentType: 'text/plain' });
if (upErr) {
  console.log('Anon upload FAILED:', upErr.message);
  console.log('-> Need to add RLS INSERT policy for payment-receipts');
} else {
  console.log('Anon upload OK');
  await admin.storage.from('payment-receipts').remove([testPath]);
  console.log('Cleaned up test file');
}
