import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Award } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/student-results")({
  component: Page,
  head: () => ({ meta: [{ title: "نتائج الطلاب | لوحة الإدارة" }] }),
});

function Page() {
  const examRes = useQuery({
    queryKey: ["admin-results-exams"],
    queryFn: async () => {
      const { data } = await supabase
        .from("exam_attempts")
        .select("*, exams!inner(title, type), profiles!inner(full_name)")
        .in("status", ["submitted", "graded"])
        .order("submitted_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  const hwRes = useQuery({
    queryKey: ["admin-results-homework"],
    queryFn: async () => {
      const { data } = await supabase
        .from("homework_submissions")
        .select("*, homework!inner(title, total_points), profiles!inner(full_name)")
        .in("status", ["submitted", "graded"])
        .order("submitted_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  const quizRes = useQuery({
    queryKey: ["admin-results-quiz"],
    queryFn: async () => {
      const { data } = await supabase
        .from("exam_attempts")
        .select("*, exams!inner(title), profiles!inner(full_name)")
        .eq("exams.type", "quiz")
        .in("status", ["submitted", "graded"])
        .order("submitted_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">نتائج الطلاب</h1>
        <p className="text-muted-foreground text-sm mt-1">عرض نتائج الامتحانات والواجبات واختبارات التقييم.</p>
      </div>

      <Tabs defaultValue="exams">
        <TabsList>
          <TabsTrigger value="exams">الامتحانات</TabsTrigger>
          <TabsTrigger value="quizzes">اختبارات التقييم</TabsTrigger>
          <TabsTrigger value="homework">الواجبات</TabsTrigger>
        </TabsList>

        <TabsContent value="exams" className="mt-4">
          <ResultsTable
            data={examRes.data}
            isLoading={examRes.isLoading}
            columns={[
              { label: "الطالب", render: (r: any) => r.profiles?.full_name ?? "—" },
              { label: "الامتحان", render: (r: any) => r.exams?.title ?? "—" },
              { label: "النتيجة", render: (r: any) => r.score != null ? `${r.score}/${r.max_score}` : "—" },
              { label: "النسبة", render: (r: any) => r.score != null && r.max_score ? <Badge variant={r.score / r.max_score >= 0.5 ? "secondary" : "destructive"}>{Math.round((r.score / r.max_score) * 100)}%</Badge> : "—" },
              { label: "تاريخ", render: (r: any) => r.submitted_at ? new Date(r.submitted_at).toLocaleDateString("ar-EG") : "—" },
            ]}
            emptyMsg="لا توجد نتائج امتحانات بعد."
          />
        </TabsContent>

        <TabsContent value="quizzes" className="mt-4">
          <ResultsTable
            data={quizRes.data}
            isLoading={quizRes.isLoading}
            columns={[
              { label: "الطالب", render: (r: any) => r.profiles?.full_name ?? "—" },
              { label: "التقييم", render: (r: any) => r.exams?.title ?? "—" },
              { label: "النتيجة", render: (r: any) => r.score != null ? `${r.score}/${r.max_score}` : "—" },
              { label: "النسبة", render: (r: any) => r.score != null && r.max_score ? <Badge variant={r.score / r.max_score >= 0.5 ? "secondary" : "destructive"}>{Math.round((r.score / r.max_score) * 100)}%</Badge> : "—" },
              { label: "تاريخ", render: (r: any) => r.submitted_at ? new Date(r.submitted_at).toLocaleDateString("ar-EG") : "—" },
            ]}
            emptyMsg="لا توجد نتائج تقييم بعد."
          />
        </TabsContent>

        <TabsContent value="homework" className="mt-4">
          <ResultsTable
            data={hwRes.data}
            isLoading={hwRes.isLoading}
            columns={[
              { label: "الطالب", render: (r: any) => r.profiles?.full_name ?? "—" },
              { label: "الواجب", render: (r: any) => r.homework?.title ?? "—" },
              { label: "النتيجة", render: (r: any) => r.score != null ? `${r.score}/${r.max_score ?? r.homework?.total_points}` : "—" },
              { label: "الحالة", render: (r: any) => <Badge variant={r.status === "graded" ? "secondary" : "outline"}>{r.status === "graded" ? "مصحح" : "مسلم"}</Badge> },
              { label: "تاريخ", render: (r: any) => r.submitted_at ? new Date(r.submitted_at).toLocaleDateString("ar-EG") : "—" },
            ]}
            emptyMsg="لا توجد نتائج واجبات بعد."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ResultsTable({ data, isLoading, columns, emptyMsg }: { data: any; isLoading: boolean; columns: { label: string; render: (r: any) => any }[]; emptyMsg: string }) {
  return (
    <Card>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="grid place-items-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
        ) : !data?.length ? (
          <div className="p-12 text-center"><Award className="h-10 w-10 mx-auto text-muted-foreground mb-3" /><p className="text-muted-foreground">{emptyMsg}</p></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((c) => <TableHead key={c.label}>{c.label}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((r: any) => (
                <TableRow key={r.id}>
                  {columns.map((c) => <TableCell key={c.label} className="text-sm">{c.render(r)}</TableCell>)}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
