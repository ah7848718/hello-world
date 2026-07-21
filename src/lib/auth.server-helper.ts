import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getRequest } from "@tanstack/react-start/server";

export function getToken(data?: { token?: string }): string | null {
  if (data?.token) return data.token;
  try {
    const request = getRequest();
    const authHeader = request?.headers?.get("authorization");
    if (authHeader?.startsWith("Bearer ")) return authHeader.replace("Bearer ", "");
  } catch {}
  return null;
}

export async function verifyAuth(token: string | null | undefined): Promise<{ userId: string; error: null } | { userId: null; error: string }> {
  if (!token) return { userId: null, error: "غير مصرح بالدخول. سجل دخول أولاً." };
  try {
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) return { userId: null, error: authErr?.message ?? "انتهت الجلسة. سجل دخول مرة أخرى." };
    return { userId: user.id, error: null };
  } catch (e: any) {
    return { userId: null, error: e?.message ?? "خطأ في التحقق من الهوية" };
  }
}

export async function verifyAdmin(token: string | null | undefined): Promise<{ userId: string; error: null } | { userId: null; error: string }> {
  if (!token) return { userId: null, error: "غير مصرح بالدخول. سجل دخول أولاً." };
  try {
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) return { userId: null, error: authErr?.message ?? "انتهت الجلسة. سجل دخول مرة أخرى." };
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    if (!(roles ?? []).some((r: any) => r.role === "admin")) {
      return { userId: null, error: "ليس لديك صلاحية المشرف" };
    }
    return { userId: user.id, error: null };
  } catch (e: any) {
    return { userId: null, error: e?.message ?? "خطأ في التحقق من الهوية" };
  }
}

export async function verifyStaff(token: string | null | undefined): Promise<{ userId: string; error: null } | { userId: null; error: string }> {
  if (!token) return { userId: null, error: "غير مصرح بالدخول. سجل دخول أولاً." };
  try {
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) return { userId: null, error: authErr?.message ?? "انتهت الجلسة. سجل دخول مرة أخرى." };
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const arr = (roles ?? []).map((r: any) => r.role);
    if (!arr.includes("admin") && !arr.includes("assistant")) {
      return { userId: null, error: "ليس لديك صلاحية" };
    }
    return { userId: user.id, error: null };
  } catch (e: any) {
    return { userId: null, error: e?.message ?? "خطأ في التحقق من الهوية" };
  }
}
