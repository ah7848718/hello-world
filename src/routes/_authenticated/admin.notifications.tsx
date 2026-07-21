import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createNotification, deleteNotification } from "@/lib/notifications.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Bell, Trash2, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/admin/notifications")({
  component: Page,
  head: () => ({ meta: [{ title: "الإشعارات | لوحة الإدارة" }] }),
});

function Page() {
  const qc = useQueryClient();
    
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<"info" | "success" | "warning" | "course" | "exam" | "payment">("info");
  const [audience, setAudience] = useState<"all" | "course">("all");
  const [courseId, setCourseId] = useState<string>("");
  const [link, setLink] = useState("");

  const { data: courses } = useQuery({
    queryKey: ["courses-light"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, title").order("title");
      return data ?? [];
    },
  });

  const { data: notifs, isLoading } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: async () => {
      const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(50);
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      await createFn({
        data: {
          title, body: body || undefined, type, link: link || undefined,
          audience, target_course_id: audience === "course" ? courseId : undefined,
        },
      });
    },
    onSuccess: () => {
      toast.success("تم إرسال الإشعار");
      setTitle(""); setBody(""); setLink(""); setCourseId("");
      qc.invalidateQueries({ queryKey: ["admin-notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-feed"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "فشل الإرسال"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { await deleteFn({ data: { id } }); },
    onSuccess: () => {
      toast.success("تم الحذف");
      qc.invalidateQueries({ queryKey: ["admin-notifications"] });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">الإشعارات</h1>
        <p className="text-muted-foreground mt-1 text-sm">أرسل إشعارات للطلاب وراجع السجل.</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-2 h-fit">
          <CardContent className="p-5 space-y-4">
            <h2 className="font-semibold flex items-center gap-2"><Send className="h-4 w-4" />إشعار جديد</h2>
            <div className="space-y-2">
              <Label>العنوان</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
            </div>
            <div className="space-y-2">
              <Label>المحتوى</Label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} maxLength={2000} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>النوع</Label>
                <Select value={type} onValueChange={(v) => setType(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">عام</SelectItem>
                    <SelectItem value="success">نجاح</SelectItem>
                    <SelectItem value="warning">تنبيه</SelectItem>
                    <SelectItem value="course">كورس</SelectItem>
                    <SelectItem value="exam">امتحان</SelectItem>
                    <SelectItem value="payment">دفع</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>الجمهور</Label>
                <Select value={audience} onValueChange={(v) => setAudience(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الطلاب</SelectItem>
                    <SelectItem value="course">طلاب كورس معين</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {audience === "course" && (
              <div className="space-y-2">
                <Label>الكورس</Label>
                <Select value={courseId} onValueChange={setCourseId}>
                  <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
                  <SelectContent>
                    {(courses ?? []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>رابط (اختياري)</Label>
              <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="/exams/..." maxLength={500} />
            </div>
            <Button
              onClick={() => create.mutate()}
              disabled={!title || create.isPending || (audience === "course" && !courseId)}
              className="w-full"
            >
              {create.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              إرسال
            </Button>
          </CardContent>
        </Card>

        <div className="lg:col-span-3 space-y-3">
          <h2 className="font-semibold text-sm text-muted-foreground">آخر الإشعارات</h2>
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : !notifs?.length ? (
            <Card><CardContent className="p-10 text-center text-muted-foreground">
              <Bell className="h-10 w-10 mx-auto mb-3 opacity-40" />
              لا توجد إشعارات حالياً
            </CardContent></Card>
          ) : (
            notifs.map((n: any) => (
              <Card key={n.id}>
                <CardContent className="p-4 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{n.title}</h3>
                      <Badge variant="outline" className="text-[10px]">{n.type}</Badge>
                      <Badge variant="secondary" className="text-[10px]">{n.audience === "all" ? "للكل" : n.audience === "course" ? "كورس" : "طالب"}</Badge>
                    </div>
                    {n.body && <p className="text-sm text-muted-foreground mt-1">{n.body}</p>}
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ar })}
                    </p>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => del.mutate(n.id)} className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
