import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Wallet, TrendingUp, TrendingDown } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/wallet")({
  component: Page,
  head: () => ({ meta: [{ title: "حركة المحفظة | لوحة الإدارة" }] }),
});

function Page() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-wallet"],
    queryFn: async () => {
      const [txRes, walletsRes] = await Promise.all([
        supabase.from("wallet_transactions").select("*, wallet_id").order("created_at", { ascending: false }).limit(200),
        supabase.from("wallets").select("id, student_id, profiles!inner(full_name)"),
      ]);
      if (txRes.error) throw txRes.error;
      if (walletsRes.error) throw walletsRes.error;
      const transactions = txRes.data ?? [];
      const wallets = walletsRes.data ?? [];
      const walletMap = new Map(wallets.map((w: any) => [w.id, { student_id: w.student_id, full_name: w.profiles?.full_name ?? "—" }]));
      return { transactions, walletMap };
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">حركة المحفظة</h1>
        <p className="text-muted-foreground text-sm mt-1">سجل إيداعات وسحوبات المحافظ.</p>
      </div>
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="grid place-items-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
          ) : !data?.transactions.length ? (
            <div className="p-12 text-center"><Wallet className="h-10 w-10 mx-auto text-muted-foreground mb-3" /><p className="text-muted-foreground">لا توجد حركات بعد.</p></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الطالب</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>الوصف</TableHead>
                  <TableHead>التاريخ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.transactions.map((tx: any) => {
                  const info = data.walletMap.get(tx.wallet_id);
                  return (
                    <TableRow key={tx.id}>
                      <TableCell className="font-medium text-sm">{info?.full_name ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={tx.type === "credit" ? "secondary" : "destructive"} className="gap-1">
                          {tx.type === "credit" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {tx.type === "credit" ? "إيداع" : "سحب"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{Number(tx.amount).toLocaleString("ar-EG")} ج.م</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{tx.description || "—"}</TableCell>
                      <TableCell className="text-xs">{new Date(tx.created_at).toLocaleString("ar-EG")}</TableCell>
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
