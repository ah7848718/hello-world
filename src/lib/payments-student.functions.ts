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

export async function validateCoupon<T = any>(opts: { data: { code: string; courseId: string; token?: string } }): Promise<T> {
  return rpc<T>("validateCoupon", opts.data);
}
export async function submitPayment<T = any>(opts: { data: Record<string, unknown> }): Promise<T> {
  return rpc<T>("submitPayment", opts.data);
}