import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import {
  FileText, CreditCard, Receipt, Loader2, CheckCircle2,
  Clock, AlertCircle, Ban,
} from "lucide-react";

type PaymentItem = {
  id: string; amount: number; status: string; method: string;
  created_at: string; course_title: string | null;
  discount_amount: number; receipt_url: string | null;
};

type SubscriptionItem = {
  id: string; course_title: string; status: string;
  started_at: string; expires_at: string | null; bundle_title: string | null;
};

type WalletTxn = {
  id: string; amount: number; type: string; description: string | null;
  created_at: string;
};

export function InvoicesSection() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase
        .from("payments")
        .select("*, courses!left(title)")
        .eq("student_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      setPayments(((data ?? []) as any[]).map((p: any) => ({
        id: p.id, amount: p.amount, status: p.status,
        method: p.method, created_at: p.created_at,
        course_title: p.courses?.title ?? null,
        discount_amount: p.discount_amount ?? 0,
        receipt_url: p.receipt_url ?? null,
      })));
      setLoading(false);
    })();
  }, [user?.id]);

  if (loading) return <Card><CardContent className="p-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></CardContent></Card>;

  const statusBadge = (s: string) => {
    if (s === "approved") return <Badge className="bg-green-600 text-xs">تم الدفع</Badge>;
    if (s === "pending") return <Badge variant="secondary" className="text-xs"><Clock className="h-3 w-3 ml-1" />قيد المراجعة</Badge>;
    return <Badge variant="outline" className="text-xs text-red-500"><Ban className="h-3 w-3 ml-1" />مرفوض</Badge>;
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Receipt className="h-5 w-5 text-orange-500" />
        <h2 className="text-xl font-bold">الفواتير</h2>
        <span className="text-xs text-muted-foreground">({payments.length})</span>
      </div>
      {payments.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">لا توجد فواتير</CardContent></Card>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {payments.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg ${
                    p.status === "approved" ? "bg-green-100 text-green-700" :
                    p.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                  }`}>
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{p.amount.toFixed(2)} ج.م</p>
                    <p className="text-xs text-muted-foreground">
                      {p.course_title ?? "اشتراك"}
                      {" · "}{new Date(p.created_at).toLocaleDateString("ar-EG")}
                      {" · "}{p.method === "instapay" ? "انستاباي" : "فودافون كاش"}
                    </p>
                  </div>
                  {statusBadge(p.status)}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}

export function SubscriptionsSection() {
  const { user, profile } = useAuth();
  const [subs, setSubs] = useState<SubscriptionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase
        .from("enrollments")
        .select("*, courses!inner(id, title), bundles!left(title)")
        .eq("student_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      setSubs(((data ?? []) as any[]).map((e: any) => ({
        id: e.id, course_title: e.courses?.title ?? "",
        status: e.status, started_at: e.started_at,
        expires_at: e.expires_at ?? null,
        bundle_title: e.bundles?.title ?? null,
      })));
      setLoading(false);
    })();
  }, [user?.id]);

  if (loading) return null;

  const isExpired = (e: SubscriptionItem) => e.expires_at && new Date(e.expires_at) < new Date();
  const studentName = profile?.full_name || "—";

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-indigo-500" />
        <h2 className="text-xl font-bold">الاشتراكات</h2>
        <span className="text-xs text-muted-foreground">({subs.length})</span>
      </div>
      {subs.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">لا توجد اشتراكات</CardContent></Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground text-xs font-semibold">
                <th className="p-3 text-center">#</th>
                <th className="p-3 text-center whitespace-nowrap">اسم الطالب</th>
                <th className="p-3 text-center whitespace-nowrap">اسم الكورس</th>
                <th className="p-3 text-center whitespace-nowrap">الحالة</th>
                <th className="p-3 text-center whitespace-nowrap">تاريخ البدء</th>
                <th className="p-3 text-center whitespace-nowrap">تاريخ الانتهاء</th>
              </tr>
            </thead>
            <tbody>
              {subs.map((s, i) => (
                <tr key={s.id} className="border-t hover:bg-muted/30 transition-colors">
                  <td className="p-3 text-center text-muted-foreground">{i + 1}</td>
                  <td className="p-3 text-center text-xs font-medium">{studentName}</td>
                  <td className="p-3 text-center text-xs font-semibold">{s.course_title}</td>
                  <td className="p-3 text-center">
                    <Badge variant={isExpired(s) ? "outline" : "secondary"} className="text-xs">
                      {isExpired(s) ? "منتهي" : s.status === "active" ? "نشط" : s.status}
                    </Badge>
                  </td>
                  <td className="p-3 text-center text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(s.started_at).toLocaleDateString("ar-EG")}
                  </td>
                  <td className="p-3 text-center text-xs text-muted-foreground whitespace-nowrap">
                    {s.expires_at ? new Date(s.expires_at).toLocaleDateString("ar-EG") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function WalletTransactionsSection() {
  const { user } = useAuth();
  const [txns, setTxns] = useState<WalletTxn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data: wal } = await supabase.from("wallets").select("id").eq("student_id", user.id).single();
      if (wal) {
        const { data } = await supabase
          .from("wallet_transactions")
          .select("*")
          .eq("wallet_id", (wal as any).id)
          .order("created_at", { ascending: false })
          .limit(10);
        setTxns((data as any) ?? []);
      }
      setLoading(false);
    })();
  }, [user?.id]);

  if (loading || txns.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <CreditCard className="h-5 w-5 text-emerald-500" />
        <h2 className="text-xl font-bold">حركة المحفظة</h2>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {txns.map((t, i) => (
          <motion.div key={t.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
            <Card>
              <CardContent className="p-3 flex items-center gap-3">
                <div className={`p-1.5 rounded-lg ${t.type === "credit" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  <CreditCard className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{t.description ?? "عملية"}</p>
                  <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString("ar-EG")}</p>
                </div>
                <span className={`font-bold text-sm ${t.type === "credit" ? "text-green-600" : "text-red-600"}`}>
                  {t.type === "credit" ? "+" : "-"}{t.amount.toFixed(2)}
                </span>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
