import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { replyToTicket, updateTicket } from "@/lib/support.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Ticket, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/admin/support")({
  component: Page,
  head: () => ({ meta: [{ title: "الدعم الفني | لوحة الإدارة" }] }),
});

const statusLabel: Record<string, string> = { open: "مفتوح", in_progress: "قيد المعالجة", resolved: "تم الحل", closed: "مغلق" };
const priorityLabel: Record<string, string> = { low: "منخفض", normal: "عادي", high: "عالي", urgent: "عاجل" };

function Page() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"open" | "in_progress" | "resolved" | "all">("open");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
    
  const { data: tickets, isLoading } = useQuery({
    queryKey: ["admin-tickets", filter],
    queryFn: async () => {
      let q = supabase.from("support_tickets").select("*").order("created_at", { ascending: false });
      if (filter !== "all") q = q.eq("status", filter);
      const { data } = await q.limit(100);
      return data ?? [];
    },
  });

  const studentIds = Array.from(new Set((tickets ?? []).map((t: any) => t.student_id)));
  const { data: profileMap } = useQuery({
    queryKey: ["tickets-profiles", studentIds.join(",")],
    queryFn: async () => {
      if (!studentIds.length) return {} as Record<string, any>;
      const { data } = await supabase.from("profiles").select("id, full_name, email").in("id", studentIds);
      return Object.fromEntries((data ?? []).map((p: any) => [p.id, p]));
    },
    enabled: studentIds.length > 0,
  });

  const selected = tickets?.find((t: any) => t.id === selectedId);
  const selectedProfile = selected ? profileMap?.[selected.student_id] : null;

  const { data: messages } = useQuery({
    queryKey: ["ticket-messages", selectedId],
    queryFn: async () => {
      if (!selectedId) return [];
      const { data } = await supabase.from("support_messages").select("*").eq("ticket_id", selectedId).order("created_at");
      return data ?? [];
    },
    enabled: !!selectedId,
  });

  const send = useMutation({
    mutationFn: async () => {
      if (!selectedId) return;
      await replyFn({ data: { ticket_id: selectedId, body: msg, new_status: "in_progress" } });
    },
    onSuccess: () => {
      toast.success("تم الإرسال");
      setMsg("");
      qc.invalidateQueries({ queryKey: ["ticket-messages", selectedId] });
      qc.invalidateQueries({ queryKey: ["admin-tickets"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "فشل"),
  });

  const update = useMutation({
    mutationFn: async (patch: { status?: any; priority?: any }) => {
      if (!selectedId) return;
      await updateFn({ data: { id: selectedId, ...patch } });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-tickets"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">الدعم الفني</h1>
          <p className="text-muted-foreground mt-1 text-sm">تذاكر المساعدة من الطلاب.</p>
        </div>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
          <TabsList>
            <TabsTrigger value="open">مفتوح</TabsTrigger>
            <TabsTrigger value="in_progress">قيد المعالجة</TabsTrigger>
            <TabsTrigger value="resolved">تم الحل</TabsTrigger>
            <TabsTrigger value="all">الكل</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2 space-y-2 max-h-[75vh] overflow-y-auto pr-1">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : !tickets?.length ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">
              <Ticket className="h-10 w-10 mx-auto mb-3 opacity-40" />
              لا توجد تذاكر
            </CardContent></Card>
          ) : (
            tickets.map((t: any) => (
              <Card key={t.id} className={`cursor-pointer transition ${selectedId === t.id ? "border-primary" : "hover:border-muted-foreground/30"}`} onClick={() => setSelectedId(t.id)}>
                <CardContent className="p-4 space-y-2">
                  <h3 className="font-semibold text-sm line-clamp-2">{t.subject}</h3>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{(profileMap?.[t.student_id]?.full_name) ?? "طالب"}</span>
                    <div className="flex gap-1">
                      <Badge variant="outline" className="text-[10px]">{priorityLabel[t.priority]}</Badge>
                      <Badge variant="secondary" className="text-[10px]">{statusLabel[t.status]}</Badge>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(t.created_at), { addSuffix: true, locale: ar })}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="lg:col-span-3">
          {!selected ? (
            <Card><CardContent className="p-12 text-center text-muted-foreground">اختر تذكرة</CardContent></Card>
          ) : (
            <Card>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display font-bold text-lg">{selected.subject}</h2>
                    <p className="text-xs text-muted-foreground mt-1">{selectedProfile?.full_name} · {selectedProfile?.email}</p>
                  </div>
                  <div className="flex gap-2">
                    <Select value={selected.priority} onValueChange={(v) => update.mutate({ priority: v })}>
                      <SelectTrigger className="w-28 h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(priorityLabel).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={selected.status} onValueChange={(v) => update.mutate({ status: v })}>
                      <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(statusLabel).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3 max-h-[45vh] overflow-y-auto">
                  {messages?.map((m: any) => (
                    <div key={m.id} className={`rounded-lg border p-3 ${m.is_staff ? "bg-primary/5 border-primary/20 ms-8" : "me-8"}`}>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span>{m.is_staff ? "الإدارة" : "الطالب"}</span>
                        <span>{formatDistanceToNow(new Date(m.created_at), { addSuffix: true, locale: ar })}</span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{m.body}</p>
                    </div>
                  ))}
                  {!messages?.length && <p className="text-sm text-muted-foreground text-center py-4">لا توجد رسائل بعد</p>}
                </div>

                <div className="space-y-2 border-t pt-4">
                  <Textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={3} placeholder="اكتب ردك..." maxLength={5000} />
                  <Button onClick={() => send.mutate()} disabled={!msg || send.isPending} className="w-full">
                    {send.isPending ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <Send className="h-4 w-4 me-2" />}
                    إرسال
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
