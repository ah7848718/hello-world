import { supabase } from "@/integrations/supabase/client";

const API = "/api/rpc";

async function rpc<T>(fn: string, data: Record<string, unknown>): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ fn, data }),
  });
  return res.json();
}

export async function impersonateStudent<T = any>(opts: { data: { studentId: string; token?: string } }): Promise<T> {
  return rpc<T>("impersonateStudent", opts.data);
}
