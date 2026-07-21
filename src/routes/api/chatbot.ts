import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type Body = { messages?: unknown; lang?: "ar" | "en" };

let cache: { at: number; items: any[] } | null = null;
const TTL_MS = 5 * 60 * 1000;

async function loadFaq(): Promise<any[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.items;
  const { data } = await supabaseAdmin
    .from("ai_faq")
    .select("question,answer,category")
    .eq("is_active", true)
    .limit(200);
  const items = data ?? [];
  cache = { at: Date.now(), items };
  return items;
}

function similarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().replace(/[^\u0600-\u06FF\w]/g, " ").split(/\s+/).filter(Boolean));
  const wordsB = new Set(b.toLowerCase().replace(/[^\u0600-\u06FF\w]/g, " ").split(/\s+/).filter(Boolean));
  let overlap = 0;
  wordsA.forEach((w) => { if (wordsB.has(w)) overlap++; });
  return overlap / Math.max(wordsA.size, 1);
}

function findBestAnswer(query: string, faq: any[]): { answer: string; confidence: "high" | "medium" | "low" } | null {
  const q = query.toLowerCase().replace(/[؟?!،.]/g, "").trim();
  if (!q) return null;

  let best: { answer: string; score: number } | null = null;
  for (const item of faq) {
    const score = Math.max(similarity(q, item.question), similarity(q, item.answer) * 0.5);
    if (!best || score > best.score) best = { answer: item.answer, score };
  }

  if (!best || best.score < 0.15) return null;
  if (best.score >= 0.5) return { answer: best.answer, confidence: "high" };
  if (best.score >= 0.3) return { answer: best.answer, confidence: "medium" };
  return { answer: best.answer, confidence: "low" };
}

const fallbackAR = "مش فاهم السؤال بالظبط 🤔 جرّب تكتب السؤال بشكل أوضح، أو تواصل مع الدعم الفني عبر زر الواتساب.";
const fallbackEN = "I didn't quite understand. Try rephrasing your question, or reach out via the WhatsApp button.";

export const Route = createFileRoute("/api/chatbot")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        let parsed: Body;
        try {
          parsed = (await request.json()) as Body;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const { messages, lang } = parsed;
        if (!Array.isArray(messages) || messages.length === 0) {
          return new Response("Invalid messages payload", { status: 400 });
        }

        const lastMsg = messages[messages.length - 1];
        const userText = typeof lastMsg === "object" && lastMsg !== null
          ? (lastMsg as any).content || (lastMsg as any).text || ""
          : String(lastMsg);

        const faq = await loadFaq();
        const result = findBestAnswer(userText, faq);

        let reply: string;
        if (result) {
          reply = result.answer;
          if (result.confidence === "low") {
            reply += `\n\n_${lang === "en" ? "(I'm not fully sure this answers your question)" : "(مش متأكد إن الإجابة دي بالظبط اللي بتدور عليه)"}_`;
          }
        } else {
          reply = lang === "en" ? fallbackEN : fallbackAR;
        }

        // Return as a simple JSON response that the client can parse
        return new Response(JSON.stringify({
          role: "assistant",
          content: reply,
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
