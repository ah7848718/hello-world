import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Plus, Trash2, ArrowRight, Save, ImageIcon, Video } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AudioRecorder } from "@/components/AudioRecorder";
import { MediaUploader } from "@/components/MediaUploader";
import { uploadToCloudinary } from "@/lib/cloudinary-upload";

function getMediaUrl(val: string | null, bucket: string): string | null {
  if (!val) return null;
  if (val.startsWith("http://") || val.startsWith("https://")) return val;
  return supabase.storage.from(bucket).getPublicUrl(val).data.publicUrl;
}

export const Route = createFileRoute("/_authenticated/admin/exams/$examId")({
  component: AdminExamEditPage,
  head: () => ({ meta: [{ title: "تعديل امتحان" }] }),
});

type QuestionType = "mcq" | "true_false" | "essay";

function AdminExamEditPage() {
  const { examId } = Route.useParams();
  const nav = useNavigate();

  useEffect(() => {
    if (examId === "new") {
      nav({ to: "/admin/exams/new", replace: true });
    }
  }, [examId, nav]);

  if (examId === "new") return null;

  return (
    <div className="container max-w-5xl mx-auto px-4 py-8">
      <Button asChild variant="ghost" className="mb-4 gap-1">
        <Link to="/admin/exams"><ArrowRight className="h-4 w-4" /> رجوع</Link>
      </Button>
      <Tabs defaultValue="questions">
        <TabsList>
          <TabsTrigger value="questions">الأسئلة</TabsTrigger>
          <TabsTrigger value="attempts">محاولات الطلاب</TabsTrigger>
        </TabsList>
        <TabsContent value="questions" className="mt-6"><QuestionsEditor examId={examId} /></TabsContent>
        <TabsContent value="attempts" className="mt-6"><AttemptsList examId={examId} /></TabsContent>
      </Tabs>
    </div>
  );
}

