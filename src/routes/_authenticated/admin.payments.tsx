import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Check,
  X,
  Loader2,
  Receipt,
  ExternalLink,
  CreditCard,
} from "lucide-react";

type PaymentRow = {
  id: string;
  amount: number;
  discount_amount: number;
  method: string;
  status: string;
  transaction_ref: string | null;
  receipt_url: string | null;
  notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  student_id: string;
  course_id: string;
  student?: { full_name: string; email: string; phone: string } | null;
  course?: { title: string } | null;
};

export const Route = createFileRoute("/_authenticated/admin/payments")({
  component: Page,
  head: () => ({ meta: [{ title: "المدفوعات | لوحة الإدارة" }] }),
});

function Page() {
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [payments, setPayments] = useState<PaymentRow[] | null>(null);
  const [selected, setSelected] = useState<PaymentRow | null>(null);
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [notes, setNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  const load = async () => {
    setPayments(null);
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("status", tab)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      setPayments([]);
      return;
    }
    const rows = (data ?? []) as unknown as PaymentRow[];
    // Hydrate student + course
    const studentIds = [...new Set(rows.map((r) => r.student_id))];
    const courseIds = [...new Set(rows.map((r) => r.course_id))];
    const [profilesRes, coursesRes] = await Promise.all([
      studentIds.length
        ? supabase
            .from("profiles")
            .select("id, full_name, email, phone")
            .in("id", studentIds)
        : Promise.resolve({ data: [] as Array<{ id: string; full_name: string; email: string; phone: string }> }),
      courseIds.length
        ? supabase.from("courses").select("id, title").in("id", courseIds)
        : Promise.resolve({ data: [] as Array<{ id: string; title: string }> }),
    ]);
    const profMap = new Map(
      ((profilesRes.data ?? []) as Array<{ id: string; full_name: string; email: string; phone: string }>).map(
        (p) => [p.id, p],
      ),
    );
    const courseMap = new Map(
      ((coursesRes.data ?? []) as Array<{ id: string; title: string }>).map((c) => [c.id, c]),
    );
    setPayments(
      rows.map((r) => ({
        ...r,
        student: profMap.get(r.student_id) ?? null,
        course: courseMap.get(r.course_id) ?? null,
      })),
    );
  };

  useEffect(() => {
    load();
  }, [tab]);

  const openAction = (p: PaymentRow, a: "approve" | "reject") => {
    setSelected(p);
    setAction(a);
    setNotes("");
  };

  const confirm = async () => {
    if (!selected || !action) return;
    setProcessing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) { toast.error("غير مسجل"); return; }
      const res = await fetch("/api/payment/review", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ paymentId: selected.id, action, notes }),
      });
      const json = await res.json();
      if (!json.ok) { toast.error(json.error ?? "فشلت العملية"); return; }
      toast.success(action === "approve" ? "تم الاعتماد والتسجيل" : "تم الرفض");
      setSelected(null);
      setAction(null);
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "خطأ");
    } finally {
      setProcessing(false);
    }
  };

  const getReceiptUrl = async (path: string) => {
    const { data } = await supabase.storage
      .from("payment-receipts")
      .createSignedUrl(path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">المدفوعات</h1>
        <p className="text-muted-foreground text-sm mt-1">
          مراجعة طلبات الدفع اليدوية (Vodafone Cash / InstaPay).
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="pending">قيد المراجعة</TabsTrigger>
          <TabsTrigger value="approved">معتمدة</TabsTrigger>
          <TabsTrigger value="rejected">مرفوضة</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4 space-y-3">
          {payments === null ? (
            <div className="grid place-items-center py-16">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          ) : payments.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-10 text-center">
                <CreditCard className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">لا توجد مدفوعات.</p>
              </CardContent>
            </Card>
          ) : (
            payments.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
              >
                <Card className="border-border/60 hover:shadow-md transition">
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">
                            {p.student?.full_name ?? "—"}
                          </span>
                          <Badge variant="outline">
                            {p.method === "vcash" ? "Vodafone Cash" : "InstaPay"}
                          </Badge>
                          {p.discount_amount > 0 && (
                            <Badge variant="secondary">
                              خصم {p.discount_amount} جنيه
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {p.course?.title ?? "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {p.student?.phone} · {p.student?.email}
                        </p>
                        {p.transaction_ref && (
                          <p className="text-xs">
                            رقم العملية:{" "}
                            <span className="font-mono">
                              {p.transaction_ref}
                            </span>
                          </p>
                        )}
                        {p.notes && (
                          <p className="text-xs text-muted-foreground italic">
                            ملاحظات: {p.notes}
                          </p>
                        )}
                      </div>
                      <div className="text-right space-y-1">
                        <div className="text-xl font-bold text-primary">
                          {p.amount} جنيه
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(p.created_at).toLocaleDateString("ar-EG")}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {p.receipt_url && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => getReceiptUrl(p.receipt_url!)}
                          >
                            <Receipt className="h-4 w-4 ml-1" />
                            الإيصال
                            <ExternalLink className="h-3 w-3 mr-1" />
                          </Button>
                        )}
                        {tab === "pending" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => openAction(p, "approve")}
                            >
                              <Check className="h-4 w-4 ml-1" />
                              اعتماد
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => openAction(p, "reject")}
                            >
                              <X className="h-4 w-4 ml-1" />
                              رفض
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </TabsContent>
      </Tabs>

      <Dialog
        open={!!action}
        onOpenChange={(o) => {
          if (!o) {
            setAction(null);
            setSelected(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === "approve" ? "اعتماد الدفع" : "رفض الدفع"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm">
              الطالب: <strong>{selected?.student?.full_name}</strong>
              <br />
              الكورس: <strong>{selected?.course?.title}</strong>
              <br />
              المبلغ: <strong>{selected?.amount} جنيه</strong>
            </p>
            <div>
              <Label>ملاحظات (اختياري)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder={
                  action === "reject"
                    ? "اشرح للطالب سبب الرفض..."
                    : "ملاحظة داخلية..."
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={confirm}
              disabled={processing}
              variant={action === "reject" ? "destructive" : "default"}
            >
              {processing && <Loader2 className="h-4 w-4 animate-spin ml-1" />}
              تأكيد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

