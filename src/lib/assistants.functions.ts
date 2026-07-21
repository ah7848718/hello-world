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

export async function inviteAssistant<T = any>(opts: { data: { email: string; token?: string } }): Promise<T> {
  return rpc<T>("inviteAssistant", opts.data);
}

export async function updateAssistant<T = any>(opts: { data: { id: string; full_name?: string; email?: string; token?: string } }): Promise<T> {
  return rpc<T>("updateAssistant", opts.data);
}

export async function deleteAssistant<T = any>(opts: { data: { id: string; token?: string } }): Promise<T> {
  return rpc<T>("deleteAssistant", opts.data);
}