function QuestionsEditor({ examId }: { examId: string }) {
  const qc = useQueryClient();
  const { data: exam } = useQuery({
    queryKey: ["exam", examId],
    queryFn: async () => {
      const { data, error } = await supabase.from("exams").select("*").eq("id", examId).single();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: questions, isLoading } = useQuery({
    queryKey: ["exam-questions", examId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("questions").select("*, question_options(*)").eq("exam_id", examId).order("order_index");
      if (error) throw error;
      return data as any[];
    },
  });

  const [allowMultipleAttempts, setAllowMultipleAttempts] = useState(exam?.allow_multiple_attempts ?? false);
  const [maxAttempts, setMaxAttempts] = useState(exam?.max_attempts ? String(exam.max_attempts) : "");
  const [cycleModels, setCycleModels] = useState(exam?.cycle_models ?? false);
  const [examCategory, setExamCategory] = useState<"regular" | "comprehensive">(exam?.exam_category ?? "regular");
  const [activeModel, setActiveModel] = useState<string>("all");

  useEffect(() => {
    if (exam) {
      setAllowMultipleAttempts(exam.allow_multiple_attempts ?? false);
      setMaxAttempts(exam.max_attempts ? String(exam.max_attempts) : "");
      setCycleModels(exam.cycle_models ?? false);
      setExamCategory(exam.exam_category ?? "regular");
    }
  }, [exam]);

  const saveSettings = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("exams").update({
        allow_multiple_attempts: allowMultipleAttempts,
        max_attempts: maxAttempts ? Number(maxAttempts) : null,
        instant_result: examCategory === "regular",
        cycle_models: cycleModels,
        exam_category: examCategory,
      } as any).eq("id", examId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("تم حفظ الإعدادات"); setTimeout(() => qc.invalidateQueries({ queryKey: ["exam", examId] }), 0); },
  });

  const addQ = useMutation({
    mutationFn: async (type: QuestionType) => {
      const order = (questions?.length ?? 0) + 1;
      const { data, error } = await supabase.from("questions").insert({
        exam_id: examId, type, text: "سؤال جديد", points: 1, order_index: order,
      }).select("id").single();
      if (error) throw error;
      if (type === "true_false") {
        await supabase.from("question_options").insert([
          { question_id: data.id, text: "صح", is_correct: true, order_index: 1 },
          { question_id: data.id, text: "خطأ", is_correct: false, order_index: 2 },
        ]);
      } else if (type === "mcq") {
        await supabase.from("question_options").insert([
          { question_id: data.id, text: "اختيار 1", order_index: 1 },
          { question_id: data.id, text: "اختيار 2", order_index: 2 },
        ]);
      }
    },
    onSuccess: () => setTimeout(() => qc.invalidateQueries({ queryKey: ["exam-questions", examId] }), 0),
  });

  const models = [...new Set(questions?.map((q: any) => q.model || "A") ?? [])].sort() as string[];
  const filteredQuestions = activeModel === "all" ? questions : questions?.filter((q: any) => (q.model || "A") === activeModel);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="font-bold text-lg">{exam?.title}</h2>
            <p className="text-sm text-muted-foreground">{questions?.length ?? 0} سؤال</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => addQ.mutate("mcq")}><Plus className="h-4 w-4 me-1" /> MCQ</Button>
            <Button size="sm" variant="outline" onClick={() => addQ.mutate("true_false")}><Plus className="h-4 w-4 me-1" /> صح/خطأ</Button>
            <Button size="sm" variant="outline" onClick={() => addQ.mutate("essay")}><Plus className="h-4 w-4 me-1" /> مقالي</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">إعدادات الامتحان</h3>
            <Button size="sm" variant="outline" onClick={() => saveSettings.mutate()} disabled={saveSettings.isPending} className="gap-1">
              {saveSettings.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              حفظ الإعدادات
            </Button>
          </div>
          <div className="space-y-3">
            <div>
              <Label>تصنيف الامتحان</Label>
              <Select value={examCategory} onValueChange={(v: "regular" | "comprehensive") => setExamCategory(v)}>
                <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">امتحان عادي (نتيجة فورية + استبعاد النماذج)</SelectItem>
                  <SelectItem value="comprehensive">امتحان شامل (نتيجة بعد الاعتماد + جميع النماذج متاحة)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="editAllowMultiple" checked={allowMultipleAttempts} onChange={(e) => setAllowMultipleAttempts(e.target.checked)} className="h-4 w-4" />
              <Label htmlFor="editAllowMultiple">السماح بأكثر من محاولة</Label>
            </div>
            {allowMultipleAttempts && (
              <div className="mr-6">
                <Label>عدد المحاولات المسموح بها</Label>
                <Input type="number" value={maxAttempts} onChange={(e) => setMaxAttempts(e.target.value)} placeholder="أتركه فارغاً لعدد غير محدود" className="max-w-[200px]" />
              </div>
            )}
            {examCategory === "regular" && (
              <div className="flex items-center gap-2">
                <input type="checkbox" id="editCycleModels" checked={cycleModels} onChange={(e) => setCycleModels(e.target.checked)} className="h-4 w-4" />
                <Label htmlFor="editCycleModels">إعادة تدوير النماذج بعد استنفاذها</Label>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <>
          {models.length > 1 && (
            <div className="flex gap-1 flex-wrap border-b pb-2">
              <button type="button" onClick={() => setActiveModel("all")} className={`px-3 py-1 text-sm rounded-full transition-colors ${activeModel === "all" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}>الكل</button>
              {models.map((m) => {
                const count = questions?.filter((q: any) => (q.model || "A") === m).length ?? 0;
                return (
                  <button key={m} type="button" onClick={() => setActiveModel(m)} className={`px-3 py-1 text-sm rounded-full transition-colors ${activeModel === m ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}>
                    نموذج {m} ({count})
                  </button>
                );
              })}
            </div>
          )}
          <div className="space-y-3">
            {filteredQuestions?.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-xl">
                <p>{activeModel === "all" ? "لا توجد أسئلة." : `لا توجد أسئلة في نموذج ${activeModel}.`}</p>
              </div>
            ) : (
              filteredQuestions?.map((q: any, i: number) => <QuestionEditor key={q.id} q={q} index={i + 1} examId={examId} />)
            )}
          </div>
        </>
      )}
    </div>
  );
}

