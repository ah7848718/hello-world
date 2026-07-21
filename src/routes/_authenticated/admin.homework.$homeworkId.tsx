import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Plus, ArrowRight, Loader2, Trash2, CheckCircle2, ImageIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/homework/$homeworkId")({
  component: Page,
  head: () => ({ meta: [{ title: "أسئلة الواجب | لوحة الإدارة" }] }),
});

function Page() {
  const { homeworkId } = Route.useParams();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [deleteQId, setDeleteQId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["hw-editor", homeworkId],
    queryFn: async () => {
      const [{ data: hw }, { data: questions }, { data: options }] = await Promise.all([
        supabase.from("homework").select("*").eq("id", homeworkId).single(),
        supabase.from("homework_questions").select("*").eq("homework_id", homeworkId).order("order_index"),
        supabase.from("homework_options").select("*").order("order_index"),
      ]);
      const qIds = new Set((questions ?? []).map((q: any) => q.id));
      const opts = (options ?? []).filter((o: any) => qIds.has(o.question_id));
      return { hw, questions: questions ?? [], options: opts };
    },
  });

  const delQ = useMutation({
    mutationFn: async (id: string) => { await supabase.from("homework_questions").delete().eq("id", id); },
    onSuccess: () => { toast.success("اتحذف"); qc.invalidateQueries({ queryKey: ["hw-editor", homeworkId] }); },
  });

  if (isLoading || !data?.hw) return <div className="grid place-items-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="gap-1 mb-2">
            <Link to="/admin/homework"><ArrowRight className="h-4 w-4" /> رجوع</Link>
          </Button>
          <h1 className="text-2xl md:text-3xl font-display font-bold">{data.hw.title}</h1>
          <p className="text-muted-foreground text-sm mt-1">{data.questions.length} سؤال • {data.hw.total_points} درجة</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> سؤال جديد</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>سؤال جديد</DialogTitle></DialogHeader>
            <QuestionForm homeworkId={homeworkId} nextOrder={data.questions.length} onDone={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["hw-editor", homeworkId] }); }} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {data.questions.map((q: any, i: number) => {
          const qOpts = data.options.filter((o: any) => o.question_id === q.id);
          return (
            <Card key={q.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge>س{i + 1}</Badge>
                    <Badge variant="outline">{labelType(q.type)}</Badge>
                    <Badge variant="secondary">{q.points} درجة</Badge>
                  </div>
                  <AlertDialog open={deleteQId === q.id} onOpenChange={(o) => { if (!o) setDeleteQId(null); }}>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteQId(q.id)}><Trash2 className="h-4 w-4" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>حذف السؤال؟</AlertDialogTitle><AlertDialogDescription>لا يمكن التراجع عن الحذف.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction onClick={() => { delQ.mutate(q.id); setDeleteQId(null); }}>حذف</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                <p className="font-medium">{q.text}</p>
                {q.image_url && <Badge variant="outline" className="gap-1"><ImageIcon className="h-3 w-3" /> صورة مرفقة</Badge>}
                {(q.type === "mcq" || q.type === "true_false") && qOpts.length > 0 && (
                  <ul className="space-y-1 text-sm">
                    {qOpts.map((o: any) => (
                      <li key={o.id} className={`flex items-center gap-2 ${o.is_correct ? "text-green-600 font-semibold" : "text-muted-foreground"}`}>
                        {o.is_correct && <CheckCircle2 className="h-4 w-4" />} {o.text}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          );
        })}
        {!data.questions.length && (
          <Card className="border-dashed"><CardContent className="p-10 text-center text-muted-foreground">لا توجد أسئلة بعد. أضف أول سؤال.</CardContent></Card>
        )}
      </div>
    </div>
  );
}

function labelType(t: string) {
  switch (t) {
    case "mcq": return "اختيار من متعدد";
    case "true_false": return "صح / خطأ";
    case "short": return "إجابة قصيرة";
    case "essay": return "مقالي";
    default: return t;
  }
}

function QuestionForm({ homeworkId, nextOrder, onDone }: { homeworkId: string; nextOrder: number; onDone: () => void }) {
  const [type, setType] = useState<"mcq" | "true_false" | "short" | "essay">("mcq");
  const [text, setText] = useState("");
  const [points, setPoints] = useState("1");
  const [options, setOptions] = useState<{ text: string; is_correct: boolean }[]>([
    { text: "", is_correct: true }, { text: "", is_correct: false },
  ]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!text) { toast.error("نص السؤال مطلوب"); return; }
    setSaving(true);
    const { data: q, error } = await supabase.from("homework_questions").insert({
      homework_id: homeworkId, type, text, points: Number(points) || 1, order_index: nextOrder,
    }).select().single();
    if (error || !q) { setSaving(false); toast.error(error?.message ?? "خطأ"); return; }
    if (type === "mcq" || type === "true_false") {
      const opts = (type === "true_false"
        ? [{ text: "صح", is_correct: options[0]?.is_correct ?? true }, { text: "خطأ", is_correct: !(options[0]?.is_correct ?? true) }]
        : options.filter((o) => o.text.trim())
      ).map((o, i) => ({ question_id: q.id, text: o.text, is_correct: o.is_correct, order_index: i }));
      if (opts.length) await supabase.from("homework_options").insert(opts);
    }
    setSaving(false);
    toast.success("اتحفظ");
    onDone();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>النوع</Label>
          <Select value={type} onValueChange={(v) => setType(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="mcq">اختيار من متعدد</SelectItem>
              <SelectItem value="true_false">صح / خطأ</SelectItem>
              <SelectItem value="short">إجابة قصيرة</SelectItem>
              <SelectItem value="essay">مقالي</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2"><Label>الدرجة</Label><Input type="number" min={0} value={points} onChange={(e) => setPoints(e.target.value)} /></div>
      </div>
      <div className="space-y-2"><Label>نص السؤال *</Label><Textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={2000} /></div>

      {type === "mcq" && (
        <div className="space-y-2">
          <Label>الاختيارات (اختر الصحيح)</Label>
          {options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="radio" checked={o.is_correct} onChange={() => setOptions(options.map((x, j) => ({ ...x, is_correct: i === j })))} />
              <Input value={o.text} onChange={(e) => setOptions(options.map((x, j) => i === j ? { ...x, text: e.target.value } : x))} placeholder={`اختيار ${i + 1}`} />
              {options.length > 2 && <Button size="icon" variant="ghost" onClick={() => setOptions(options.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => setOptions([...options, { text: "", is_correct: false }])}><Plus className="h-4 w-4 me-1" /> اختيار</Button>
        </div>
      )}

      {type === "true_false" && (
        <div className="space-y-2">
          <Label>الإجابة الصحيحة</Label>
          <Select value={options[0]?.is_correct ? "true" : "false"} onValueChange={(v) => setOptions([{ text: "صح", is_correct: v === "true" }])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="true">صح</SelectItem>
              <SelectItem value="false">خطأ</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <DialogFooter>
        <Button onClick={save} disabled={saving} className="gap-2">{saving && <Loader2 className="h-4 w-4 animate-spin" />} حفظ السؤال</Button>
      </DialogFooter>
    </div>
  );
}
