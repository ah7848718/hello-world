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

export async function replyToTicket<T = any>(opts: { data: { ticketId: string; message: string; token?: string } }): Promise<T> {
  return rpc<T>("replyToTicket", opts.data);
}
export async function updateTicket<T = any>(opts: { data: { ticketId: string; status?: string; token?: string } }): Promise<T> {
  return rpc<T>("updateTicket", opts.data);
}