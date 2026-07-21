import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Loader2, BookOpen, Clock, AlertCircle, Brain, ArrowRight } from "lucide-react";
import { ExamRunner } from "./exams.$examId";
import { createExamAttemptService } from "@/lib/services/exam-attempt.service";
import type { ExamAttempt, ExamQuestion } from "@/lib/types/exam";

export const Route = createFileRoute("/_authenticated/exams")({
  component: ExamsPage,
  head: () => ({ meta: [{ title: "الامتحانات" }] }),
});

function ExamsPage() {
  const { user, profile } = useAuth();
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);

  const { data: exams, isLoading } = useQuery({
    queryKey: ["student-exams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exams").select("*").eq("is_published", true).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: attempts } = useQuery({
    queryKey: ["student-attempts", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("exam_attempts").select("*").eq("student_id", user!.id);
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  const handleBack = useCallback(() => setSelectedExamId(null), []);

  const examQuery = useQuery({
    queryKey: ["inline-exam", selectedExamId, user?.id],
    queryFn: async () => {
      const examId = selectedExamId!;
      try {
        const [{ data: exam, error: examErr }, questionsRes] = await Promise.all([
          supabase.from("exams").select("*").eq("id", examId).single(),
          supabase.from("questions").select("id, exam_id, text, type, points, order_index, image_url, audio_url, hint, model").eq("exam_id", examId).order("order_index"),
        ]);
        if (examErr || !exam) return { blocked: true, alreadyDone: true, blockReason: "الامتحان غير موجود." };

        const [completedRes, inProgressRes] = await Promise.all([
          supabase.from("exam_attempts").select("*").eq("exam_id", examId).eq("student_id", user!.id).in("status", ["submitted", "graded"]),
          supabase.from("exam_attempts").select("*").eq("exam_id", examId).eq("student_id", user!.id).eq("status", "in_progress").order("started_at", { ascending: false }).limit(1).maybeSingle(),
        ]);

        const allQuestions = (questionsRes.data ?? []) as ExamQuestion[];
        const completedAttempts = (completedRes.data ?? []) as ExamAttempt[];
        const inProgressAttempt = inProgressRes.data as ExamAttempt | null;

        const service = createExamAttemptService();
        const result = await service.startAttempt(exam as any, allQuestions, user!.id, completedAttempts, inProgressAttempt);

        if (result.blocked) return { blocked: true, alreadyDone: true, blockReason: result.blockReason };

        let attempt: ExamAttempt;
        if (inProgressAttempt) {
          attempt = inProgressAttempt;
        } else {
          const selectedModel = (result as any).selectedModel ?? null;
          const { data: newAttempt, error: createErr } = await supabase
            .from("exam_attempts")
            .insert({ exam_id: examId, student_id: user!.id, status: "in_progress", started_at: new Date().toISOString(), model: selectedModel })
            .select("*")
            .single();
          if (createErr || !newAttempt) return { blocked: true, alreadyDone: true, blockReason: "فشل إنشاء المحاولة." };
          attempt = newAttempt as ExamAttempt;
        }

        const filteredQuestions = result.questions;
        const qIds = filteredQuestions.map((q: any) => q.id);

        const [optsRes, answersRes] = await Promise.all([
          supabase.from("question_options").select("*").in("question_id", qIds),
          supabase.from("student_answers").select("*").eq("attempt_id", attempt.id),
        ]);

        const optsByQ: Record<string, any[]> = {};
        (optsRes.data ?? []).forEach((o: any) => { (optsByQ[o.question_id] ||= []).push(o); });
        const enrichedQuestions = filteredQuestions.map((q: any) => ({ ...q, question_options: optsByQ[q.id] ?? [] }));

        return { blocked: false, alreadyDone: false, exam, attempt, questions: enrichedQuestions, answers: answersRes.data ?? [] };
      } catch (e: any) {
        return { blocked: true, alreadyDone: true, blockReason: e?.message || "حدث خطأ غير متوقع." };
      }
    },
    enabled: !!selectedExamId && !!user?.id,
  });

  if (profile?.status !== "approved") {
    return (
      <div className="container max-w-3xl mx-auto px-4 pb-12">
        <Card><CardContent className="p-8 text-center space-y-3">
          <AlertCircle className="h-10 w-10 text-amber-500 mx-auto" />
          <p>حسابك لسه قيد المراجعة. لما يتفعّل هتقدر تدخل الامتحانات.</p>
        </CardContent></Card>
      </div>
    );
  }

  if (selectedExamId) {
    if (examQuery.isLoading || examQuery.isPending) {
      return (
        <div className="container max-w-5xl mx-auto px-4 pb-10">
          <Button variant="ghost" className="mb-4 gap-1" onClick={handleBack}><ArrowRight className="h-4 w-4" /> رجوع للامتحانات</Button>
          <div className="min-h-[60dvh] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        </div>
      );
    }
    const data = examQuery.data as any;
    if (data?.blocked) {
      return (
        <div className="container max-w-5xl mx-auto px-4 pb-10">
          <Button variant="ghost" className="mb-4 gap-1" onClick={handleBack}><ArrowRight className="h-4 w-4" /> رجوع للامتحانات</Button>
          <div className="container max-w-xl mx-auto px-4 py-20 text-center space-y-4">
            <div className="text-6xl">🚫</div>
            <h1 className="text-2xl font-bold">غير مسموح بالمحاولة</h1>
            <p className="text-muted-foreground text-lg">{data.blockReason}</p>
          </div>
        </div>
      );
    }
    if (data?.exam && data?.attempt) {
      return (
        <div className="container max-w-5xl mx-auto px-4 pb-10">
          <Button variant="ghost" className="mb-4 gap-1" onClick={handleBack}><ArrowRight className="h-4 w-4" /> رجوع للامتحانات</Button>
          <ExamRunner key={data.attempt.id} exam={data.exam} questions={data.questions ?? []} attempt={data.attempt} initialAnswers={data.answers ?? []} />
        </div>
      );
    }
  }

  return (
    <div className="container max-w-5xl mx-auto px-4 pb-10">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold">الامتحانات والواجبات</h1>
          <p className="text-muted-foreground mt-1">اختار الامتحان وابدأ الحل.</p>
        </div>
        <a href="/practice/mistakes" className={buttonVariants({ variant: "outline", className: "gap-2" })}>
          <Brain className="h-4 w-4" /> اختبر أخطاءك
        </a>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : !exams?.length ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">مفيش امتحانات متاحة دلوقتي.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {exams.map((e: any) => {
            const myAttempts = attempts?.filter((a: any) => a.exam_id === e.id) ?? [];
            const submitted = myAttempts.find((a: any) => a.status !== "in_progress");
            const inProgress = myAttempts.find((a: any) => a.status === "in_progress");
            return (
              <Card key={e.id} className="hover:shadow-elegant transition">
                <CardContent className="p-5 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-3 flex-1 min-w-[260px]">
                    <BookOpen className="h-6 w-6 text-primary mt-1" />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-lg">{e.title}</h3>
                        <Badge variant="outline">{e.type === "quiz" ? "كويز" : e.type === "assignment" ? "واجب" : "شامل"}</Badge>
                        {e.duration_minutes && <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />{e.duration_minutes} د</Badge>}
                      </div>
                      {e.description && <p className="text-sm text-muted-foreground mt-1">{e.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {submitted && submitted.score !== null && <Badge>{submitted.score}/{submitted.max_score}</Badge>}
                    {inProgress ? (
                      <Button size="sm" onClick={() => setSelectedExamId(e.id)}>متابعة</Button>
                    ) : (
                      <>
                        {submitted && (
                          <Button size="sm" variant="outline" onClick={() => setSelectedExamId(e.id)}>عرض النتيجة</Button>
                        )}
                        <Button size="sm" onClick={() => setSelectedExamId(e.id)}>{submitted ? "أعد الامتحان" : "ابدأ"}</Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}