function QuestionEditor({ q, index, examId }: { q: any; index: number; examId: string }) {
  const qc = useQueryClient();
  const [text, setText] = useState(q.text);
  const [hint, setHint] = useState(q.hint ?? "");
  const [model, setModel] = useState(q.model ?? "A");
  const [explanation, setExplanation] = useState(q.explanation ?? "");
  const [explanationImageUrl, setExplanationImageUrl] = useState<string | null>(q.explanation_image_url);
  const [explanationAudioUrl, setExplanationAudioUrl] = useState<string | null>(q.explanation_audio_url);
  const [explanationVideoUrl, setExplanationVideoUrl] = useState<string | null>(q.explanation_video_url);
  const [points, setPoints] = useState(String(q.points));
  const [imageUrl, setImageUrl] = useState<string | null>(q.image_url);
  const [audioUrl, setAudioUrl] = useState<string | null>(q.audio_url);
  const [videoUrl, setVideoUrl] = useState<string | null>(q.video_url);
  const [uploading, setUploading] = useState(false);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("questions").update({
        text, hint: hint || null, model: model || "A", explanation: explanation || null,
        explanation_image_url: explanationImageUrl || null,
        explanation_audio_url: explanationAudioUrl || null,
        explanation_video_url: explanationVideoUrl || null,
        points: Number(points) || 1, image_url: imageUrl, audio_url: audioUrl, video_url: videoUrl,
      }).eq("id", q.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("اتحفظ"); setTimeout(() => qc.invalidateQueries({ queryKey: ["exam-questions", examId] }), 0); },
  });

  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("questions").delete().eq("id", q.id);
      if (error) throw error;
    },
    onSuccess: () => setTimeout(() => qc.invalidateQueries({ queryKey: ["exam-questions", examId] }), 0),
  });

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const result = await uploadToCloudinary(file, "exam-media");
      setImageUrl(result.secure_url);
      toast.success("ارفعت الصورة، اضغط حفظ");
    } catch (e: any) { toast.error(e?.message); } finally { setUploading(false); }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge>س{index}</Badge>
            <Badge variant="outline">{q.type === "mcq" ? "اختيار من متعدد" : q.type === "true_false" ? "صح/خطأ" : "مقالي"}</Badge>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => save.mutate()} disabled={save.isPending} className="gap-1">
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              حفظ
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>حذف السؤال؟</AlertDialogTitle><AlertDialogDescription>لا يمكن التراجع عن الحذف.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                  <AlertDialogAction onClick={() => del.mutate()}>حذف</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div><Label>نص السؤال</Label><Textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} /></div>

        <div className="grid sm:grid-cols-2 gap-3 p-3 rounded-lg border border-dashed bg-muted/20">
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">صورة السؤال</Label>
            <Label htmlFor={`img-${q.id}`} className="cursor-pointer inline-flex items-center gap-1 text-sm px-3 py-2 border rounded-md hover:bg-accent">
              <ImageIcon className="h-4 w-4" /> {uploading ? "جاري الرفع..." : imageUrl ? "تغيير صورة" : "إضافة صورة"}
            </Label>
            <input id={`img-${q.id}`} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
            {imageUrl && (
              <Button size="sm" variant="ghost" onClick={() => setImageUrl(null)} className="text-destructive">إزالة</Button>
            )}
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">صوت السؤال</Label>
            <AudioRecorder bucket="exam-media" value={audioUrl} onChange={setAudioUrl} label="تسجيل صوت" />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs text-muted-foreground mb-1 block">فيديو السؤال</Label>
            <div className="flex items-center gap-2 flex-wrap">
              <Label htmlFor={`vid-${q.id}`} className="cursor-pointer inline-flex items-center gap-1 text-sm px-3 py-2 border rounded-md hover:bg-accent">
                <Video className="h-4 w-4" /> {videoUrl ? "تغيير فيديو" : "إضافة فيديو"}
              </Label>
              <input id={`vid-${q.id}`} type="file" accept="video/*" className="hidden" onChange={(e) => {
                const f = e.target.files?.[0]; if (!f) return;
                if (f.size > 100 * 1024 * 1024) { toast.error("الحجم أكبر من 100MB"); return; }
                (async () => {
                  const result = await uploadToCloudinary(f, "exam-media");
                  setVideoUrl(result.secure_url);
                  toast.success("اترفع الفيديو، اضغط حفظ");
                })();
              }} />
              {videoUrl && (
                <div className="flex items-center gap-1">
                  <video controls src={getMediaUrl(videoUrl, "exam-media")} className="h-14 w-24 object-cover rounded-md border" />
                  <Button size="sm" variant="ghost" onClick={() => setVideoUrl(null)} className="text-destructive">إزالة</Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {(q.type === "mcq" || q.type === "true_false") && <OptionsEditor question={q} />}

        <div className="grid grid-cols-4 gap-3">
          <div><Label>الدرجة</Label><Input type="number" value={points} onChange={(e) => setPoints(e.target.value)} /></div>
          <div><Label>النموذج</Label>
            <select value={model} onChange={(e) => setModel(e.target.value)} className="w-full border rounded-md px-2 py-1.5 text-sm bg-background">
              <option value="A">أ</option>
              <option value="B">ب</option>
              <option value="C">ج</option>
              <option value="D">د</option>
            </select>
          </div>
          <div className="col-span-2"><Label>تلميح (Hint)</Label><Input value={hint} onChange={(e) => setHint(e.target.value)} placeholder="يظهر أثناء الحل" /></div>
        </div>
        <div className="space-y-2 p-3 rounded-lg border border-dashed bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
          <Label className="text-blue-700 dark:text-blue-300 font-semibold">شرح الإجابة (يظهر بعد الحل)</Label>
          <Textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={2} placeholder="اكتب شرح الإجابة الصحيحة..." />
          <div className="flex items-center gap-2 flex-wrap">
            <Label htmlFor={`exp-img-${q.id}`} className="cursor-pointer inline-flex items-center gap-1 text-xs px-2 py-1 border rounded-md hover:bg-accent">
              <ImageIcon className="h-3 w-3" /> صورة
            </Label>
            <input id={`exp-img-${q.id}`} type="file" accept="image/*" className="hidden" onChange={async (e) => {
              const f = e.target.files?.[0]; if (!f) return;
              const result = await uploadToCloudinary(f, "exam-media");
              setExplanationImageUrl(result.secure_url);
            }} />
            {explanationImageUrl && <Button size="sm" variant="ghost" onClick={() => setExplanationImageUrl(null)} className="text-destructive text-xs">✕ صورة</Button>}
            <div className="w-px h-4 bg-border" />
            <div className="text-xs"><AudioRecorder bucket="exam-media" value={explanationAudioUrl} onChange={setExplanationAudioUrl} label="صوت الشرح" /></div>
            <div className="w-px h-4 bg-border" />
            <Label htmlFor={`exp-vid-${q.id}`} className="cursor-pointer inline-flex items-center gap-1 text-xs px-2 py-1 border rounded-md hover:bg-accent">
              <Video className="h-3 w-3" /> فيديو
            </Label>
            <input id={`exp-vid-${q.id}`} type="file" accept="video/*" className="hidden" onChange={async (e) => {
              const f = e.target.files?.[0]; if (!f) return;
              const result = await uploadToCloudinary(f, "exam-media");
              setExplanationVideoUrl(result.secure_url);
            }} />
            {explanationVideoUrl && <Button size="sm" variant="ghost" onClick={() => setExplanationVideoUrl(null)} className="text-destructive text-xs">✕ فيديو</Button>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function OptionsEditor({ question }: { question: any }) {
  const qc = useQueryClient();
  const [opts, setOpts] = useState<any[]>(question.question_options ?? []);
  const isTF = question.type === "true_false";

  const update = async (id: string, patch: any) => {
    setOpts((p) => p.map((o) => (o.id === id ? { ...o, ...patch } : o)));
    await supabase.from("question_options").update(patch).eq("id", id);
    setTimeout(() => qc.invalidateQueries({ queryKey: ["exam-questions"] }), 0);
  };

  const add = async () => {
    const { data, error } = await supabase.from("question_options").insert({
      question_id: question.id, text: `اختيار ${opts.length + 1}`, order_index: opts.length + 1,
    }).select().single();
    if (!error && data) setOpts([...opts, data]);
  };

  const remove = async (id: string) => {
    await supabase.from("question_options").delete().eq("id", id);
    setOpts((p) => p.filter((o) => o.id !== id));
  };

  const setCorrect = async (id: string) => {
    await supabase.from("question_options").update({ is_correct: false }).eq("question_id", question.id);
    await supabase.from("question_options").update({ is_correct: true }).eq("id", id);
    setOpts((p) => p.map((o) => ({ ...o, is_correct: o.id === id })));
  };

  return (
    <div className="space-y-2 border rounded-md p-3 bg-muted/30">
      <p className="text-sm font-semibold">الاختيارات (اختر الصحيح):</p>
      {opts.map((o) => (
        <div key={o.id} className="flex items-center gap-2">
          <input type="radio" checked={o.is_correct} onChange={() => setCorrect(o.id)} className="h-4 w-4" />
          <Input value={o.text ?? ""} onChange={(e) => update(o.id, { text: e.target.value })} disabled={isTF} />
          {!isTF && (
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(o.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
      {!isTF && (
        <Button size="sm" variant="outline" onClick={add} className="gap-1"><Plus className="h-4 w-4" /> اختيار</Button>
      )}
    </div>
  );
}

function AttemptsList({ examId }: { examId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["exam-attempts", examId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exam_attempts").select("*").eq("exam_id", examId).order("submitted_at", { ascending: false });
      if (error) throw error;
      if (!data?.length) return [];
      const ids = data.map((a: any) => a.student_id);
      const { data: profs } = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
      const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
      return data.map((a: any) => ({ ...a, student: map.get(a.student_id) }));
    },
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!data?.length) return <p className="text-center text-muted-foreground py-12">لا توجد محاولات.</p>;

  return (
    <div className="grid gap-3">
      {data.map((a: any) => (
        <Card key={a.id}>
          <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="font-bold">{a.student?.full_name ?? a.student_id}</h3>
              <p className="text-sm text-muted-foreground">{a.student?.email}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {a.submitted_at ? new Date(a.submitted_at).toLocaleString("ar-EG") : "لم يسلم"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {a.score !== null ? (
                <Badge variant="default" className="text-base">{a.score}/{a.max_score}</Badge>
              ) : <Badge variant="secondary">{a.status === "in_progress" ? "جاري" : "بانتظار التصحيح"}</Badge>}
              <Button asChild size="sm" variant="outline">
                <Link to="/admin/exams/$examId/attempts/$attemptId" params={{ examId, attemptId: a.id }}>التفاصيل / تصحيح</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
