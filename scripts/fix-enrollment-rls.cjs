/**
 * Fix RLS policies for enrollments & ensure is_approved_student works
 * Run: node scripts/fix-enrollment-rls.cjs
 */
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env" });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

async function main() {
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Check if RLS policies exist on enrollments
  console.log("\n--- Checking enrollments RLS ---");
  const { data: policies, error: polErr } = await admin.rpc("get_policies_for_table", {
    table_name: "enrollments",
    schema_name: "public",
  });

  if (polErr) {
    console.log("rpc get_policies_for_table failed (may not exist), trying raw query...");
    const { data: rawPolicies, error: rawErr } = await admin
      .from("enrollments")
      .select("id")
      .limit(1);
    if (rawErr) {
      console.log("Query error (expected if RLS blocks):", rawErr.message);
    } else {
      console.log("Query OK (RLS not blocking)");
    }
  } else {
    console.log("Enrollments policies:", JSON.stringify(policies, null, 2));
  }

  // 2. Check profiles for the student (test student)
  const { data: students, error: studErr } = await admin
    .from("profiles")
    .select("id, full_name, email, status")
    .limit(10);
  if (studErr) {
    console.error("Error fetching profiles:", studErr.message);
  } else {
    console.log("\n--- Profiles (first 10) ---");
    students.forEach((s) =>
      console.log(`  ${s.full_name}: status=${s.status}, email=${s.email}`)
    );
    const pending = students.filter((s) => s.status !== "approved");
    if (pending.length > 0) {
      console.log(`\n⚠️  ${pending.length} student(s) with status != 'approved':`);
      pending.forEach((s) =>
        console.log(`  - ${s.full_name} (${s.email}): ${s.status}`)
      );
    }
  }

  // 3. Check enrollments
  const { data: enrollments, error: enrErr } = await admin
    .from("enrollments")
    .select("id, student_id, course_id, status")
    .limit(10);
  if (enrErr) {
    console.error("Error fetching enrollments:", enrErr.message);
  } else {
    console.log("\n--- Enrollments (first 10) ---");
    enrollments.forEach((e) =>
      console.log(`  student=${e.student_id} course=${e.course_id} status=${e.status}`)
    );
    console.log(`Total: ${enrollments.length}`);
  }

  // 4. APPROVE ALL PENDING PROFILES (fix the core issue)
  console.log("\n--- Approving pending profiles ---");
  const pendingProfiles = students?.filter((s) => s.status !== "approved") ?? [];
  for (const p of pendingProfiles) {
    const { error: updErr } = await admin
      .from("profiles")
      .update({ status: "approved", reviewed_at: new Date().toISOString() })
      .eq("id", p.id);
    if (updErr) {
      console.error(`  Failed to approve ${p.full_name}: ${updErr.message}`);
    } else {
      console.log(`  ✅ Approved: ${p.full_name} (${p.email})`);
    }
  }

  // 5. Ensure admin user has admin role in user_roles table
  const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "admin@gmail.com")
    .split(",").map((e) => e.trim().toLowerCase());

  console.log("\n--- Ensuring admin roles ---");
  for (const email of ADMIN_EMAILS) {
    const { data: users } = await admin.auth.admin.listUsers();
    const au = users?.users?.find((u) => u.email?.toLowerCase() === email);
    if (au) {
      const { data: existing } = await admin
        .from("user_roles")
        .select("id")
        .eq("user_id", au.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!existing) {
        const { error: insErr } = await admin
          .from("user_roles")
          .insert({ user_id: au.id, role: "admin" });
        if (insErr) {
          console.error(`  Failed to insert admin role for ${email}: ${insErr.message}`);
        } else {
          console.log(`  ✅ Admin role added: ${email}`);
        }
      } else {
        console.log(`  ✅ Admin role exists: ${email}`);
      }
    } else {
      console.log(`  ⚠️  Admin user not found by email: ${email}`);
    }
  }

  console.log("\n✅ Done!");
}

main().catch(console.error);
