import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState, useEffect } from "react";
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
import { Plus, ClipboardList, Loader2, Pencil, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/homework")({
  component: Page,
  head: () => ({ meta: [{ title: "الواجبات | لوحة الإدارة" }] }),
});

type Homework = {
  id: string;
  course_id: string;
  lecture_id: string | null;
  title: string;
  description: string | null;
  due_at: string | null;
  total_points: number;
  is_published: boolean;
};

function Page() {
  const { user, role, loading } = useAuth();
  const qc = useQueryClient();
  const nav = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isIndex = pathname === "/admin/homework";
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Homework | null>(null);

  useEffect(() => {
    if (!loading && role !== "admin") nav({ to: "/dashboard" });
  }, [loading, role, nav]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-homework"],
    queryFn: async () => {
      const [{ data: hw }, { data: courses }, { data: lectures }] = await Promise.all([
        supabase.from("homework").select("*").order("created_at", { ascending: false }),
        supabase.from("courses").select("id, title"),
        supabase.from("lectures").select("id, title"),
      ]);
      const map = new Map<string, string>((courses ?? []).map((c: any) => [c.id, c.title]));
      return { hw: (hw ?? []) as Homework[], courseMap: map, courses: courses ?? [], lectures: lectures ?? [] };
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("homework").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("اتحذف"); qc.invalidateQueries({ queryKey: ["admin-homework"] }); },
  });

  if (!isIndex && role === "admin") return <Outlet />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">الواجبات</h1>
          <p className="text-muted-foreground mt-1 text-sm">إنشاء وإدارة واجبات الكورسات</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild className="gap-2">
            <Link to="/admin/homework/new"><Plus className="h-4 w-4" /> واجب جديد</Link>
          </Button>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
            <DialogTrigger asChild><Button variant="outline" size="icon"><Pencil className="h-4 w-4" /></Button></DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader><DialogTitle>تعديل الواجب</DialogTitle></DialogHeader>
              {editing && <HomeworkForm hw={editing} courses={data?.courses ?? []} lectures={data?.lectures ?? []} userId={user!.id} onDone={() => { setOpen(false); setEditing(null); qc.invalidateQueries({ queryKey: ["admin-homework"] }); }} />}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="grid place-items-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
          ) : !data?.hw.length ? (
            <div className="p-12 text-center">
              <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">لا توجد واجبات بعد.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الواجب</TableHead>
                  <TableHead>الكورس</TableHead>
                  <TableHead>التسليم</TableHead>
                  <TableHead>الدرجة</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.hw.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="font-medium">{h.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{data.courseMap.get(h.course_id) ?? "—"}</TableCell>
                    <TableCell className="text-xs">{h.due_at ? new Date(h.due_at).toLocaleDateString("ar-EG") : "—"}</TableCell>
                    <TableCell className="text-sm">{h.total_points}</TableCell>
                    <TableCell>{h.is_published ? <Badge>منشور</Badge> : <Badge variant="secondary">مسودة</Badge>}</TableCell>
                    <TableCell className="text-end">
                      <div className="flex items-center gap-1 justify-end">
                        <Button asChild size="sm" variant="outline" className="gap-1">
                          <Link to="/admin/homework/$homeworkId" params={{ homeworkId: h.id }}>
                            <FileText className="h-3 w-3" /> الأسئلة
                          </Link>
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setEditing(h); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>حذف الواجب؟</AlertDialogTitle><AlertDialogDescription>لا يمكن التراجع عن الحذف.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>إلغاء</AlertDialogCancel>
                              <AlertDialogAction onClick={() => del.mutate(h.id)}>حذف</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
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

function HomeworkForm({ hw, courses, lectures, userId, onDone }: { hw: Homework | null; courses: any[]; lectures: any[]; userId: string; onDone: () => void }) {
  const [title, setTitle] = useState(hw?.title ?? "");
  const [description, setDescription] = useState(hw?.description ?? "");
  const [courseId, setCourseId] = useState(hw?.course_id ?? "");
  const [lectureId, setLectureId] = useState<string>(hw?.lecture_id ?? "");
  const [dueAt, setDueAt] = useState(hw?.due_at ? hw.due_at.slice(0, 16) : "");
  const [totalPoints, setTotalPoints] = useState(String(hw?.total_points ?? 10));
  const [isPublished, setIsPublished] = useState(hw?.is_published ?? false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title || !courseId) { toast.error("العنوان والكورس مطلوبان"); return; }
    setSaving(true);
    const payload = {
      title, description: description || null, course_id: courseId,
      lecture_id: lectureId || null,
      due_at: dueAt ? new Date(dueAt).toISOString() : null,
      total_points: Number(totalPoints) || 0,
      is_published: isPublished, created_by: userId,
    };
    const res = hw
      ? await supabase.from("homework").update(payload).eq("id", hw.id)
      : await supabase.from("homework").insert(payload);
    setSaving(false);
    if (res.error) { toast.error(res.error.message); return; }
    toast.success("اتحفظ");
    onDone();
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2"><Label>العنوان *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} /></div>
      <div className="space-y-2">
        <Label>الكورس *</Label>
        <Select value={courseId} onValueChange={setCourseId}>
          <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
          <SelectContent>
            {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>ربط بمحاضرة (اختياري)</Label>
        <Select value={lectureId || "__none__"} onValueChange={(v) => setLectureId(v === "__none__" ? "" : v)}>
          <SelectTrigger><SelectValue placeholder="بدون ربط" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">بدون ربط (واجب عام للكورس)</SelectItem>
            {lectures.map((l) => <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2"><Label>الشرح</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={1000} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2"><Label>موعد التسليم</Label><Input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} /></div>
        <div className="space-y-2"><Label>الدرجة الكلية</Label><Input type="number" min={0} value={totalPoints} onChange={(e) => setTotalPoints(e.target.value)} /></div>
      </div>
      <div className="flex items-center justify-between border rounded-lg p-3">
        <div><Label>منشور</Label><p className="text-xs text-muted-foreground">يظهر للطلاب المشتركين</p></div>
        <Switch checked={isPublished} onCheckedChange={setIsPublished} />
      </div>
      <DialogFooter>
        <Button onClick={save} disabled={saving} className="gap-2">{saving && <Loader2 className="h-4 w-4 animate-spin" />} حفظ</Button>
      </DialogFooter>
    </div>
  );
}
