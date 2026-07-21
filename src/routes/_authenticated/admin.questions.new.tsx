import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InlineQuestionEditor, freshQuestion, type LocalQuestion } from "@/components/InlineQuestionEditor";
import { ArrowRight, Plus, Loader2, Save } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/questions/new")({
  component: NewQuestionsPage,
  head: () => ({ meta: [{ title: "أسئلة جديدة | لوحة الإدارة" }] }),
});

function NewQuestionsPage() {
  const { role, loading } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (!loading && role !== "admin") nav({ to: "/dashboard" });
  }, [loading, role, nav]);

  const [examId, setExamId] = useState("");
  const [questions, setQuestions] = useState<LocalQuestion[]>([]);
  const [activeModel, setActiveModel] = useState<string>("all");

  const { data: exams } = useQuery({
    queryKey: ["exams-for-questions"],
    queryFn: async () => {
      const { data } = await supabase.from("exams").select("id, title, type").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: maxOrder } = useQuery({
    queryKey: ["max-order-questions", examId],
    queryFn: async () => {
      if (!examId) return 0;
      const { data } = await supabase.from("questions").select("order_index").eq("exam_id", examId).order("order_index", { ascending: false }).limit(1);
      return ((data ?? [])[0] as any)?.order_index ?? 0;
    },
    enabled: !!examId,
  });

  const addQuestion = (qt: "mcq" | "true_false" | "essay") => {
    setQuestions([...questions, freshQuestion(qt)]);
  };

  const updateQuestion = (id: string, q: LocalQuestion) => {
    setQuestions(questions.map((x) => (x.id === id ? q : x)));
  };

  const deleteQuestion = (id: string) => {
    setQuestions(questions.filter((x) => x.id !== id));
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!examId) throw new Error("اختار امتحان الأول");
      if (!questions.length) throw new Error("ضيف سؤال واحد على الأقل");
      for (const q of questions) {
        if (!q.text.trim()) throw new Error(`السؤال رقم ${questions.indexOf(q) + 1} مكتوبش نص`);
        if ((q.type === "mcq" || q.type === "true_false") && !q.options.some((o) => o.is_correct))
          throw new Error(`السؤال رقم ${questions.indexOf(q) + 1} معملتش اختيار الصحيح`);
      }

      let nextOrder = maxOrder ?? 0;
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        nextOrder++;
        const { data: qRow, error: qErr } = await supabase.from("questions").insert({
          exam_id: examId,
          type: q.type,
          text: q.text,
          points: q.points,
          hint: q.hint || null,
          model: q.model || "A",
          explanation: q.explanation || null,
          explanation_image_url: q.explanationImageUrl || null,
          explanation_audio_url: q.explanationAudioUrl || null,
          explanation_video_url: q.explanationVideoUrl || null,
          image_url: q.imageUrl || null,
          audio_url: q.audioUrl || null,
          video_url: q.videoUrl || null,
          order_index: nextOrder,
        }).select("id").single();

        if (qErr) throw qErr;

        if (q.type === "mcq" || q.type === "true_false") {
          const opts = q.options
            .filter((o) => o.text.trim())
            .map((o, idx) => ({
              question_id: qRow.id,
              text: o.text,
              is_correct: o.is_correct,
              image_url: o.imageUrl || null,
              video_url: o.videoUrl || null,
              order_index: idx + 1,
            }));
          if (opts.length) {
            const { error: optErr } = await supabase.from("question_options").insert(opts);
            if (optErr) throw optErr;
          }
        }
      }
    },
    onSuccess: () => {
      toast.success("تم حفظ الأسئلة بنجاح!");
      nav({ to: "/admin/questions" });
    },
    onError: (e: any) => toast.error(e?.message ?? "خطأ في الحفظ"),
  });

  if (loading || role !== "admin") {
    return <div className="min-h-[60dvh] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <Button asChild variant="ghost" className="mb-4 gap-1">
        <Link to="/admin/questions"><ArrowRight className="h-4 w-4" /> رجوع</Link>
      </Button>

      <h1 className="text-3xl font-display font-bold mb-2">إضافة أسئلة لبنك الأسئلة</h1>
      <p className="text-muted-foreground mb-8">اختر الامتحان وأضف أسئلة متعددة مرة واحدة.</p>

      <div className="space-y-8">
        <Card>
          <CardContent className="p-5 space-y-4">
            <h2 className="font-display font-bold text-lg">الامتحان</h2>
            <div>
              <Label>اختر الامتحان *</Label>
              <Select value={examId} onValueChange={(v) => setExamId(v)}>
                <SelectTrigger><SelectValue placeholder="اختر امتحان..." /></SelectTrigger>
                <SelectContent>
                  {exams?.map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>{e.title} ({e.type})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-lg">الأسئلة ({questions.length})</h2>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => addQuestion("mcq")} disabled={!examId}><Plus className="h-4 w-4 me-1" /> MCQ</Button>
                <Button size="sm" variant="outline" onClick={() => addQuestion("true_false")} disabled={!examId}><Plus className="h-4 w-4 me-1" /> صح/خطأ</Button>
                <Button size="sm" variant="outline" onClick={() => addQuestion("essay")} disabled={!examId}><Plus className="h-4 w-4 me-1" /> مقالي</Button>
              </div>
            </div>

            {!examId ? (
              <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-xl">
                <p>اختار امتحان أولاً من القسم أعلاه.</p>
              </div>
            ) : questions.length > 0 && (
              <div className="flex gap-1 flex-wrap border-b pb-2">
                <button type="button" onClick={() => setActiveModel("all")} className={`px-3 py-1 text-sm rounded-full transition-colors ${activeModel === "all" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}>الكل</button>
                {["A", "B", "C", "D"].map((m) => {
                  const count = questions.filter((q) => q.model === m).length;
                  if (!count) return null;
                  return (
                    <button key={m} type="button" onClick={() => setActiveModel(m)} className={`px-3 py-1 text-sm rounded-full transition-colors ${activeModel === m ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}>
                      نموذج {m} ({count})
                    </button>
                  );
                })}
              </div>
            )}

            {(() => {
              if (!examId) return null;
              const filtered = activeModel === "all" ? questions : questions.filter((q) => q.model === activeModel);
              if (!filtered.length) {
                return (
                  <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-xl">
                    <p>{activeModel === "all" ? "لا توجد أسئلة بعد. أضف أول سؤال من الأزرار أعلاه." : `لا توجد أسئلة في نموذج ${activeModel}.`}</p>
                    <p className="text-xs mt-2">كل سؤال يدعم رفع صورة، صوت، أو فيديو</p>
                  </div>
                );
              }
              return (
                <div className="space-y-3">
                  {filtered.map((q) => (
                    <InlineQuestionEditor
                      key={q.id}
                      question={q}
                      index={questions.indexOf(q) + 1}
                      onChange={(updated) => updateQuestion(q.id, updated)}
                      onDelete={() => deleteQuestion(q.id)}
                      bucket="exam-media"
                    />
                  ))}
                </div>
              );
            })()}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pb-10">
          <Button asChild variant="outline"><Link to="/admin/questions">إلغاء</Link></Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !examId || !questions.length} className="gap-2 min-w-[160px]">
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {save.isPending ? "جاري الحفظ..." : "حفظ الأسئلة"}
          </Button>
        </div>
      </div>
    </div>
  );
}