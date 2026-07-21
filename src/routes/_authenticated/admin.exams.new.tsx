import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InlineQuestionEditor, freshQuestion, type LocalQuestion } from "@/components/InlineQuestionEditor";
import { ArrowRight, Plus, Loader2, Save } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/exams/new")({
  component: NewExamPage,
  head: () => ({ meta: [{ title: "إنشاء امتحان جديد | لوحة الإدارة" }] }),
});

function NewExamPage() {
  const { role, loading, user } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (!loading && role !== "admin") nav({ to: "/dashboard" });
  }, [loading, role, nav]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"quiz" | "assignment" | "major">("quiz");
  const [duration, setDuration] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [courseId, setCourseId] = useState("");
  const [lectureId, setLectureId] = useState("");
  const [questions, setQuestions] = useState<LocalQuestion[]>([]);
  const [shuffle, setShuffle] = useState(false);
  const [allowMultipleAttempts, setAllowMultipleAttempts] = useState(false);
  const [maxAttempts, setMaxAttempts] = useState("");
  const [cycleModels, setCycleModels] = useState(false);
  const [examCategory, setExamCategory] = useState<"regular" | "comprehensive">("regular");
  const [activeModel, setActiveModel] = useState<string>("all");

  const { data: courses } = useQuery({
    queryKey: ["courses-for-exam"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, title, grade").eq("is_published", true).order("grade");
      return data ?? [];
    },
  });

  const { data: lectures } = useQuery({
    queryKey: ["lectures-for-exam", courseId],
    queryFn: async () => {
      if (!courseId) return [];
      const { data } = await supabase
        .from("lectures")
        .select("id, title, chapter_id, chapters!inner(unit_id, units!inner(course_id))")
        .eq("chapters.units.course_id", courseId)
        .order("order_index");
      return (data ?? []).map((l: any) => ({ id: l.id, title: l.title }));
    },
    enabled: !!courseId,
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
      if (!title.trim()) throw new Error("العنوان مطلوب");
      if (!questions.length) throw new Error("ضيف سؤال واحد على الأقل");
      for (const q of questions) {
        if (!q.text.trim()) throw new Error(`السؤال رقم ${questions.indexOf(q) + 1} مكتوبش نص`);
        if ((q.type === "mcq" || q.type === "true_false") && !q.options.some((o) => o.is_correct))
          throw new Error(`السؤال رقم ${questions.indexOf(q) + 1} معملتش اختيار الصحيح`);
      }

      const { data: exam, error: examErr } = await supabase.from("exams").insert({
        title: title.trim(),
        description: description.trim() || null,
        type,
        duration_minutes: duration ? Number(duration) : null,
        start_at: startAt ? new Date(startAt).toISOString() : null,
        end_at: endAt ? new Date(endAt).toISOString() : null,
        lecture_id: lectureId || null,
        course_id: courseId || null,
        shuffle_questions: shuffle,
        allow_multiple_attempts: allowMultipleAttempts,
        max_attempts: maxAttempts ? Number(maxAttempts) : null,
        instant_result: examCategory === "regular",
        cycle_models: cycleModels,
        exam_category: examCategory,
        created_by: user!.id,
      } as any).select("id").single();

      if (examErr) throw examErr;
      const examId = exam.id;

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
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
          order_index: i + 1,
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

      return examId;
    },
    onSuccess: (examId) => {
      toast.success("تم إنشاء الامتحان بنجاح!");
      nav({ to: "/admin/exams/$examId", params: { examId } });
    },
    onError: (e: any) => toast.error(e?.message ?? "خطأ في الحفظ"),
  });

  if (loading || role !== "admin") {
    return <div className="min-h-[60dvh] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <Button asChild variant="ghost" className="mb-4 gap-1">
        <Link to="/admin/exams"><ArrowRight className="h-4 w-4" /> رجوع</Link>
      </Button>

      <h1 className="text-3xl font-display font-bold mb-2">إنشاء امتحان جديد</h1>
      <p className="text-muted-foreground mb-8">أنشئ الامتحان وأضف الأسئلة في نفس الصفحة.</p>

      <div className="space-y-8">
        <Card>
          <CardContent className="p-5 space-y-4">
            <h2 className="font-display font-bold text-lg">بيانات الامتحان</h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label>العنوان *</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="اسم الامتحان" />
              </div>
              <div className="sm:col-span-2">
                <Label>الوصف</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="وصف مختصر" />
              </div>
              <div>
                <Label>النوع</Label>
                <Select value={type} onValueChange={(v: any) => setType(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quiz">كويز (إجابات فورية)</SelectItem>
                    <SelectItem value="assignment">واجب (إجابات بعد التسليم)</SelectItem>
                    <SelectItem value="major">امتحان شامل (بعد ميعاد الانتهاء)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>المدة (دقيقة)</Label>
                <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="اختياري — 0 = غير محدد" />
              </div>
              <div>
                <Label>من</Label>
                <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
              </div>
              <div>
                <Label>لحد</Label>
                <Input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input type="checkbox" id="shuffle" checked={shuffle} onChange={(e) => setShuffle(e.target.checked)} className="h-4 w-4" />
              <Label htmlFor="shuffle" className="text-sm">خلط ترتيب الأسئلة عشوائياً</Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-4">
            <h2 className="font-display font-bold text-lg">إعدادات الامتحان</h2>
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
                <input type="checkbox" id="allowMultiple" checked={allowMultipleAttempts} onChange={(e) => setAllowMultipleAttempts(e.target.checked)} className="h-4 w-4" />
                <Label htmlFor="allowMultiple">السماح بأكثر من محاولة</Label>
              </div>
              {allowMultipleAttempts && (
                <div className="mr-6">
                  <Label>عدد المحاولات المسموح بها</Label>
                  <Input type="number" value={maxAttempts} onChange={(e) => setMaxAttempts(e.target.value)} placeholder="أتركه فارغاً لعدد غير محدود" className="max-w-[200px]" />
                </div>
              )}
              {examCategory === "regular" && (
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="cycleModels" checked={cycleModels} onChange={(e) => setCycleModels(e.target.checked)} className="h-4 w-4" />
                  <Label htmlFor="cycleModels">إعادة تدوير النماذج بعد استنفاذها</Label>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-4">
            <h2 className="font-display font-bold text-lg">الربط بالمحتوى</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>الكورس (اختياري)</Label>
                <Select value={courseId} onValueChange={(v) => { setCourseId(v); setLectureId(""); }}>
                  <SelectTrigger><SelectValue placeholder="اختر كورس" /></SelectTrigger>
                  <SelectContent>
                    {courses?.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.title} ({c.grade})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground mt-1">لتحديد الصف تلقائياً حسب الكورس</p>
              </div>
              <div>
                <Label>بعد فيديو الشرح (اختياري)</Label>
                <Select value={lectureId} onValueChange={(v) => setLectureId(v)} disabled={!courseId}>
                  <SelectTrigger><SelectValue placeholder={courseId ? "اختر محاضرة" : "اختار كورس أولاً"} /></SelectTrigger>
                  <SelectContent>
                    {lectures?.map((l: any) => (
                      <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground mt-1">الامتحان يظهر بعد مشاهدة هذه المحاضرة</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-lg">الأسئلة ({questions.length})</h2>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => addQuestion("mcq")}><Plus className="h-4 w-4 me-1" /> MCQ</Button>
                <Button size="sm" variant="outline" onClick={() => addQuestion("true_false")}><Plus className="h-4 w-4 me-1" /> صح/خطأ</Button>
                <Button size="sm" variant="outline" onClick={() => addQuestion("essay")}><Plus className="h-4 w-4 me-1" /> مقالي</Button>
              </div>
            </div>

            {questions.length > 0 && (
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
                  {filtered.map((q, i) => (
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
          <Button asChild variant="outline"><Link to="/admin/exams">إلغاء</Link></Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !title.trim() || !questions.length} className="gap-2 min-w-[160px]">
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {save.isPending ? "جاري الحفظ..." : "إنشاء الامتحان"}
          </Button>
        </div>
      </div>
    </div>
  );
}
