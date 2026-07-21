import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { inviteAssistant, updateAssistant, deleteAssistant } from "@/lib/assistants.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/assistants")({
  component: Page,
  head: () => ({ meta: [{ title: "المدرسين المساعدين | لوحة الإدارة" }] }),
});

function Page() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    email: "", full_name: "", password: "",
    can_manage_qna: true, can_manage_homework: false, can_manage_support: false,
  });

      
  const { data: assistants, isLoading } = useQuery({
    queryKey: ["admin-assistants"],
    queryFn: async () => {
      const { data } = await supabase.from("assistants").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const invite = useMutation({
    mutationFn: async () => { await inviteFn({ data: form }); },
    onSuccess: () => {
      toast.success("تم إنشاء المساعد");
      setOpen(false);
      setForm({ email: "", full_name: "", password: "", can_manage_qna: true, can_manage_homework: false, can_manage_support: false });
      qc.invalidateQueries({ queryKey: ["admin-assistants"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "فشل"),
  });

  const update = useMutation({
    mutationFn: async (payload: any) => { await updateFn({ data: payload }); },
    onSuccess: () => {
      toast.success("تم الحفظ");
      qc.invalidateQueries({ queryKey: ["admin-assistants"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "فشل التحديث"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { await deleteFn({ data: { id } }); },
    onSuccess: () => {
      toast.success("تم الحذف");
      qc.invalidateQueries({ queryKey: ["admin-assistants"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "فشل"),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">المدرسين المساعدين</h1>
          <p className="text-muted-foreground mt-1 text-sm">أضف مساعدين وحدد صلاحياتهم.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 me-2" />مساعد جديد</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>إضافة مساعد</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>الاسم الكامل</Label>
                <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>الإيميل</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>كلمة المرور (8 أحرف على الأقل)</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
              <div className="space-y-3 pt-2 border-t">
                <Label>الصلاحيات</Label>
                <div className="flex items-center justify-between">
                  <span className="text-sm">إدارة الأسئلة (Q&A)</span>
                  <Switch checked={form.can_manage_qna} onCheckedChange={(v) => setForm({ ...form, can_manage_qna: v })} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">إدارة الواجبات</span>
                  <Switch checked={form.can_manage_homework} onCheckedChange={(v) => setForm({ ...form, can_manage_homework: v })} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">إدارة الدعم الفني</span>
                  <Switch checked={form.can_manage_support} onCheckedChange={(v) => setForm({ ...form, can_manage_support: v })} />
                </div>
              </div>
              <Button
                className="w-full"
                disabled={!form.full_name || !form.email || form.password.length < 8 || invite.isPending}
                onClick={() => invite.mutate()}
              >
                {invite.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                إنشاء الحساب
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : !assistants?.length ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">
          <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
          لا يوجد مساعدين بعد
        </CardContent></Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {assistants.map((a: any) => (
            <Card key={a.id}>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{a.full_name}</h3>
                    <p className="text-xs text-muted-foreground">{a.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={a.is_active ? "default" : "outline"}>{a.is_active ? "نشط" : "موقوف"}</Badge>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>حذف المساعد؟</AlertDialogTitle><AlertDialogDescription>لا يمكن التراجع عن الحذف.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>إلغاء</AlertDialogCancel>
                          <AlertDialogAction onClick={() => del.mutate(a.id)}>حذف</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>تفعيل الحساب</span>
                    <Switch checked={a.is_active} onCheckedChange={(v) => update.mutate({ id: a.id, is_active: v })} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>إدارة Q&A</span>
                    <Switch checked={a.can_manage_qna} onCheckedChange={(v) => update.mutate({ id: a.id, can_manage_qna: v })} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>إدارة الواجبات</span>
                    <Switch checked={a.can_manage_homework} onCheckedChange={(v) => update.mutate({ id: a.id, can_manage_homework: v })} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>إدارة الدعم</span>
                    <Switch checked={a.can_manage_support} onCheckedChange={(v) => update.mutate({ id: a.id, can_manage_support: v })} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
