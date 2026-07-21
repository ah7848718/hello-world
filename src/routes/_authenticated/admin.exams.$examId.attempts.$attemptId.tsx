import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { uploadToCloudinary } from "@/lib/cloudinary-upload";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/exams/$examId/attempts/$attemptId")({
  component: GradeAttemptPage,
  head: () => ({ meta: [{ title: "تصحيح محاولة" }] }),
});

function GradeAttemptPage() {
  const { examId, attemptId } = Route.useParams();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["attempt", attemptId],
    queryFn: async () => {
      const [{ data: attempt }, { data: questions }, { data: answers }] = await Promise.all([
        supabase.from("exam_attempts").select("*").eq("id", attemptId).single(),
        supabase.from("questions").select("*, question_options(*)").eq("exam_id", examId).order("order_index"),
        supabase.from("student_answers").select("*").eq("attempt_id", attemptId),
      ]);
      const { data: prof } = await supabase.from("profiles").select("full_name, email").eq("id", attempt!.student_id).single();
      return { attempt, questions: questions ?? [], answers: answers ?? [], profile: prof };
    },
  });

  const recalc = useMutation({
    mutationFn: async () => {
      const { data: ans } = await supabase.from("student_answers").select("awarded_points").eq("attempt_id", attemptId);
      const score = (ans ?? []).reduce((s: number, a: any) => s + (Number(a.awarded_points) || 0), 0);
      const maxScore = (data?.questions ?? []).reduce((s: number, q: any) => s + Number(q.points), 0);
      await supabase.from("exam_attempts").update({ score, max_score: maxScore, status: "graded" }).eq("id", attemptId);
      return { score, maxScore };
    },
    onSuccess: ({ score, maxScore }) => { toast.success(`الدرجة: ${score}/${maxScore}`); qc.invalidateQueries({ queryKey: ["attempt", attemptId] }); },
  });

  if (isLoading || !data) return <div className="min-h-[60dvh] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <Button asChild variant="ghost" className="mb-4 gap-1">
        <Link to="/admin/exams/$examId" params={{ examId }}><ArrowRight className="h-4 w-4" /> رجوع</Link>
      </Button>
      <Card className="mb-4">
        <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="font-bold text-lg">{data.profile?.full_name}</h2>
            <p className="text-sm text-muted-foreground">{data.profile?.email}</p>
          </div>
          <div className="flex items-center gap-3">
            {data.attempt!.score !== null && <Badge className="text-base">{data.attempt!.score}/{data.attempt!.max_score}</Badge>}
            <Button onClick={() => recalc.mutate()} disabled={recalc.isPending}>
              {recalc.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              احتساب الدرجة النهائية
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {data.questions.map((q: any, i: number) => {
          const ans = data.answers.find((a: any) => a.question_id === q.id);
          return <AnswerReview key={q.id} q={q} ans={ans} index={i + 1} attemptId={attemptId} />;
        })}
      </div>
    </div>
  );
}

function AnswerReview({ q, ans, index, attemptId }: { q: any; ans: any; index: number; attemptId: string }) {
  const qc = useQueryClient();
  const [pts, setPts] = useState(String(ans?.awarded_points ?? ""));
  const [imgUrl, setImgUrl] = useState<string | null>(null);

  useEffect(() => {
    if (ans?.answer_image_url) {
      if (ans.answer_image_url.startsWith("http")) setImgUrl(ans.answer_image_url);
      else supabase.storage.from("exam-media").createSignedUrl(ans.answer_image_url, 300).then(({ data }: any) => setImgUrl(data?.signedUrl ?? null));
    }
  }, [ans?.answer_image_url]);

  const grade = useMutation({
    mutationFn: async (correct: boolean | null) => {
      if (!ans) return;
      const points = correct === true ? Number(q.points) : correct === false ? 0 : Number(pts) || 0;
      await supabase.from("student_answers").update({
        is_correct: correct, awarded_points: points,
        graded_at: new Date().toISOString(),
      }).eq("id", ans.id);
    },
    onSuccess: () => { toast.success("اتحفظ"); qc.invalidateQueries({ queryKey: ["attempt", attemptId] }); },
  });

  const isMcq = q.type === "mcq" || q.type === "true_false";
  const correctOpt = q.question_options?.find((o: any) => o.is_correct);
  const studentOpt = q.question_options?.find((o: any) => o.id === ans?.selected_option_id);

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Badge>س{index}</Badge>
            <Badge variant="outline">{q.points} درجة</Badge>
          </div>
          {ans?.is_correct === true && <Badge className="bg-green-600">صح</Badge>}
          {ans?.is_correct === false && <Badge variant="destructive">غلط</Badge>}
        </div>
        <p className="font-semibold">{q.text}</p>

        {isMcq ? (
          <div className="space-y-1 text-sm">
            <p>إجابة الطالب: <span className={studentOpt?.is_correct ? "text-green-600 font-bold" : "text-destructive font-bold"}>{studentOpt?.text ?? "—"}</span></p>
            <p>الإجابة الصحيحة: <span className="text-green-600 font-bold">{correctOpt?.text}</span></p>
          </div>
        ) : (
          <div className="space-y-2">
            {ans?.answer_text && <div className="p-3 bg-muted rounded-md whitespace-pre-wrap text-sm">{ans.answer_text}</div>}
            {imgUrl && <img src={imgUrl} alt="answer" className="max-w-md rounded-md border" />}
            {!ans?.answer_text && !imgUrl && <p className="text-sm text-muted-foreground">لم يجب</p>}
            <div className="flex items-end gap-2 pt-2">
              <div className="w-32"><Label>الدرجة</Label><Input type="number" value={pts} onChange={(e) => setPts(e.target.value)} max={q.points} min={0} /></div>
              <Button size="sm" onClick={() => grade.mutate(Number(pts) >= Number(q.points) / 2)}>حفظ الدرجة</Button>
            </div>
          </div>
        )}

        {isMcq && ans && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-1" onClick={() => grade.mutate(true)}><CheckCircle2 className="h-4 w-4 text-green-600" /> صح</Button>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => grade.mutate(false)}><XCircle className="h-4 w-4 text-destructive" /> غلط</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
