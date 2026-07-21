import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Plus, Trash2, Save, HelpCircle, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/ai-faq")({
  component: AdminAiFaqPage,
  head: () => ({ meta: [{ title: "أسئلة الذكاء الاصطناعي | لوحة الإدارة" }] }),
});

function AdminAiFaqPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: faqs, isLoading } = useQuery({
    queryKey: ["admin-ai-faq"],
    queryFn: async () => {
      const { data } = await supabase.from("ai_faq").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const filtered = faqs?.filter((f) =>
    !search || f.question.toLowerCase().includes(search.toLowerCase()) || f.answer.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">أسئلة الذكاء الاصطناعي</h1>
          <p className="text-muted-foreground mt-1 text-sm">أضف أسئلة وإجابات يستخدمها الـ AI في الرد على الطلاب.</p>
        </div>
        <AddFaqForm />
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث في الأسئلة..." className="ps-9" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : !filtered?.length ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">
          <HelpCircle className="h-10 w-10 mx-auto mb-3 opacity-40" />
          {search ? "لا توجد نتائج" : "مفيش أسئلة لسه. أضف أول سؤال!"}
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((faq) => (
            <FaqItem key={faq.id} faq={faq} />
          ))}
        </div>
      )}
    </div>
  );
}

function AddFaqForm() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [category, setCategory] = useState("");

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("ai_faq").insert({
        question: question.trim(),
        answer: answer.trim(),
        category: category.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("اتضاف");
      setQuestion(""); setAnswer(""); setCategory(""); setOpen(false);
      qc.invalidateQueries({ queryKey: ["admin-ai-faq"] });
    },
    onError: (e: any) => toast.error(e?.message),
  });

  if (!open) {
    return <Button onClick={() => setOpen(true)} className="gap-1"><Plus className="h-4 w-4" /> سؤال جديد</Button>;
  }

  return (
    <Card className="w-full max-w-lg">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="font-semibold">سؤال جديد</Label>
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>✕</Button>
        </div>
        <div>
          <Label className="text-xs">السؤال</Label>
          <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="مثلا: إيه هي الباقات المتاحة؟" />
        </div>
        <div>
          <Label className="text-xs">الإجابة</Label>
          <Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={3} placeholder="الإجابة اللي الـ AI هيرد بيها..." />
        </div>
        <div>
          <Label className="text-xs">التصنيف (اختياري)</Label>
          <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="مثلا: باقات، دفع، تسجيل" />
        </div>
        <Button onClick={() => add.mutate()} disabled={!question.trim() || !answer.trim() || add.isPending} className="w-full">
          {add.isPending ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <Save className="h-4 w-4 me-2" />}
          حفظ
        </Button>
      </CardContent>
    </Card>
  );
}

function FaqItem({ faq }: { faq: any }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [question, setQuestion] = useState(faq.question);
  const [answer, setAnswer] = useState(faq.answer);
  const [category, setCategory] = useState(faq.category ?? "");

  const update = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("ai_faq").update({
        question: question.trim(),
        answer: answer.trim(),
        category: category.trim() || null,
        updated_at: new Date().toISOString(),
      }).eq("id", faq.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("اتحفظ"); setEditing(false); qc.invalidateQueries({ queryKey: ["admin-ai-faq"] }); },
  });

  const toggleActive = useMutation({
    mutationFn: async (active: boolean) => {
      const { error } = await supabase.from("ai_faq").update({ is_active: active }).eq("id", faq.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("تم التفعيل"); qc.invalidateQueries({ queryKey: ["admin-ai-faq"] }); },
    onError: (e: any) => toast.error(e?.message ?? "فشل التعديل"),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("ai_faq").delete().eq("id", faq.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("اتمسح"); qc.invalidateQueries({ queryKey: ["admin-ai-faq"] }); },
    onError: (e: any) => toast.error(e?.message ?? "فشل الحذف"),
  });

  if (editing) return (
      <Card className="border-primary/30">
        <CardContent className="p-4 space-y-3">
          <div className="space-y-2">
            <Label className="text-xs">السؤال</Label>
            <Input value={question} onChange={(e) => setQuestion(e.target.value)} />
            <Label className="text-xs">الإجابة</Label>
            <Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={3} />
            <Label className="text-xs">التصنيف</Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => update.mutate()} disabled={update.isPending} className="gap-1">
              <Save className="h-3 w-3" /> حفظ
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}>إلغاء</Button>
          </div>
        </CardContent>
      </Card>
    );

  return (
    <Card className={`transition ${!faq.is_active ? "opacity-50" : ""}`}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-sm">{faq.question}</h3>
              {faq.category && <Badge variant="outline" className="text-[10px]">{faq.category}</Badge>}
              {!faq.is_active && <Badge variant="secondary" className="text-[10px]">معطّل</Badge>}
            </div>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{faq.answer}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Switch checked={faq.is_active ?? true} onCheckedChange={(v) => toggleActive.mutate(v)} />
            <Button size="icon" variant="ghost" onClick={() => setEditing(true)}>
              <Save className="h-3.5 w-3.5" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="icon" variant="ghost" className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>حذف السؤال؟</AlertDialogTitle><AlertDialogDescription>لا يمكن التراجع عن الحذف.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                  <AlertDialogAction onClick={() => remove.mutate()}>حذف</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
