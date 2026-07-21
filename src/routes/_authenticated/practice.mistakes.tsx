import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Brain, ArrowRight, CheckCircle2, XCircle, Info } from "lucide-react";

export const Route = createFileRoute("/_authenticated/practice/mistakes")({
  component: MistakesPage,
  head: () => ({ meta: [{ title: "اختبر أخطاءك" }] }),
});

function MistakesPage() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["mistakes", user?.id],
    queryFn: async () => {
      // get all wrong answers
      const { data: wrongAns } = await supabase
        .from("student_answers")
        .select("question_id, selected_option_id, attempt_id")
        .eq("is_correct", false);
      if (!wrongAns?.length) return [];
      // ensure attempts belong to this user (RLS already filters but explicit)
      const attemptIds = [...new Set(wrongAns.map((a: any) => a.attempt_id))];
      const { data: attempts } = await supabase
        .from("exam_attempts").select("id, exam_id").in("id", attemptIds).eq("student_id", user!.id);
      const validAttempts = new Set(attempts?.map((a: any) => a.id));
      const filtered = wrongAns.filter((a: any) => validAttempts.has(a.attempt_id));
      const qIds = [...new Set(filtered.map((a: any) => a.question_id))];
      if (!qIds.length) return [];
      const { data: questions } = await supabase
        .from("questions").select("*, question_options(*), exam:exams(id, title, type, end_at)").in("id", qIds);
      // hide answers for major exams not yet ended
      const now = new Date();
      return (questions ?? []).filter((q: any) => {
        if (q.exam?.type !== "major") return true;
        return q.exam?.end_at && new Date(q.exam.end_at) < now;
      });
    },
    enabled: !!user?.id,
  });

  return (
    <div className="container max-w-3xl mx-auto px-4 pb-8">
      <Button asChild variant="ghost" className="mb-4 gap-1"><Link to="/exams"><ArrowRight className="h-4 w-4" /> رجوع</Link></Button>
      <div className="mb-6 flex items-center gap-3">
        <Brain className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-display font-bold">اختبر أخطاءك</h1>
          <p className="text-sm text-muted-foreground">الأسئلة اللي غلطت فيها قبل كده — اتمرن عليها تاني.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : !data?.length ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">مفيش أخطاء متاحة للمراجعة دلوقتي. شطرك! 🎉</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {data.map((q: any, i: number) => <PracticeCard key={q.id} q={q} index={i + 1} />)}
        </div>
      )}
    </div>
  );
}

function PracticeCard({ q, index }: { q: any; index: number }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false);
  const correctOpt = q.question_options?.find((o: any) => o.is_correct);
  const sorted = [...(q.question_options ?? [])].sort((a, b) => a.order_index - b.order_index);
  const isMcq = q.type === "mcq" || q.type === "true_false";

  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge>س{index}</Badge>
            <Badge variant="outline">{q.exam?.title}</Badge>
          </div>
        </div>
        <p className="font-semibold">{q.text}</p>

        {isMcq ? (
          <div className="space-y-2">
            {sorted.map((o: any) => {
              const showCorrect = reveal && o.is_correct;
              const showWrong = reveal && selected === o.id && !o.is_correct;
              return (
                <label key={o.id}
                  className={`flex items-center gap-2 p-3 border rounded-md cursor-pointer transition
                    ${showCorrect ? "border-green-600 bg-green-50 dark:bg-green-950/30" : ""}
                    ${showWrong ? "border-destructive bg-red-50 dark:bg-red-950/30" : ""}
                    ${!reveal && selected === o.id ? "border-primary bg-primary/5" : ""}`}>
                  <input type="radio" name={`p-${q.id}`} checked={selected === o.id} disabled={reveal} onChange={() => setSelected(o.id)} className="h-4 w-4" />
                  <span>{o.text}</span>
                  {showCorrect && <CheckCircle2 className="h-4 w-4 text-green-600 ms-auto" />}
                  {showWrong && <XCircle className="h-4 w-4 text-destructive ms-auto" />}
                </label>
              );
            })}
            {!reveal ? (
              <Button size="sm" disabled={!selected} onClick={() => setReveal(true)}>تأكيد الإجابة</Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => { setReveal(false); setSelected(null); }}>إعادة</Button>
            )}
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setReveal(!reveal)}>{reveal ? "إخفاء" : "اعرض الإجابة النموذجية"}</Button>
        )}

        {reveal && q.explanation && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-md flex gap-2 text-sm">
            <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div><strong>التفسير:</strong> {q.explanation}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
