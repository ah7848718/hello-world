import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Loader2, QrCode, Copy } from "lucide-react";

type Code = {
  id: string; code: string; amount: number; center_id: string | null;
  is_used: boolean; used_by: string | null; used_at: string | null;
  created_at: string;
};

export const Route = createFileRoute("/_authenticated/admin/recharge-codes")({
  component: Page,
  head: () => ({ meta: [{ title: "أكواد الشحن | لوحة الإدارة" }] }),
});

function Page() {
  const [data, setData] = useState<{ codes: Code[]; centers: any[] } | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Code | null>(null);

  const load = async () => {
    const [codesRes, centersRes] = await Promise.all([
      supabase.from("center_codes").select("*").order("created_at", { ascending: false }),
      supabase.from("centers").select("id, name"),
    ]);
    if (codesRes.error) { toast.error(codesRes.error.message); return; }
    if (centersRes.error) { toast.error(centersRes.error.message); return; }
    setData({ codes: (codesRes.data ?? []) as Code[], centers: centersRes.data ?? [] });
  };

  useEffect(() => { load(); }, []);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const del = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("center_codes").delete().eq("id", deleteId);
    if (error) { toast.error(error.message); setDeleteId(null); return; }
    toast.success("تم الحذف"); setDeleteId(null); load();
  };

  const copy = (code: string) => { navigator.clipboard.writeText(code); toast.success("تم النسخ"); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">أكواد الشحن</h1>
          <p className="text-muted-foreground text-sm mt-1">إدارة أكواد شحن المحفظة.</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 ml-1" /> كود جديد</Button></DialogTrigger>
          <CodeDialog editing={editing} centers={data?.centers ?? []} onSaved={() => { setOpen(false); setEditing(null); load(); }} />
        </Dialog>
      </div>
      <Card>
        <CardContent className="p-0">
          {!data ? (
            <div className="grid place-items-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
          ) : data.codes.length === 0 ? (
            <div className="p-12 text-center"><QrCode className="h-10 w-10 mx-auto text-muted-foreground mb-3" /><p className="text-muted-foreground">لا توجد أكواد بعد.</p></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الكود</TableHead>
                  <TableHead>القيمة</TableHead>
                  <TableHead>السنتر</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>المستخدم</TableHead>
                  <TableHead>تاريخ الاستخدام</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.codes.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="font-mono font-semibold">{c.code}</code>
                        <Button size="sm" variant="ghost" onClick={() => copy(c.code)}><Copy className="h-3 w-3" /></Button>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{c.amount} ج.م</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {data.centers.find((ct: any) => ct.id === c.center_id)?.name || "—"}
                    </TableCell>
                    <TableCell>{c.is_used ? <Badge variant="secondary">مستخدم</Badge> : <Badge>متاح</Badge>}</TableCell>
                    <TableCell className="text-xs">{c.used_by ? c.used_by.slice(0, 8) + "…" : "—"}</TableCell>
                    <TableCell className="text-xs">{c.used_at ? new Date(c.used_at).toLocaleDateString("ar-EG") : "—"}</TableCell>
                    <TableCell className="text-end">
                      <Button size="sm" variant="ghost" onClick={() => { setEditing(c); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>حذف الكود؟</AlertDialogTitle><AlertDialogDescription>لا يمكن التراجع عن الحذف.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction onClick={() => { setDeleteId(c.id); del(); }}>حذف</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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

function CodeDialog({ editing, centers, onSaved }: { editing: Code | null; centers: any[]; onSaved: () => void }) {
  const [code, setCode] = useState(editing?.code ?? "");
  const [amount, setAmount] = useState(String(editing?.amount ?? ""));
  const [centerId, setCenterId] = useState(editing?.center_id ?? "__none__");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!code.trim() || !amount) return toast.error("الكود والمبلغ مطلوبان");
    if (editing?.is_used) return toast.error("لا يمكن تعديل كود مستخدم");
    setSaving(true);
    const payload = {
      code: code.trim().toUpperCase(), amount: Number(amount),
      center_id: centerId && centerId !== "__none__" ? centerId : null,
    };
    const { error } = editing
      ? await supabase.from("center_codes").update(payload).eq("id", editing.id)
      : await supabase.from("center_codes").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "تم الحفظ" : "تم الإنشاء"); onSaved();
  };

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{editing ? "تعديل الكود" : "كود جديد"}</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <div><Label>الكود *</Label><Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="font-mono" /></div>
        <div><Label>المبلغ *</Label><Input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
        <div><Label>السنتر (اختياري)</Label>
          <Select value={centerId} onValueChange={setCenterId}>
            <SelectTrigger><SelectValue placeholder="بدون سنتر" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">بدون سنتر</SelectItem>
              {centers.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin ml-1" />} حفظ</Button>
      </DialogFooter>
    </DialogContent>
  );
}
