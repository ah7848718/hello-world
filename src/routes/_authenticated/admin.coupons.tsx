import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Loader2, Ticket, Copy } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Coupon = Database["public"]["Tables"]["coupons"]["Row"];

export const Route = createFileRoute("/_authenticated/admin/coupons")({
  component: Page,
  head: () => ({ meta: [{ title: "الكوبونات | لوحة الإدارة" }] }),
});

function Page() {
  const [coupons, setCoupons] = useState<Coupon[] | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setCoupons(data ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const del = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("coupons").delete().eq("id", deleteId);
    if (error) { toast.error(error.message); setDeleteId(null); return; }
    toast.success("تم الحذف"); setDeleteId(null); load();
  };

  const copy = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("تم نسخ الكود");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">الكوبونات</h1>
          <p className="text-muted-foreground text-sm mt-1">
            إنشاء وإدارة أكواد الخصم.
          </p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) setEditing(null);
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 ml-1" />
              كوبون جديد
            </Button>
          </DialogTrigger>
          <CouponDialog
            editing={editing}
            onSaved={() => {
              setOpen(false);
              setEditing(null);
              load();
            }}
          />
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {coupons === null ? (
            <div className="grid place-items-center py-16">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          ) : coupons.length === 0 ? (
            <div className="p-12 text-center">
              <Ticket className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">لا توجد كوبونات بعد.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الكود</TableHead>
                  <TableHead>الخصم</TableHead>
                  <TableHead>الاستخدام</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>ينتهي</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="font-mono font-semibold">{c.code}</code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copy(c.code)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{c.discount_percent}%</Badge>
                    </TableCell>
                    <TableCell>
                      {c.used_count}
                      {c.max_uses ? ` / ${c.max_uses}` : " / ∞"}
                    </TableCell>
                    <TableCell>
                      {c.is_active ? (
                        <Badge>نشط</Badge>
                      ) : (
                        <Badge variant="outline">معطل</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {c.ends_at
                        ? new Date(c.ends_at).toLocaleDateString("ar-EG")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditing(c);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>حذف الكوبون؟</AlertDialogTitle><AlertDialogDescription>لا يمكن التراجع عن الحذف.</AlertDialogDescription></AlertDialogHeader>
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

function CouponDialog({
  editing,
  onSaved,
}: {
  editing: Coupon | null;
  onSaved: () => void;
}) {
  const [code, setCode] = useState(editing?.code ?? "");
  const [percent, setPercent] = useState<number>(editing?.discount_percent ?? 10);
  const [maxUses, setMaxUses] = useState<string>(
    editing?.max_uses?.toString() ?? "",
  );
  const [isActive, setIsActive] = useState(editing?.is_active ?? true);
  const [endsAt, setEndsAt] = useState<string>(
    editing?.ends_at?.slice(0, 10) ?? "",
  );
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!code.trim()) return toast.error("اكتب كود الكوبون");
    if (percent < 1 || percent > 100) return toast.error("نسبة غير صحيحة");
    setSaving(true);
    const payload = {
      code: code.trim().toUpperCase(),
      discount_percent: Number(percent),
      max_uses: maxUses ? Number(maxUses) : null,
      is_active: isActive,
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
    };
    if (editing) {
      const { error } = await supabase
        .from("coupons")
        .update(payload)
        .eq("id", editing.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("تم الحفظ");
    } else {
      const { error } = await supabase.from("coupons").insert(payload);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("تم إنشاء الكوبون");
    }
    setSaving(false);
    onSaved();
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{editing ? "تعديل كوبون" : "كوبون جديد"}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label>الكود *</Label>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="SUMMER2026"
            className="font-mono"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>نسبة الخصم %</Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={percent}
              onChange={(e) => setPercent(Number(e.target.value))}
            />
          </div>
          <div>
            <Label>أقصى عدد استخدامات</Label>
            <Input
              type="number"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              placeholder="غير محدود"
            />
          </div>
        </div>
        <div>
          <Label>تاريخ الانتهاء</Label>
          <Input
            type="date"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={isActive} onCheckedChange={setIsActive} />
          <Label>نشط</Label>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin ml-1" />}
          حفظ
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
