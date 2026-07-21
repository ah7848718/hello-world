import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, UserCheck, Loader2, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/personal-exams")({
  component: Page,
  head: () => ({ meta: [{ title: "الامتحان الخاص | لوحة الإدارة" }] }),
});

function Page() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [deleteAssignment, setDeleteAssignment] = useState<{ examId: string; studentId: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-personal-exams"],
    queryFn: async () => {
      const [assignRes, examsRes, studentsRes] = await Promise.all([
        supabase.from("exam_assignments").select("*, exams!inner(title), profiles!inner(full_name)").order("assigned_at", { ascending: false }),
        supabase.from("exams").select("id, title").eq("is_published", true).order("created_at", { ascending: false }),
        supabase.from("profiles").select("id, full_name").eq("status", "approved"),
      ]);
      return {
        assignments: assignRes.data ?? [],
        exams: examsRes.data ?? [],
        students: studentsRes.data ?? [],
      };
    },
  });

  const remove = async () => {
    if (!deleteAssignment) return;
    const { error } = await supabase.from("exam_assignments").delete().eq("exam_id", deleteAssignment.examId).eq("student_id", deleteAssignment.studentId);
    if (error) { toast.error(error.message); setDeleteAssignment(null); return; }
    toast.success("اتحذف"); setDeleteAssignment(null); qc.invalidateQueries({ queryKey: ["admin-personal-exams"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">الامتحان الخاص</h1>
          <p className="text-muted-foreground mt-1 text-sm">تخصيص امتحانات لطلاب معينين.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> تخصيص جديد</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>تخصيص امتحان لطالب</DialogTitle></DialogHeader>
            <AssignForm exams={data?.exams ?? []} students={data?.students ?? []} onDone={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["admin-personal-exams"] }); }} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="grid place-items-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
          ) : !data?.assignments.length ? (
            <div className="p-12 text-center"><UserCheck className="h-10 w-10 mx-auto text-muted-foreground mb-3" /><p className="text-muted-foreground">لا توجد تخصيصات بعد.</p></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الامتحان</TableHead>
                  <TableHead>الطالب</TableHead>
                  <TableHead>تاريخ التخصيص</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.assignments.map((a: any) => (
                  <TableRow key={`${a.exam_id}-${a.student_id}`}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {a.exams?.title ?? "—"}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{a.profiles?.full_name ?? "—"}</TableCell>
                    <TableCell className="text-xs">{new Date(a.assigned_at).toLocaleDateString("ar-EG")}</TableCell>
                    <TableCell className="text-end">
                      <AlertDialog open={deleteAssignment?.examId === a.exam_id && deleteAssignment?.studentId === a.student_id} onOpenChange={(o) => { if (!o) setDeleteAssignment(null); }}>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteAssignment({ examId: a.exam_id, studentId: a.student_id })}><Trash2 className="h-4 w-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>حذف التخصيص؟</AlertDialogTitle><AlertDialogDescription>لا يمكن التراجع عن الحذف.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction onClick={remove}>حذف</AlertDialogAction>
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

function AssignForm({ exams, students, onDone }: { exams: any[]; students: any[]; onDone: () => void }) {
  const [examId, setExamId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!examId || !studentId) { toast.error("اختر الامتحان والطالب"); return; }
    setSaving(true);
    const { error } = await supabase.from("exam_assignments").insert({ exam_id: examId, student_id: studentId });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("تم التخصيص"); onDone();
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2"><Label>الامتحان *</Label>
        <Select value={examId} onValueChange={setExamId}>
          <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
          <SelectContent>{exams.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-2"><Label>الطالب *</Label>
        <Select value={studentId} onValueChange={setStudentId}>
          <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
          <SelectContent>{students.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <DialogFooter>
        <Button onClick={save} disabled={saving} className="gap-2">{saving && <Loader2 className="h-4 w-4 animate-spin" />} تخصيص</Button>
      </DialogFooter>
    </div>
  );
}
