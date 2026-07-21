import { useEffect, useRef, useState } from "react";
import { X, Send, Bot, Loader2 } from "lucide-react";
import { useApp } from "@/lib/providers";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";


const WhatsAppIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 32 32" className={className} aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
    <path
      fill="currentColor"
      d="M16.003 3C8.82 3 3 8.82 3 16c0 2.292.6 4.523 1.74 6.49L3 29l6.69-1.75A12.93 12.93 0 0 0 16.003 29C23.18 29 29 23.18 29 16S23.18 3 16.003 3Zm0 23.6c-1.99 0-3.93-.54-5.63-1.55l-.4-.24-3.97 1.04 1.06-3.87-.26-.4A10.55 10.55 0 0 1 5.4 16c0-5.85 4.76-10.6 10.6-10.6 5.85 0 10.6 4.75 10.6 10.6s-4.75 10.6-10.6 10.6Zm6.11-7.94c-.33-.17-1.97-.97-2.27-1.08-.3-.11-.53-.17-.75.17-.22.33-.86 1.08-1.05 1.3-.19.22-.39.25-.72.08-.33-.17-1.4-.52-2.66-1.65-.98-.87-1.65-1.95-1.85-2.28-.19-.33-.02-.51.14-.68.15-.15.33-.39.5-.58.17-.2.22-.33.33-.55.11-.22.06-.41-.03-.58-.08-.17-.75-1.81-1.03-2.48-.27-.65-.55-.56-.75-.57l-.64-.01c-.22 0-.58.08-.88.41-.3.33-1.16 1.14-1.16 2.77 0 1.63 1.19 3.21 1.36 3.43.17.22 2.34 3.58 5.68 5.02.79.34 1.41.54 1.9.69.8.25 1.53.22 2.1.13.64-.1 1.97-.81 2.25-1.59.28-.78.28-1.45.2-1.59-.08-.14-.3-.22-.63-.39Z"
    />
  </svg>
);

type ChatMsg = { role: "user" | "assistant"; content: string };

