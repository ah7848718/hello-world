import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Eye } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/viewing")({
  component: Page,
  head: () => ({ meta: [{ title: "تفاصيل المشاهدات | لوحة الإدارة" }] }),
});

function Page() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-viewing"],
    queryFn: async () => {
      const { data: progress } = await supabase
        .from("lecture_progress")
        .select("*, profiles!inner(full_name), lectures!inner(title, chapter_id, chapters!inner(unit_id, units!inner(course_id, courses!inner(title))))")
        .order("last_watched_at", { ascending: false })
        .limit(200);
      return progress ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">تفاصيل المشاهدات</h1>
        <p className="text-muted-foreground text-sm mt-1">متابعة تقدم الطلاب في مشاهدة المحاضرات.</p>
      </div>
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="grid place-items-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
          ) : !data?.length ? (
            <div className="p-12 text-center"><Eye className="h-10 w-10 mx-auto text-muted-foreground mb-3" /><p className="text-muted-foreground">لا توجد مشاهدات بعد.</p></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الطالب</TableHead>
                  <TableHead>الكورس</TableHead>
                  <TableHead>المحاضرة</TableHead>
                  <TableHead>المشاهدة</TableHead>
                  <TableHead>مكتمل</TableHead>
                  <TableHead>آخر مشاهدة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((p: any) => {
                  const course = p.lectures?.chapters?.units?.courses;
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium text-sm">{p.profiles?.full_name ?? "—"}</TableCell>
                      <TableCell className="text-xs">{course?.title ?? "—"}</TableCell>
                      <TableCell className="text-xs">{p.lectures?.title ?? "—"}</TableCell>
                      <TableCell className="text-xs">{Math.round((p.watched_seconds ?? 0) / 60)} د</TableCell>
                      <TableCell>{p.completed ? <Badge>نعم</Badge> : <Badge variant="outline">لا</Badge>}</TableCell>
                      <TableCell className="text-xs">{new Date(p.last_watched_at).toLocaleString("ar-EG")}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
