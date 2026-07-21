import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Target, Loader2, Pencil, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";

type Assessment = {
  id: string; title: string; description: string | null; type: string;
  duration_minutes: number | null; passing_score: number | null;
  start_at: string | null; end_at: string | null;
  is_published: boolean; created_at: string;
};

export const Route = createFileRoute("/_authenticated/admin/assessments")({
  component: Page,
  head: () => ({ meta: [{ title: "اختبارات التقييم | لوحة الإدارة" }] }),
});

function Page() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Assessment | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-assessments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exams")
        .select("*")
        .eq("type", "quiz")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Assessment[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("exams").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("اتحذف"); qc.invalidateQueries({ queryKey: ["admin-assessments"] }); },
    onError: (e: any) => toast.error(e?.message ?? "فشل الحذف"),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">اختبارات التقييم</h1>
          <p className="text-muted-foreground mt-1 text-sm">إدارة اختبارات التقييم (الامتحانات من نوع Quiz).</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> تقييم جديد</Button></DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader><DialogTitle>{editing ? "تعديل التقييم" : "تقييم جديد"}</DialogTitle></DialogHeader>
            <AssessmentForm assessment={editing} userId={user!.id} onDone={() => { setOpen(false); setEditing(null); qc.invalidateQueries({ queryKey: ["admin-assessments"] }); }} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="grid place-items-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
          ) : !data?.length ? (
            <div className="p-12 text-center"><Target className="h-12 w-12 mx-auto text-muted-foreground mb-3" /><p className="text-muted-foreground">لا توجد اختبارات تقييم بعد.</p></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>العنوان</TableHead>
                  <TableHead>المدة</TableHead>
                  <TableHead>درجة النجاح</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.title}</TableCell>
                    <TableCell className="text-sm">{a.duration_minutes ? `${a.duration_minutes} د` : "—"}</TableCell>
                    <TableCell className="text-sm">{a.passing_score ?? "—"}</TableCell>
                    <TableCell>{a.is_published ? <Badge>منشور</Badge> : <Badge variant="secondary">مسودة</Badge>}</TableCell>
                    <TableCell className="text-xs">{new Date(a.created_at).toLocaleDateString("ar-EG")}</TableCell>
                    <TableCell className="text-end">
                      <Button asChild size="sm" variant="outline" className="gap-1">
                        <Link to="/admin/exams/$examId" params={{ examId: a.id }}><FileText className="h-3 w-3" /> الأسئلة</Link>
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setEditing(a); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>حذف التقييم؟</AlertDialogTitle><AlertDialogDescription>لا يمكن التراجع عن الحذف.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction onClick={() => del.mutate(a.id)}>حذف</AlertDialogAction>
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

function AssessmentForm({ assessment, userId, onDone }: { assessment: Assessment | null; userId: string; onDone: () => void }) {
  const [title, setTitle] = useState(assessment?.title ?? "");
  const [description, setDescription] = useState(assessment?.description ?? "");
  const [duration, setDuration] = useState(String(assessment?.duration_minutes ?? ""));
  const [passingScore, setPassingScore] = useState(String(assessment?.passing_score ?? 50));
  const [isPublished, setIsPublished] = useState(assessment?.is_published ?? false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title) { toast.error("العنوان مطلوب"); return; }
    setSaving(true);
    const payload = {
      title, description: description || null, type: "quiz",
      duration_minutes: duration ? Number(duration) : null,
      passing_score: Number(passingScore) || 50, is_published: isPublished, created_by: userId,
    };
    const res = assessment
      ? await supabase.from("exams").update(payload).eq("id", assessment.id)
      : await supabase.from("exams").insert(payload);
    setSaving(false);
    if (res.error) { toast.error(res.error.message); return; }
    toast.success("اتحفظ"); onDone();
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2"><Label>العنوان *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} /></div>
      <div className="space-y-2"><Label>الوصف</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={1000} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2"><Label>المدة (دقائق)</Label><Input type="number" min={0} value={duration} onChange={(e) => setDuration(e.target.value)} /></div>
        <div className="space-y-2"><Label>درجة النجاح</Label><Input type="number" min={0} value={passingScore} onChange={(e) => setPassingScore(e.target.value)} /></div>
      </div>
      <div className="flex items-center justify-between border rounded-lg p-3">
        <div><Label>منشور</Label><p className="text-xs text-muted-foreground">يظهر للطلاب</p></div>
        <Switch checked={isPublished} onCheckedChange={setIsPublished} />
      </div>
      <DialogFooter>
        <Button onClick={save} disabled={saving} className="gap-2">{saving && <Loader2 className="h-4 w-4 animate-spin" />} حفظ</Button>
      </DialogFooter>
    </div>
  );
}
