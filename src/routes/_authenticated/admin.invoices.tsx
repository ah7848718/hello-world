import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Receipt, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/invoices")({
  component: Page,
  head: () => ({ meta: [{ title: "الفواتير | لوحة الإدارة" }] }),
});

function Page() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*, profiles!inner(full_name), courses!inner(title)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("payments").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      toast.success(variables.status === "approved" ? "تمت الموافقة على الدفع" : "تم رفض الدفع");
      qc.invalidateQueries({ queryKey: ["admin-invoices"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "فشل التحديث"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">الفواتير</h1>
        <p className="text-muted-foreground text-sm mt-1">جميع فواتير المدفوعات.</p>
      </div>
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="grid place-items-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
          ) : !data?.length ? (
            <div className="p-12 text-center"><Receipt className="h-10 w-10 mx-auto text-muted-foreground mb-3" /><p className="text-muted-foreground">لا توجد فواتير بعد.</p></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الطالب</TableHead>
                  <TableHead>الكورس</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>طريقة الدفع</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium text-sm">{p.profiles?.full_name ?? "—"}</TableCell>
                    <TableCell className="text-sm">{p.courses?.title ?? p.bundle_id ? "باقة" : "—"}</TableCell>
                    <TableCell className="font-medium">{Number(p.amount).toLocaleString("ar-EG")} ج.م</TableCell>
                    <TableCell className="text-xs">{p.method === "vcash" ? "Vodafone Cash" : "InstaPay"}</TableCell>
                    <TableCell>
                      <Badge variant={p.status === "approved" ? "secondary" : p.status === "rejected" ? "destructive" : "outline"}>
                        {p.status === "approved" ? "موافق" : p.status === "rejected" ? "مرفوض" : "قيد المراجعة"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{new Date(p.created_at).toLocaleDateString("ar-EG")}</TableCell>
                    <TableCell className="text-end">
                      {p.status === "pending" && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="text-green-600" onClick={() => updateStatus.mutate({ id: p.id, status: "approved" })} disabled={updateStatus.isPending}>
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => updateStatus.mutate({ id: p.id, status: "rejected" })} disabled={updateStatus.isPending}>
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
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
