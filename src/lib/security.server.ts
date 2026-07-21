import type { SupabaseClient } from "@supabase/supabase-js";

const ADMIN_BYPASS_IDS = ["4d317f50-9fed-4311-b98d-0d03b5b6b4f3"];
const ADMIN_EMAILS = ["admin@gmail.com"];

async function isAdminByEmail(email: string | undefined) {
  return email ? ADMIN_EMAILS.includes(email) : false;
}

export async function assertAdmin(supabase: SupabaseClient<any>, userId: string, userEmail?: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (ADMIN_BYPASS_IDS.includes(userId)) return { ok: true };
  if (userEmail && ADMIN_EMAILS.includes(userEmail)) return { ok: true };
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) return { ok: false, error: "Authorization check failed" };
  if (!data) return { ok: false, error: "ليس لديك صلاحية المشرف" };
  return { ok: true };
}
