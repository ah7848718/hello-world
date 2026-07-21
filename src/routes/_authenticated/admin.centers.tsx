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
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Loader2, Building2, Key } from "lucide-react";

type Center = {
  id: string; name: string; code: string; address: string | null;
  phone: string | null; is_active: boolean; created_at: string;
};

export const Route = createFileRoute("/_authenticated/admin/centers")({
  component: Page,
  head: () => ({ meta: [{ title: "السنترات | لوحة الإدارة" }] }),
});

function Page() {
  const [centers, setCenters] = useState<Center[] | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Center | null>(null);

  const load = async () => {
    const { data, error } = await supabase.from("centers").select("*").order("created_at", { ascending: false });
    if (error) { toast.error(error.message); return; }
    setCenters(data ?? []);
  };

  useEffect(() => { load(); }, []);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const del = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("centers").delete().eq("id", deleteId);
    if (error) { toast.error(error.message); setDeleteId(null); return; }
    toast.success("تم الحذف"); setDeleteId(null); load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">السنترات</h1>
          <p className="text-muted-foreground text-sm mt-1">إدارة مراكز التعليم والسنترات.</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 ml-1" /> سنتر جديد</Button></DialogTrigger>
          <CenterDialog editing={editing} onSaved={() => { setOpen(false); setEditing(null); load(); }} />
        </Dialog>
      </div>
      <Card>
        <CardContent className="p-0">
          {centers === null ? (
            <div className="grid place-items-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
          ) : centers.length === 0 ? (
            <div className="p-12 text-center"><Building2 className="h-10 w-10 mx-auto text-muted-foreground mb-3" /><p className="text-muted-foreground">لا توجد سنترات بعد.</p></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>الكود</TableHead>
                  <TableHead>العنوان</TableHead>
                  <TableHead>التليفون</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {centers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell><code className="font-mono">{c.code}</code></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.address || "—"}</TableCell>
                    <TableCell className="text-sm">{c.phone || "—"}</TableCell>
                    <TableCell>{c.is_active ? <Badge>نشط</Badge> : <Badge variant="outline">معطل</Badge>}</TableCell>
                    <TableCell className="text-end">
                      <Button size="sm" variant="ghost" onClick={() => { setEditing(c); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>حذف السنتر؟</AlertDialogTitle><AlertDialogDescription>لا يمكن التراجع عن الحذف.</AlertDialogDescription></AlertDialogHeader>
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

      {/* ───── Center Course Access Codes ───── */}
      <CenterCodesSection />
    </div>
  );
}

type CenterCode = {
  id: string; code: string; is_active: boolean; created_at: string;
};

function CenterCodesSection() {
  const [codes, setCodes] = useState<CenterCode[] | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data, error } = await supabase.from("center_course_codes").select("*").order("created_at", { ascending: false });
    if (!error) setCodes(data ?? []);
  };

  useEffect(() => { load(); }, []);

  const addCode = async () => {
    if (!newCode.trim()) return toast.error("اكتب الكود");
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("center_course_codes").insert({ code: newCode.trim().toUpperCase(), created_by: user!.id });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("تمت إضافة الكود");
    setNewCode("");
    setShowAdd(false);
    load();
  };

  const toggleActive = async (c: CenterCode) => {
    const { error } = await supabase.from("center_course_codes").update({ is_active: !c.is_active }).eq("id", c.id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const deleteCode = async (id: string) => {
    const { error } = await supabase.from("center_course_codes").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("تم الحذف");
    load();
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-orange-500" />
            <h2 className="text-lg font-bold">أكواد كورسات السنتر</h2>
          </div>
          {showAdd ? (
            <div className="flex gap-2 items-center">
              <Input
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                placeholder="اكتب الكود"
                className="w-40 font-mono text-sm"
              />
              <Button size="sm" onClick={addCode} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>إلغاء</Button>
            </div>
          ) : (
            <Button size="sm" onClick={() => setShowAdd(true)}>
              <Plus className="h-4 w-4 ml-1" /> كود جديد
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">الأكواد التي يدخلها الطلاب للوصول إلى كورسات السنتر (قابلة لإعادة الاستخدام).</p>
        {codes === null ? (
          <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : codes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">لا توجد أكواد بعد.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الكود</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>تاريخ الإضافة</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {codes.map((c) => (
                <TableRow key={c.id}>
                  <TableCell><code className="font-mono font-bold text-base">{c.code}</code></TableCell>
                  <TableCell>
                    <Switch checked={c.is_active} onCheckedChange={() => toggleActive(c)} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(c.created_at).toLocaleDateString("ar-EG")}</TableCell>
                  <TableCell className="text-end">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>حذف الكود؟</AlertDialogTitle><AlertDialogDescription>لا يمكن التراجع عن الحذف.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>إلغاء</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteCode(c.id)}>حذف</AlertDialogAction>
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
  );
}

function CenterDialog({ editing, onSaved }: { editing: Center | null; onSaved: () => void }) {
  const [name, setName] = useState(editing?.name ?? "");
  const [code, setCode] = useState(editing?.code ?? "");
  const [address, setAddress] = useState(editing?.address ?? "");
  const [phone, setPhone] = useState(editing?.phone ?? "");
  const [isActive, setIsActive] = useState(editing?.is_active ?? true);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim() || !code.trim()) return toast.error("الاسم والكود مطلوبان");
    setSaving(true);
    const payload = { name: name.trim(), code: code.trim().toUpperCase(), address: address || null, phone: phone || null, is_active: isActive };
    const { error } = editing
      ? await supabase.from("centers").update(payload).eq("id", editing.id)
      : await supabase.from("centers").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "تم الحفظ" : "تم الإنشاء"); onSaved();
  };

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{editing ? "تعديل سنتر" : "سنتر جديد"}</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <div><Label>الاسم *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><Label>الكود *</Label><Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="font-mono" /></div>
        <div><Label>العنوان</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} /></div>
        <div><Label>التليفون</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        <div className="flex items-center gap-2"><Switch checked={isActive} onCheckedChange={setIsActive} /><Label>نشط</Label></div>
      </div>
      <DialogFooter>
        <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin ml-1" />} حفظ</Button>
      </DialogFooter>
    </DialogContent>
  );
}
