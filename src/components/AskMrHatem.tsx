import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { uploadToCloudinary } from "@/lib/cloudinary-upload";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import {
  MessageCircleQuestion, ImagePlus, Mic, Square, Send,
  ChevronLeft, ChevronRight, Loader2, Trash2, Volume2, X, Upload,
} from "lucide-react";
import { toast } from "sonner";
import useEmblaCarousel from "embla-carousel-react";
import { useApp } from "@/lib/providers";

const tr = (ar: string, en: string, lang: "ar" | "en") => (lang === "ar" ? ar : en);


const BUCKET = "qna-media";

type QnaQuestion = {
  id: string;
  title: string;
  body: string;
  image_path: string | null;
  voice_path: string | null;
  guest_name: string | null;
  created_at: string;
};
type QnaReply = {
  id: string;
  question_id: string;
  body: string;
  image_path: string | null;
  voice_path: string | null;
  created_at: string;
};

function publicUrl(path: string | null) {
  if (!path) return null;
  return path.startsWith("http") ? path : supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/* ---------------- Voice recorder (public) ---------------- */
function VoiceRecorder({
  value, onChange, disabled,
}: { value: string | null; onChange: (p: string | null) => void; disabled?: boolean }) {
  const { lang } = useApp();
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const upload = async (blob: Blob, _ext: string) => {
    setUploading(true);
    try {
      const r = await uploadToCloudinary(blob, BUCKET);
      onChange(r.secure_url);
    } catch (e: any) {
      toast.error(e?.message ?? tr("فشل رفع الصوت", "Failed to upload audio", lang));
    } finally {
      setUploading(false);
    }
  };

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error(tr("المتصفح ما يدعمش التسجيل — ارفع ملف صوتي بدل كده", "Your browser doesn't support recording — upload an audio file instead", lang));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        upload(new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" }), "webm");
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
    } catch (e: any) {
      const name = e?.name || "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        toast.error(tr("لازم تسمح بالميكروفون من المتصفح. اضغط على أيقونة القفل بجانب الرابط واسمح بالميكروفون — أو ارفع ملف صوتي.", "Microphone permission required. Click the lock icon next to the URL and allow the microphone — or upload an audio file.", lang));
      } else if (name === "NotFoundError") {
        toast.error(tr("مفيش ميكروفون متوصّل بالجهاز — جرّب ترفع ملف صوتي.", "No microphone detected — try uploading an audio file.", lang));
      } else {
        toast.error(tr("متقدرش توصل للمايك — جرّب ترفع ملف صوتي بدل كده.", "Can't access the microphone — try uploading an audio file.", lang));
      }
    }
  };
  const stop = () => { mediaRef.current?.stop(); mediaRef.current = null; setRecording(false); };

  const onPickFile = (f: File) => {
    if (f.size > 10 * 1024 * 1024) { toast.error(tr("الملف أكبر من 10MB", "File larger than 10MB", lang)); return; }
    upload(f, f.name.split(".").pop() || "mp3");
  };

  const url = publicUrl(value);
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        {!recording ? (
          <Button type="button" size="sm" variant="outline" onClick={start} disabled={disabled || uploading} className="gap-1.5">
            <Mic className="h-4 w-4" /> {tr("سجّل صوتك", "Record voice", lang)}
          </Button>
        ) : (
          <Button type="button" size="sm" variant="destructive" onClick={stop} className="gap-1.5 animate-pulse">
            <Square className="h-4 w-4" /> {tr("إيقاف", "Stop", lang)}
          </Button>
        )}
        <label className={`cursor-pointer inline-flex items-center gap-1.5 text-sm px-3 py-1.5 border rounded-md hover:bg-accent ${disabled || uploading ? "opacity-50 pointer-events-none" : ""}`}>
          <Upload className="h-4 w-4" /> {tr("ملف صوتي", "Audio file", lang)}
          <input type="file" accept="audio/*" className="hidden" onChange={(e) => {
            const f = e.target.files?.[0]; if (f) onPickFile(f);
          }} />
        </label>
        {uploading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
        {value && !recording && (
          <Button type="button" size="icon" variant="ghost" onClick={() => onChange(null)} className="text-destructive h-8 w-8">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
      {url && <audio controls src={url} className="w-full" />}
    </div>
  );
}

/* ---------------- Image upload (public) ---------------- */
function ImageUpload({
  value, onChange, disabled,
}: { value: string | null; onChange: (p: string | null) => void; disabled?: boolean }) {
  const { lang } = useApp();
  const [uploading, setUploading] = useState(false);
  const url = publicUrl(value);

  const handle = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { toast.error(tr("الحجم أكبر من 5MB", "File larger than 5MB", lang)); return; }
    setUploading(true);
    try {
      const r = await uploadToCloudinary(file, BUCKET);
      onChange(r.secure_url);
    } catch (e: any) {
      toast.error(e?.message ?? tr("فشل رفع الصورة", "Failed to upload image", lang));
    } finally { setUploading(false); }
  };

  return (
    <div className="space-y-2">
      <label className={`cursor-pointer inline-flex items-center gap-1.5 text-sm px-3 py-1.5 border rounded-md hover:bg-accent ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
        <ImagePlus className="h-4 w-4" /> {tr("إرفاق صورة", "Attach image", lang)}
        <input type="file" accept="image/*" className="hidden" onChange={(e) => {
          const f = e.target.files?.[0]; if (f) handle(f);
        }} />
      </label>
      {uploading && <Loader2 className="h-4 w-4 animate-spin text-primary inline-block ms-2" />}
      {url && (
        <div className="relative inline-block">
          <img src={url} alt="" className="max-h-32 rounded-lg border" />
          <button type="button" onClick={() => onChange(null)} className="absolute -top-2 -end-2 bg-destructive text-white rounded-full p-1 shadow">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------------- Ask Dialog ---------------- */
function AskDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { lang } = useApp();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [voicePath, setVoicePath] = useState<string | null>(null);

  const reset = () => { setName(""); setBody(""); setImagePath(null); setVoicePath(null); };

  const submit = useMutation({
    mutationFn: async () => {
      if (!body.trim() && !imagePath && !voicePath) throw new Error(tr("اكتب سؤالك أو ارفع صورة/صوت", "Write your question or upload image/audio", lang));
      const title = body.trim().slice(0, 80) || (imagePath ? tr("سؤال بصورة", "Image question", lang) : tr("سؤال صوتي", "Voice question", lang));
      const { error } = await supabase.from("qna_questions").insert({
        title,
        body: body.trim() || "",
        guest_name: name.trim() || null,
        image_path: imagePath,
        voice_path: voicePath,
        is_public: true,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(tr("تم إرسال سؤالك! هيتم الرد قريباً", "Your question was sent! You'll get a reply soon", lang));
      reset();
      onOpenChange(false);
      qc.invalidateQueries({ queryKey: ["public-qna"] });
    },
    onError: (e: any) => toast.error(e?.message ?? tr("فشل الإرسال", "Failed to send", lang)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <MessageCircleQuestion className="h-5 w-5 text-primary" /> {tr("اسأل مستر حاتم", "Ask Mr. Hatem", lang)}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input placeholder={tr("اسمك (اختياري)", "Your name (optional)", lang)} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
          <Textarea
            placeholder={tr("اكتب سؤالك هنا...", "Write your question here...", lang)}
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={1000}
          />
          <div className="grid sm:grid-cols-2 gap-3 p-3 rounded-xl bg-muted/40 border border-dashed">
            <ImageUpload value={imagePath} onChange={setImagePath} disabled={submit.isPending} />
            <VoiceRecorder value={voicePath} onChange={setVoicePath} disabled={submit.isPending} />
          </div>
          <Button onClick={() => submit.mutate()} disabled={submit.isPending} className="w-full h-11 text-base gap-2">
            {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {tr("ابعت السؤال", "Send question", lang)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Question Card ---------------- */
function QACard({ q, reply }: { q: QnaQuestion; reply?: QnaReply }) {
  const { lang } = useApp();
  const qImg = publicUrl(q.image_path);
  const qVoice = publicUrl(q.voice_path);
  const rImg = publicUrl(reply?.image_path ?? null);
  const rVoice = publicUrl(reply?.voice_path ?? null);

  return (
    <Card className="h-full p-6 flex flex-col gap-4 bg-gradient-to-br from-card to-muted/30 border-2 border-primary/10 hover:border-primary/30 transition shadow-card">
      {/* Question */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-primary">
          <div className="h-7 w-7 rounded-full bg-primary/15 grid place-items-center">
            <MessageCircleQuestion className="h-4 w-4" />
          </div>
          {q.guest_name || tr("طالب", "Student", lang)} {tr("يسأل", "asks", lang)}
        </div>
        {q.body && <p className="text-sm font-medium leading-relaxed line-clamp-3">{q.body}</p>}
        {qImg && <img src={qImg} alt="" className="rounded-lg max-h-32 object-cover w-full" />}
        {qVoice && (
          <div className="flex items-center gap-2 text-xs bg-muted/60 rounded-md p-2">
            <Volume2 className="h-3.5 w-3.5 text-primary" />
            <audio controls src={qVoice} className="h-7 flex-1" />
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      {/* Reply */}
      <div className="space-y-2 flex-1">
        <div className="flex items-center gap-2 text-xs font-semibold text-brand-red">
          <div className="h-7 w-7 rounded-full bg-brand-red/15 grid place-items-center">
            <MessageCircleQuestion className="h-4 w-4" />
          </div>
          {tr("مستر حاتم يجيب", "Mr. Hatem answers", lang)}
        </div>
        {reply?.body && <p className="text-sm leading-relaxed line-clamp-4">{reply.body}</p>}
        {rImg && <img src={rImg} alt="" className="rounded-lg max-h-32 object-cover w-full" />}
        {rVoice && (
          <div className="flex items-center gap-2 text-xs bg-brand-red/5 rounded-md p-2">
            <Volume2 className="h-3.5 w-3.5 text-brand-red" />
            <audio controls src={rVoice} className="h-7 flex-1" />
          </div>
        )}
      </div>
    </Card>
  );
}

/* ---------------- Main Section ---------------- */
export function AskMrHatem() {
  const { lang } = useApp();
  const [open, setOpen] = useState(false);
  const [emblaRef, embla] = useEmblaCarousel({ loop: false, align: "start", direction: lang === "ar" ? "rtl" : "ltr" });

  const { data: questions } = useQuery({
    queryKey: ["public-qna"],
    queryFn: async () => {
      const { data } = await supabase
        .from("qna_questions")
        .select("id,title,body,image_path,voice_path,guest_name,created_at")
        .eq("is_public", true)
        .eq("status", "answered")
        .order("created_at", { ascending: false })
        .limit(20);
      return (data ?? []) as QnaQuestion[];
    },
  });

  const ids = useMemo(() => (questions ?? []).map((q) => q.id), [questions]);
  const { data: replies } = useQuery({
    queryKey: ["public-qna-replies", ids.join(",")],
    queryFn: async () => {
      if (!ids.length) return [] as QnaReply[];
      const { data } = await supabase
        .from("qna_replies")
        .select("id,question_id,body,image_path,voice_path,created_at")
        .in("question_id", ids)
        .eq("is_admin_reply", true)
        .order("created_at", { ascending: true });
      return (data ?? []) as QnaReply[];
    },
    enabled: ids.length > 0,
  });

  const replyByQ = useMemo(() => {
    const m = new Map<string, QnaReply>();
    (replies ?? []).forEach((r) => { if (!m.has(r.question_id)) m.set(r.question_id, r); });
    return m;
  }, [replies]);

  return (
    <section id="ask" className="py-20 lg:py-24">
      <div className="container mx-auto px-4">
        <div className="relative overflow-hidden rounded-[2rem] bg-surface border border-accent/30 p-8 lg:p-12 shadow-card">
          {/* decorative bg */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-20 -end-20 w-60 h-60 rounded-full bg-brand-gold/10 blur-3xl" />
            <div className="absolute -bottom-20 -start-20 w-60 h-60 rounded-full bg-brand-red/5 blur-3xl" />
          </div>
          <div className="relative">
            {/* header */}
            <div className="text-center max-w-2xl mx-auto text-foreground mb-10">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">
                {tr("اسأل و اتعلم", "Ask & learn", lang)}
              </div>
              <h2 className="font-display text-3xl lg:text-5xl font-bold leading-tight text-foreground">
                {lang === "ar" ? (
                  <>عندك سؤال؟ <span className="text-brand-red">مستر حاتم</span> هيرد عليك</>
                ) : (
                  <>Got a question? <span className="text-brand-red">Mr. Hatem</span> will answer you</>
                )}
              </h2>
              <p className="mt-4 text-foreground/75 leading-relaxed text-base lg:text-lg">
                {tr(
                  "ابعت سؤالك كتابة، صورة أو رسالة صوتية — والإجابة تظهر هنا لكل الطلاب. مفيش اشتراك، أي حد يقدر يسأل.",
                  "Send your question as text, image, or voice — the answer appears here for everyone. No subscription needed, anyone can ask.",
                  lang,
                )}
              </p>
              <Button
                onClick={() => setOpen(true)}
                size="lg"
                className="mt-6 bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-8 text-base shadow-elegant gap-2"
              >
                <MessageCircleQuestion className="h-5 w-5" /> {tr("اسأل سؤالك دلوقتي", "Ask your question now", lang)}
              </Button>
            </div>

            {/* slider */}
            {questions && questions.length > 0 ? (
              <div className="relative">
                <div className="flex items-center justify-between mb-4 text-foreground">
                  <h3 className="font-display text-lg font-semibold">{tr("آخر الأسئلة المُجاب عليها", "Latest answered questions", lang)}</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => embla?.scrollPrev()}
                      className="h-9 w-9 grid place-items-center rounded-full bg-primary/10 hover:bg-primary/20 backdrop-blur transition text-foreground"
                      aria-label={tr("السابق", "Previous", lang)}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => embla?.scrollNext()}
                      className="h-9 w-9 grid place-items-center rounded-full bg-primary/10 hover:bg-primary/20 backdrop-blur transition text-foreground"
                      aria-label={tr("التالي", "Next", lang)}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                <div ref={emblaRef} className="overflow-hidden">
                  <div className="flex gap-4" style={{ direction: lang === "ar" ? "rtl" : "ltr" }}>
                    {questions.map((q) => (
                      <div key={q.id} className="flex-[0_0_100%] sm:flex-[0_0_60%] lg:flex-[0_0_38%] min-w-0">
                        <QACard q={q} reply={replyByQ.get(q.id)} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-foreground/60 text-sm py-8">
                {tr("لسه مفيش أسئلة مُجاب عليها — كن أول من يسأل!", "No answered questions yet — be the first to ask!", lang)}
              </div>
            )}
          </div>
        </div>
      </div>

      <AskDialog open={open} onOpenChange={setOpen} />
    </section>
  );
}
