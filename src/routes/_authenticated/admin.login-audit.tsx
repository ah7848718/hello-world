import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Shield, LogIn, LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/login-audit")({
  component: Page,
  head: () => ({ meta: [{ title: "سجل الدخول | لوحة الإدارة" }] }),
});

function Page() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-login-history"],
    queryFn: async () => {
      const { data: history } = await supabase
        .from("login_history")
        .select("*, profiles!inner(full_name)")
        .order("created_at", { ascending: false })
        .limit(200);
      return history ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">سجل الدخول</h1>
        <p className="text-muted-foreground text-sm mt-1">مراقبة عمليات تسجيل الدخول والخروج للطلاب.</p>
      </div>
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="grid place-items-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
          ) : !data?.length ? (
            <div className="p-12 text-center"><Shield className="h-10 w-10 mx-auto text-muted-foreground mb-3" /><p className="text-muted-foreground">لا توجد سجلات بعد.</p></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الطالب</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>الجهاز</TableHead>
                  <TableHead>المتصفح</TableHead>
                  <TableHead>نظام التشغيل</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>التاريخ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium text-sm">{r.profiles?.full_name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={r.event_type === "login" ? "secondary" : "outline"} className="gap-1">
                        {r.event_type === "login" ? <LogIn className="h-3 w-3" /> : <LogOut className="h-3 w-3" />}
                        {r.event_type === "login" ? "دخول" : "خروج"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{r.device_name || r.device_type || "—"}</TableCell>
                    <TableCell className="text-xs">{r.browser || "—"}</TableCell>
                    <TableCell className="text-xs">{r.os || "—"}</TableCell>
                    <TableCell className="text-xs font-mono">{r.ip_address || "—"}</TableCell>
                    <TableCell className="text-xs">{new Date(r.created_at).toLocaleString("ar-EG")}</TableCell>
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
