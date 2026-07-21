import { supabase } from "@/integrations/supabase/client";

async function rpc<T>(fn: string, data: Record<string, unknown>): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const res = await fetch("/api/rpc", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
    body: JSON.stringify({ fn, data }),
  });
  return res.json();
}

export async function createNotification<T = any>(opts: { data: { title: string; body: string; target_role?: string; token?: string } }): Promise<T> {
  return rpc<T>("createNotification", opts.data);
}
export async function deleteNotification<T = any>(opts: { data: { id: string; token?: string } }): Promise<T> {
  return rpc<T>("deleteNotification", opts.data);
}