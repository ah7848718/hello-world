import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, CalendarCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/subscriptions")({
  component: Page,
  head: () => ({ meta: [{ title: "الاشتراكات | لوحة الإدارة" }] }),
});

function Page() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: async () => {
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("*, profiles!inner(full_name), courses!inner(title, grade)")
        .order("created_at", { ascending: false })
        .limit(200);
      return enrollments ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">الاشتراكات</h1>
        <p className="text-muted-foreground text-sm mt-1">جميع اشتراكات الطلاب في الكورسات.</p>
      </div>
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="grid place-items-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
          ) : !data?.length ? (
            <div className="p-12 text-center"><CalendarCheck className="h-10 w-10 mx-auto text-muted-foreground mb-3" /><p className="text-muted-foreground">لا توجد اشتراكات بعد.</p></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الطالب</TableHead>
                  <TableHead>الكورس</TableHead>
                  <TableHead>الصف</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>تاريخ البدء</TableHead>
                  <TableHead>تاريخ الانتهاء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium text-sm">{e.profiles?.full_name ?? "—"}</TableCell>
                    <TableCell className="text-sm">{e.courses?.title ?? "—"}</TableCell>
                    <TableCell className="text-xs">{e.courses?.grade ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={e.status === "active" ? "secondary" : "destructive"}>
                        {e.status === "active" ? "نشط" : e.status === "expired" ? "منتهي" : "ملغي"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{new Date(e.created_at).toLocaleDateString("ar-EG")}</TableCell>
                    <TableCell className="text-xs">{e.expires_at ? new Date(e.expires_at).toLocaleDateString("ar-EG") : "غير محدد"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