export function SupportWidget() {
  const { lang } = useApp();
  const isAr = lang === "ar";
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: settings } = useQuery({
    queryKey: ["public-settings-wa"],
    queryFn: async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("key,value")
        .in("key", ["social", "general", "content"]);
      const map: Record<string, any> = {};
      (data ?? []).forEach((r: any) => (map[r.key] = r.value ?? {}));
      return map as { social?: { whatsapp?: string }; general?: { supportPhone?: string; support_phone?: string }; content?: { whatsapp?: string } };
    },
  });

  const normalize = (raw: string) => {
    const d = (raw ?? "").replace(/[^\d]/g, "");
    if (!d) return "";
    if (d.startsWith("00")) return d.slice(2);
    if (d.startsWith("0")) return "20" + d.slice(1);
    return d;
  };
  const waNumber = normalize(
    settings?.social?.whatsapp ||
      settings?.content?.whatsapp ||
      settings?.general?.supportPhone ||
      settings?.general?.support_phone ||
      "",
  );
  const waLink = waNumber
    ? `https://wa.me/${waNumber}?text=${encodeURIComponent(
        isAr ? "السلام عليكم، عندي استفسار في المنصة" : "Hello, I have a question about the platform",
      )}`
    : "";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  const onSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    const userMsg: ChatMsg = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    try {
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMsg], lang }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.content || "..." }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: isAr ? "حصلت مشكلة. جرّب تاني." : "Something went wrong. Try again." }]);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <>
      <a
        href={waLink || "https://wa.me/"}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="WhatsApp"
        className={`fixed bottom-5 ${isAr ? "right-5" : "left-5"} z-[60] h-12 w-12 rounded-full bg-[#25D366] text-white shadow-xl hover:scale-110 transition grid place-items-center ring-2 ring-[#25D366]/25 animate-wa-shake`}
      >
        <span className="pointer-events-none absolute inset-0 rounded-full bg-[#25D366] animate-wa-ping" aria-hidden="true" />
        <span
          className="pointer-events-none absolute inset-0 rounded-full bg-[#25D366] animate-wa-ping"
          style={{ animationDelay: "1.1s" }}
          aria-hidden="true"
        />
        <WhatsAppIcon className="relative h-6 w-6" />
      </a>

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={isAr ? "المساعد الذكي" : "AI Assistant"}
        className={`fixed bottom-5 ${isAr ? "left-5" : "right-5"} z-[60] h-16 w-16 rounded-full bg-gradient-to-br from-primary via-primary to-emerald-500 text-primary-foreground shadow-2xl hover:scale-110 transition grid place-items-center ring-4 ring-primary/20 ${!open ? "animate-bot-bob" : ""}`}
      >
        {!open && (
          <>
            <span aria-hidden="true" className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 animate-bot-antenna-left">
              <span className="block h-3 w-[3px] rounded-full bg-emerald-300 shadow-[0_0_8px_2px_rgba(110,231,183,0.7)]" />
              <span className="block h-2 w-2 -mt-1 mx-auto rounded-full bg-emerald-300 shadow-[0_0_10px_3px_rgba(110,231,183,0.8)]" />
            </span>
            <span aria-hidden="true" className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 animate-bot-antenna-right" style={{ animationDelay: "0.15s" }}>
              <span className="block h-3 w-[3px] rounded-full bg-emerald-300 shadow-[0_0_8px_2px_rgba(110,231,183,0.7)]" />
              <span className="block h-2 w-2 -mt-1 mx-auto rounded-full bg-emerald-300 shadow-[0_0_10px_3px_rgba(110,231,183,0.8)]" />
            </span>
          </>
        )}
        {open ? <X className="h-7 w-7" /> : <Bot className="h-8 w-8" />}
        {!open && (
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-emerald-400 border-2 border-background" />
        )}
      </button>

      {open && (
        <div
          className={`fixed bottom-24 ${isAr ? "left-5" : "right-5"} z-[60] w-[92vw] max-w-sm rounded-2xl border bg-background shadow-2xl overflow-hidden flex flex-col`}
          style={{ maxHeight: "min(560px, 80vh)" }}
        >
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-display font-bold text-base">
                  {isAr ? "الدعم الفني" : "Support"}
                </div>
                <div className="text-xs opacity-90">
                  {isAr ? "متواجدون لمساعدتك" : "We're here to help"}
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="opacity-80 hover:opacity-100">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
            {messages.length === 0 && (
              <div className="text-center py-6 text-sm text-muted-foreground">
                {isAr
                  ? "أهلاً 👋 اسأل عن أي حاجة في المنصة وأنا هرد عليك."
                  : "Hi 👋 ask me anything about the platform."}
              </div>
            )}
            {messages.map((m, i) => {
              const isUser = m.role === "user";
              return (
                <div key={i} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                      isUser
                        ? "bg-primary text-primary-foreground rounded-br-sm whitespace-pre-wrap"
                        : "bg-background border rounded-bl-sm"
                    }`}
                  >
                    {isUser ? (
                      m.content || <span className="opacity-60">...</span>
                    ) : m.content ? (
                      <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-headings:my-1">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <span className="opacity-60">...</span>
                    )}
                  </div>
                </div>
              );
            })}
            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                {isAr ? "جاري التفكير..." : "Thinking..."}
              </div>
            )}
          </div>

          <div className="border-t p-3 bg-background">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onSend();
                  }
                }}
                rows={1}
                placeholder={isAr ? "اكتب سؤالك..." : "Type your question..."}
                className="flex-1 resize-none rounded-xl border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 max-h-24"
              />
              <button
                onClick={onSend}
                disabled={!input.trim() || isLoading}
                className="h-9 w-9 rounded-full bg-primary text-primary-foreground grid place-items-center disabled:opacity-50 hover:scale-110 transition"
                aria-label="Send"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
