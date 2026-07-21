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
const anonKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

const anon = createClient(url, anonKey);
const admin = createClient(url, serviceKey);

async function main() {
  // Get a session token for anon client
  const testPath = `_rls_test/test-${Date.now()}.txt`;
  
  // Sign in with admin user to get a valid session
  const { data: signInData, error: signInErr } = await admin.auth.signInWithPassword({
    email: 'admin@gmail.com',
    password: 'Admin@123'
  });
  
  if (signInErr) {
    console.log('Cannot sign in as admin:', signInErr.message);
    console.log('Creating anon client with session token from service_role...');
  }

  // Instead, let's use the anon key client and set the session manually
  // Actually for RLS testing, we need an authenticated user
  // Let's just verify with admin client (which bypasses RLS)
  const { data: upData, error: upErr } = await anon.storage.from('payment-receipts').upload(testPath, new Blob(['test']), { contentType: 'text/plain' });
  if (upErr) {
    console.log('Anon upload (no session) FAILED:', upErr.message);
    console.log('This is expected - we need an authenticated session.');
    console.log('Raising issue: the client upload needs auth session');
  } else {
    console.log('Anon upload (no session) OK - bucket might be public');
    await admin.storage.from('payment-receipts').remove([testPath]);
  }

  // Now test with admin session (authenticated)
  // Use the sign-in to get a session
  console.log('\nTesting with authenticated session...');
  try {
    const { data: sess, error: sessErr } = await admin.auth.signInWithPassword({
      email: 'admin@gmail.com',
      password: 'Admin@123'
    });
    if (sessErr) throw sessErr;
    
    // Create a new anon client but set the session token
    const authedClient = createClient(url, anonKey);
    await authedClient.auth.setSession(sess.session);
    
    const testPath2 = `_rls_test/test-authed-${Date.now()}.txt`;
    const { error: upErr2 } = await authedClient.storage.from('payment-receipts').upload(testPath2, new Blob(['test']), { contentType: 'text/plain' });
    if (upErr2) {
      console.log('Authed upload FAILED:', upErr2.message);
    } else {
      console.log('Authed upload OK!');
      await admin.storage.from('payment-receipts').remove([testPath2]);
    }
  } catch (e) {
    console.log('Auth test error:', e.message);
  }
}

main().catch(console.error);
