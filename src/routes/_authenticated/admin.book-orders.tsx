import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Package } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/book-orders")({
  component: Page,
  head: () => ({ meta: [{ title: "طلبات الكتب | لوحة الإدارة" }] }),
});

function Page() {
  const [orders, setOrders] = useState<any[] | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("book_orders")
      .select("*, book:books(title, price)")
      .order("created_at", { ascending: false });
    setOrders(data ?? []);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("book_orders").update({ status: status as any }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("تم التحديث");
    load();
  };

  if (orders === null) return <div className="grid place-items-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="container max-w-5xl mx-auto px-4 py-8 space-y-4" dir="rtl">
      <div className="flex items-center gap-3">
        <Package className="h-7 w-7 text-primary" />
        <h1 className="text-2xl md:text-3xl font-display font-bold">طلبات الكتب</h1>
      </div>

      {orders.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">مفيش طلبات.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {orders.map((o: any) => (
            <Card key={o.id}>
              <CardContent className="p-4 flex items-start justify-between gap-3 flex-wrap">
                <div className="space-y-1 text-sm">
                  <h3 className="font-bold text-base">{o.book?.title} <Badge variant="secondary" className="ms-2">×{o.quantity}</Badge></h3>
                  <p className="text-muted-foreground">{o.full_name} — {o.phone}</p>
                  <p className="text-muted-foreground">{o.governorate} — {o.address}</p>
                  {o.notes && <p className="text-xs italic">"{o.notes}"</p>}
                  <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("ar-EG")}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge className="text-base">{Number(o.total_amount).toFixed(0)} ج</Badge>
                  <Select value={o.status} onValueChange={(v) => updateStatus(o.id, v)}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">قيد المراجعة</SelectItem>
                      <SelectItem value="approved">موافق عليه</SelectItem>
                      <SelectItem value="shipped">تم الشحن</SelectItem>
                      <SelectItem value="rejected">مرفوض</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
