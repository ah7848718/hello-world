import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InlineQuestionEditor, freshQuestion, type LocalQuestion } from "@/components/InlineQuestionEditor";
import { ArrowRight, Plus, Loader2, Save } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/homework/new")({
  component: NewHomeworkPage,
  head: () => ({ meta: [{ title: "واجب جديد | لوحة الإدارة" }] }),
});

function NewHomeworkPage() {
  const { role, loading, user } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (!loading && role !== "admin") nav({ to: "/dashboard" });
  }, [loading, role, nav]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [courseId, setCourseId] = useState("");
  const [lectureId, setLectureId] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [totalPoints, setTotalPoints] = useState("10");
  const [isPublished, setIsPublished] = useState(false);
  const [questions, setQuestions] = useState<LocalQuestion[]>([]);
  const [activeModel, setActiveModel] = useState<string>("all");

  const { data: courses } = useQuery({
    queryKey: ["courses-for-homework"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, title, grade").order("grade");
      return data ?? [];
    },
  });

  const { data: lectures } = useQuery({
    queryKey: ["lectures-for-homework", courseId],
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
      if (!courseId) throw new Error("الكورس مطلوب");
      if (!questions.length) throw new Error("ضيف سؤال واحد على الأقل");
      for (const q of questions) {
        if (!q.text.trim()) throw new Error(`السؤال رقم ${questions.indexOf(q) + 1} مكتوبش نص`);
        if ((q.type === "mcq" || q.type === "true_false") && !q.options.some((o) => o.is_correct))
          throw new Error(`السؤال رقم ${questions.indexOf(q) + 1} معملتش اختيار الصحيح`);
      }

      const { data: hw, error: hwErr } = await supabase.from("homework").insert({
        title: title.trim(),
        description: description.trim() || null,
        course_id: courseId,
        lecture_id: lectureId || null,
        due_at: dueAt ? new Date(dueAt).toISOString() : null,
        total_points: Number(totalPoints) || 0,
        is_published: isPublished,
        created_by: user!.id,
      } as any).select("id").single();

      if (hwErr) throw hwErr;
      const hwId = hw.id;

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const { data: qRow, error: qErr } = await supabase.from("homework_questions").insert({
          homework_id: hwId,
          type: q.type === "essay" ? "essay" : q.type,
          text: q.text,
          points: q.points,
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
              order_index: idx + 1,
            }));
          if (opts.length) {
            const { error: optErr } = await supabase.from("homework_options").insert(opts);
            if (optErr) throw optErr;
          }
        }
      }

      return hwId;
    },
    onSuccess: (hwId) => {
      toast.success("تم إنشاء الواجب بنجاح!");
      nav({ to: "/admin/homework/$homeworkId", params: { homeworkId: hwId } });
    },
    onError: (e: any) => toast.error(e?.message ?? "خطأ في الحفظ"),
  });

  if (loading || role !== "admin") {
    return <div className="min-h-[60dvh] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <Button asChild variant="ghost" className="mb-4 gap-1">
        <Link to="/admin/homework"><ArrowRight className="h-4 w-4" /> رجوع</Link>
      </Button>

      <h1 className="text-3xl font-display font-bold mb-2">إنشاء واجب جديد</h1>
      <p className="text-muted-foreground mb-8">أنشئ الواجب وأضف الأسئلة في نفس الصفحة.</p>

      <div className="space-y-8">
        <Card>
          <CardContent className="p-5 space-y-4">
            <h2 className="font-display font-bold text-lg">بيانات الواجب</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label>العنوان *</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="اسم الواجب" />
              </div>
              <div className="sm:col-span-2">
                <Label>الوصف</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="وصف مختصر" />
              </div>
              <div>
                <Label>الكورس *</Label>
                <Select value={courseId} onValueChange={(v) => { setCourseId(v); setLectureId(""); }}>
                  <SelectTrigger><SelectValue placeholder="اختر كورس" /></SelectTrigger>
                  <SelectContent>
                    {courses?.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.title} ({c.grade})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>بعد محاضرة (اختياري)</Label>
                <Select value={lectureId} onValueChange={(v) => setLectureId(v)} disabled={!courseId}>
                  <SelectTrigger><SelectValue placeholder={courseId ? "اختر محاضرة" : "اختار كورس أولاً"} /></SelectTrigger>
                  <SelectContent>
                    {lectures?.map((l: any) => (
                      <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>موعد التسليم</Label>
                <Input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
              </div>
              <div>
                <Label>الدرجة الكلية</Label>
                <Input type="number" min={0} value={totalPoints} onChange={(e) => setTotalPoints(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center justify-between border rounded-lg p-3">
              <div>
                <Label>منشور</Label>
                <p className="text-xs text-muted-foreground">يظهر للطلاب المشتركين</p>
              </div>
              <Switch checked={isPublished} onCheckedChange={setIsPublished} />
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
                      bucket="homework-media"
                    />
                  ))}
                </div>
              );
            })()}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pb-10">
          <Button asChild variant="outline"><Link to="/admin/homework">إلغاء</Link></Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !title.trim() || !courseId || !questions.length} className="gap-2 min-w-[160px]">
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {save.isPending ? "جاري الحفظ..." : "إنشاء الواجب"}
          </Button>
        </div>
      </div>
    </div>
  );
}