import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Brain, Loader2, Pencil, Trash2, CheckCircle2, ImageIcon } from "lucide-react";
import { toast } from "sonner";

type QWithExam = {
  id: string; exam_id: string; type: string; text: string; image_url: string | null;
  points: number; order_index: number; created_at: string;
  exams: { title: string } | null;
};

export const Route = createFileRoute("/_authenticated/admin/questions")({
  component: Page,
  head: () => ({ meta: [{ title: "بنك الأسئلة | لوحة الإدارة" }] }),
});

function labelType(t: string) {
  switch (t) {
    case "mcq": return "اختيار من متعدد"; case "true_false": return "صح / خطأ";
    case "essay": return "مقالي"; case "short": return "إجابة قصيرة"; default: return t;
  }
}

function Page() {
  const { role, loading } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isIndex = pathname === "/admin/questions";
  const [examFilter, setExamFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  useEffect(() => {
    if (!loading && role !== "admin") nav({ to: "/dashboard" });
  }, [loading, role, nav]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-questions", examFilter],
    queryFn: async () => {
      const [qRes, examsRes] = await Promise.all([
        supabase.from("questions").select("*, exams!inner(title)").order("created_at", { ascending: false }),
        supabase.from("exams").select("id, title").order("created_at", { ascending: false }),
      ]);
      const all = (qRes.data ?? []) as QWithExam[];
      return {
        questions: examFilter === "all" ? all : all.filter((q) => q.exam_id === examFilter),
        exams: examsRes.data ?? [],
      };
    },
  });

  if (!isIndex && role === "admin") return <Outlet />;

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const del = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("questions").delete().eq("id", deleteId);
    if (error) { toast.error(error.message); setDeleteId(null); return; }
    toast.success("اتحذف"); setDeleteId(null);
    qc.invalidateQueries({ queryKey: ["admin-questions"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">بنك الأسئلة</h1>
          <p className="text-muted-foreground text-sm mt-1">عرض وإدارة جميع أسئلة الامتحانات.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={examFilter} onValueChange={setExamFilter}>
            <SelectTrigger className="w-56"><SelectValue placeholder="كل الامتحانات" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الامتحانات</SelectItem>
              {(data?.exams ?? []).map((e: any) => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button asChild className="gap-2">
            <Link to="/admin/questions/new"><Plus className="h-4 w-4" /> أسئلة جديدة</Link>
          </Button>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
            <DialogTrigger asChild><Button variant="outline" size="icon"><Pencil className="h-4 w-4" /></Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>تعديل سؤال</DialogTitle></DialogHeader>
              {editing && <QuestionForm editing={editing} exams={data?.exams ?? []} onDone={() => { setOpen(false); setEditing(null); }} />}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="grid place-items-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
          ) : !data?.questions.length ? (
            <div className="p-12 text-center"><Brain className="h-10 w-10 mx-auto text-muted-foreground mb-3" /><p className="text-muted-foreground">لا توجد أسئلة بعد.</p></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>السؤال</TableHead>
                  <TableHead>الامتحان</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>الدرجة</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.questions.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="font-medium max-w-xs truncate">{q.text}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{q.exams?.title ?? "—"}</TableCell>
                    <TableCell><Badge variant="outline">{labelType(q.type)}</Badge></TableCell>
                    <TableCell>{q.points}</TableCell>
                    <TableCell className="text-end">
                      <Button size="sm" variant="ghost" onClick={() => { setEditing(q); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                      <AlertDialog open={deleteId === q.id} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteId(q.id)}><Trash2 className="h-4 w-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>حذف السؤال؟</AlertDialogTitle><AlertDialogDescription>لا يمكن التراجع عن الحذف.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction onClick={del}>حذف</AlertDialogAction>
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

function QuestionForm({ editing, exams, onDone }: { editing: any; exams: any[]; onDone: () => void }) {
  const [examId, setExamId] = useState(editing?.exam_id ?? "");
  const [type, setType] = useState(editing?.type ?? "mcq");
  const [text, setText] = useState(editing?.text ?? "");
  const [points, setPoints] = useState(String(editing?.points ?? 1));
  const [explanation, setExplanation] = useState(editing?.explanation ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!text || !examId) { toast.error("نص السؤال والامتحان مطلوبان"); return; }
    setSaving(true);
    const payload = { exam_id: examId, type, text, points: Number(points) || 1, explanation: explanation || null };
    let error: any;
    if (editing) {
      const res = await supabase.from("questions").update(payload).eq("id", editing.id);
      error = res.error;
    } else {
      const { data: qs } = await supabase.from("questions").select("order_index").eq("exam_id", examId).order("order_index", { ascending: false }).limit(1);
      const nextOrder = ((qs ?? [])[0] as any)?.order_index != null ? (qs[0] as any).order_index + 1 : 0;
      const res = await supabase.from("questions").insert({ ...payload, order_index: nextOrder });
      error = res.error;
    }
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("اتحفظ"); onDone();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2"><Label>الامتحان *</Label>
          <Select value={examId} onValueChange={setExamId}>
            <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
            <SelectContent>{exams.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2"><Label>النوع</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="mcq">اختيار من متعدد</SelectItem>
              <SelectItem value="true_false">صح / خطأ</SelectItem>
              <SelectItem value="essay">مقالي</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2"><Label>نص السؤال *</Label><Textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={2000} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2"><Label>الدرجة</Label><Input type="number" min={0} value={points} onChange={(e) => setPoints(e.target.value)} /></div>
        <div className="space-y-2"><Label>الشرح (اختياري)</Label><Input value={explanation} onChange={(e) => setExplanation(e.target.value)} /></div>
      </div>
      <DialogFooter>
        <Button onClick={save} disabled={saving} className="gap-2">{saving && <Loader2 className="h-4 w-4 animate-spin" />} حفظ</Button>
      </DialogFooter>
    </div>
  );
}
