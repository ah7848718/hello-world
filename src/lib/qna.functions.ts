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

export async function replyToQuestion<T = any>(opts: { data: { questionId: string; reply: string; token?: string } }): Promise<T> {
  return rpc<T>("replyToQuestion", opts.data);
}
export async function updateQuestionStatus<T = any>(opts: { data: { questionId: string; status?: string; token?: string } }): Promise<T> {
  return rpc<T>("updateQuestionStatus", opts.data);
}