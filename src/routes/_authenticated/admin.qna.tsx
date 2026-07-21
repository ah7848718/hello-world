import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { uploadToCloudinary } from "@/lib/cloudinary-upload";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { replyToQuestion, updateQuestionStatus } from "@/lib/qna.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, Pin, Lock, Globe, Loader2, Send, ImagePlus, Mic, Square, Trash2, X, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { useRef } from "react";

const MEDIA_BUCKET = "qna-media";
const mediaUrl = (p: string | null | undefined) =>
  p ? (p.startsWith("http") ? p : supabase.storage.from(MEDIA_BUCKET).getPublicUrl(p).data.publicUrl) : null;

export const Route = createFileRoute("/_authenticated/admin/qna")({
  component: Page,
  head: () => ({ meta: [{ title: "الأسئلة والاستفسارات | لوحة الإدارة" }] }),
});

function Page() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"open" | "answered" | "closed" | "all">("open");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [replyImage, setReplyImage] = useState<string | null>(null);
  const [replyVoice, setReplyVoice] = useState<string | null>(null);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [uploadingVoice, setUploadingVoice] = useState(false);
  const [recording, setRecording] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const uploadFile = async (blob: Blob, ext: string, kind: "img" | "voice") => {
    const r = await uploadToCloudinary(blob, MEDIA_BUCKET);
    return r.secure_url;
  };

  const onPickImage = async (f: File) => {
    if (f.size > 5 * 1024 * 1024) return toast.error("الحجم أكبر من 5MB");
    setUploadingImg(true);
    try { setReplyImage(await uploadFile(f, f.name.split(".").pop() || "jpg", "img")); }
    catch (e: any) { toast.error(e?.message ?? "فشل الرفع"); }
    finally { setUploadingImg(false); }
  };

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setUploadingVoice(true);
        try {
          const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
          setReplyVoice(await uploadFile(blob, "webm", "voice"));
        } catch (e: any) { toast.error(e?.message ?? "فشل رفع الصوت"); }
        finally { setUploadingVoice(false); }
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
    } catch { toast.error("متقدرش توصل للمايك"); }
  };
  const stopRec = () => { mediaRef.current?.stop(); mediaRef.current = null; setRecording(false); };

    
  const { data: questions, isLoading } = useQuery({
    queryKey: ["admin-qna", filter],
    queryFn: async () => {
      let q = supabase.from("qna_questions").select("*").order("is_pinned", { ascending: false }).order("created_at", { ascending: false });
      if (filter !== "all") q = q.eq("status", filter);
      const { data } = await q.limit(100);
      return data ?? [];
    },
  });

  const studentIds = Array.from(new Set((questions ?? []).map((q: any) => q.student_id).filter(Boolean))) as string[];
  const { data: profileMap } = useQuery({
    queryKey: ["qna-profiles", studentIds.join(",")],
    queryFn: async () => {
      if (!studentIds.length) return {} as Record<string, any>;
      const { data } = await supabase.from("profiles").select("id, full_name, email").in("id", studentIds);
      return Object.fromEntries((data ?? []).map((p: any) => [p.id, p]));
    },
    enabled: studentIds.length > 0,
  });

  const withProfile = (q: any) => ({ ...q, profiles: profileMap?.[q.student_id] });
  const selected = questions?.find((q: any) => q.id === selectedId);
  const selectedWP = selected ? withProfile(selected) : null;

  const { data: replies } = useQuery({
    queryKey: ["qna-replies", selectedId],
    queryFn: async () => {
      if (!selectedId) return [];
      const { data } = await supabase.from("qna_replies").select("*").eq("question_id", selectedId).order("created_at");
      return data ?? [];
    },
    enabled: !!selectedId,
  });

  const sendReply = useMutation({
    mutationFn: async () => {
      if (!selectedId) return;
      await replyFn({ data: { question_id: selectedId, body: reply, image_path: replyImage, voice_path: replyVoice, mark_answered: true, make_public: true } });
    },
    onSuccess: () => {
      toast.success("تم إرسال الرد");
      setReply(""); setReplyImage(null); setReplyVoice(null);
      qc.invalidateQueries({ queryKey: ["qna-replies", selectedId] });
      qc.invalidateQueries({ queryKey: ["admin-qna"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "فشل الإرسال"),
  });

  const updateStatus = useMutation({
    mutationFn: async (patch: { status?: any; is_pinned?: boolean; is_public?: boolean }) => {
      if (!selectedId) return;
      await updateFn({ data: { id: selectedId, ...patch } });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-qna"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">الأسئلة والاستفسارات</h1>
          <p className="text-muted-foreground mt-1 text-sm">رد على أسئلة الطلاب وأدر النقاش.</p>
        </div>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
          <TabsList>
            <TabsTrigger value="open">مفتوحة</TabsTrigger>
            <TabsTrigger value="answered">تم الرد</TabsTrigger>
            <TabsTrigger value="closed">مغلقة</TabsTrigger>
            <TabsTrigger value="all">الكل</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2 space-y-2 max-h-[75vh] overflow-y-auto pr-1">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : !questions?.length ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">
              <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-40" />
              لا توجد أسئلة
            </CardContent></Card>
          ) : (
            questions.map((q: any) => (
              <Card key={q.id} className={`cursor-pointer transition ${selectedId === q.id ? "border-primary" : "hover:border-muted-foreground/30"}`} onClick={() => setSelectedId(q.id)}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start gap-2">
                    {q.is_pinned && <Pin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />}
                    <h3 className="font-semibold text-sm flex-1 line-clamp-2">{q.title}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{q.body}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{q.guest_name || profileMap?.[q.student_id]?.full_name || "زائر"}{(q.image_path || q.voice_path) ? " · 📎" : ""}</span>
                    <Badge variant={q.status === "open" ? "default" : q.status === "answered" ? "secondary" : "outline"} className="text-[10px]">
                      {q.status === "open" ? "مفتوح" : q.status === "answered" ? "تم الرد" : "مغلق"}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(q.created_at), { addSuffix: true, locale: ar })}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="lg:col-span-3">
          {!selected ? (
            <Card><CardContent className="p-12 text-center text-muted-foreground">
              اختر سؤالاً لعرض التفاصيل
            </CardContent></Card>
          ) : (
            <Card>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h2 className="font-display font-bold text-lg">{selected.title}</h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      {selected.guest_name || selectedWP?.profiles?.full_name || "زائر"} · {formatDistanceToNow(new Date(selected.created_at), { addSuffix: true, locale: ar })}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => updateStatus.mutate({ is_pinned: !selected.is_pinned })} title="تثبيت">
                      <Pin className={`h-4 w-4 ${selected.is_pinned ? "text-primary" : ""}`} />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => updateStatus.mutate({ is_public: !selected.is_public })} title="عام">
                      <Globe className={`h-4 w-4 ${selected.is_public ? "text-primary" : ""}`} />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => updateStatus.mutate({ status: "closed" })} title="إغلاق">
                      <Lock className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                  <p className="text-sm whitespace-pre-wrap">{selected.body}</p>
                  {selected.image_path && (
                    <img src={mediaUrl(selected.image_path)!} alt="" className="rounded-lg max-h-64 border" />
                  )}
                  {selected.voice_path && (
                    <div className="flex items-center gap-2 bg-background rounded-md p-2">
                      <Volume2 className="h-4 w-4 text-primary" />
                      <audio controls src={mediaUrl(selected.voice_path)!} className="h-8 flex-1" />
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">الردود ({replies?.length ?? 0})</h3>
                  {replies?.map((r: any) => (
                    <div key={r.id} className={`rounded-lg border p-3 space-y-2 ${r.is_admin_reply ? "bg-primary/5 border-primary/20" : ""}`}>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{r.is_admin_reply ? "الإدارة" : "الطالب"}</span>
                        <span>{formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: ar })}</span>
                      </div>
                      {r.body && <p className="text-sm whitespace-pre-wrap">{r.body}</p>}
                      {r.image_path && <img src={mediaUrl(r.image_path)!} alt="" className="rounded-lg max-h-48 border" />}
                      {r.voice_path && <audio controls src={mediaUrl(r.voice_path)!} className="w-full h-8" />}
                    </div>
                  ))}
                </div>

                <div className="space-y-3 border-t pt-4">
                  <Textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={3} placeholder="اكتب ردك..." maxLength={5000} />

                  <div className="flex flex-wrap items-center gap-2">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 text-sm px-3 py-1.5 border rounded-md hover:bg-accent">
                      <ImagePlus className="h-4 w-4" /> صورة
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                        const f = e.target.files?.[0]; if (f) onPickImage(f);
                      }} />
                    </label>
                    {uploadingImg && <Loader2 className="h-4 w-4 animate-spin" />}
                    {replyImage && (
                      <div className="relative">
                        <img src={mediaUrl(replyImage)!} alt="" className="h-12 w-12 object-cover rounded-md border" />
                        <button onClick={() => setReplyImage(null)} className="absolute -top-1 -end-1 bg-destructive text-white rounded-full p-0.5">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    )}

                    {!recording ? (
                      <Button type="button" size="sm" variant="outline" onClick={startRec} className="gap-1.5">
                        <Mic className="h-4 w-4" /> صوت
                      </Button>
                    ) : (
                      <Button type="button" size="sm" variant="destructive" onClick={stopRec} className="gap-1.5 animate-pulse">
                        <Square className="h-4 w-4" /> إيقاف
                      </Button>
                    )}
                    {uploadingVoice && <Loader2 className="h-4 w-4 animate-spin" />}
                    {replyVoice && !recording && (
                      <div className="flex items-center gap-1">
                        <audio controls src={mediaUrl(replyVoice)!} className="h-8" />
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setReplyVoice(null)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <Button onClick={() => sendReply.mutate()} disabled={(!reply && !replyImage && !replyVoice) || sendReply.isPending} className="w-full">
                    {sendReply.isPending ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <Send className="h-4 w-4 me-2" />}
                    إرسال الرد و نشره
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
