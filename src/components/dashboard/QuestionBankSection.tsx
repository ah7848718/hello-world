import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { BookOpen, Library, Loader2 } from "lucide-react";

type QuestionBankItem = {
  exam_id: string;
  exam_title: string;
  question_count: number;
};

export function QuestionBankSection() {
  const { user } = useAuth();
  const [banks, setBanks] = useState<QuestionBankItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data: enrollData } = await supabase
        .from("enrollments")
        .select("course_id")
        .eq("student_id", user.id)
        .eq("status", "active");
      const courseIds = ((enrollData ?? []) as any[]).map((e: any) => e.course_id);

      if (courseIds.length > 0) {
        const { data: examData } = await supabase
          .from("exams")
          .select("id, title")
          .eq("is_published", true)
          .in("type", ["quiz", "assignment"]);
        const examIds = ((examData ?? []) as any[]).map((e: any) => e.id);

        if (examIds.length > 0) {
          const { data: qData } = await supabase
            .from("questions")
            .select("exam_id")
            .in("exam_id", examIds);
          const countMap = new Map<string, number>();
          (qData ?? []).forEach((q: any) => {
            countMap.set(q.exam_id, (countMap.get(q.exam_id) ?? 0) + 1);
          });
          setBanks(
            ((examData ?? []) as any[])
              .filter((e: any) => countMap.has(e.id))
              .slice(0, 10)
              .map((e: any) => ({
                exam_id: e.id,
                exam_title: e.title,
                question_count: countMap.get(e.id) ?? 0,
              }))
          );
        }
      }
      setLoading(false);
    })();
  }, [user?.id]);

  if (loading) return <Card><CardContent className="p-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></CardContent></Card>;
  if (banks.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Library className="h-5 w-5 text-teal-500" />
          <h2 className="text-xl font-bold">بنك الأسئلة</h2>
          <span className="text-xs text-muted-foreground">
            ({banks.reduce((s, b) => s + b.question_count, 0)} سؤال)
          </span>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {banks.map((b, i) => (
          <motion.div key={b.exam_id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
            <Link to="/exams/$examId" params={{ examId: b.exam_id }} className="block">
              <Card className="hover:shadow-elegant transition cursor-pointer">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="p-1.5 rounded-lg bg-teal-100 text-teal-700">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{b.exam_title}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs shrink-0">{b.question_count} سؤال</Badge>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
