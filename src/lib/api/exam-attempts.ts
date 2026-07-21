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

export async function startExamAttempt<T = any>(opts: { data: { exam_id: string; student_id: string } }): Promise<T> {
  return rpc<T>("startExamAttempt", opts.data);
}

export async function submitExamAttempt<T = any>(opts: { attemptId: string; token?: string }): Promise<T> {
  return rpc<T>("submitExamAttempt", { attemptId: opts.attemptId, token: opts.token });
}