import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Megaphone, Trash2, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/admin/announcements")({
  component: Page,
  head: () => ({ meta: [{ title: "إعلانات الموقع | لوحة الإدارة" }] }),
});

function Page() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [message, setMessage] = useState("");

  const { data: items, isLoading } = useQuery({
    queryKey: ["admin-announcements"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_announcements")
        .select("*")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("site_announcements").insert({
        message: message.trim(),
        is_active: true,
        created_by: user?.id ?? null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("تم نشر الإعلان");
      setMessage("");
      qc.invalidateQueries({ queryKey: ["admin-announcements"] });
      qc.invalidateQueries({ queryKey: ["site-announcements-active"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "فشل النشر"),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("site_announcements")
        .update({ is_active })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("تم التحديث");
      qc.invalidateQueries({ queryKey: ["admin-announcements"] });
      qc.invalidateQueries({ queryKey: ["site-announcements-active"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "فشل التحديث"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("site_announcements").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("تم الحذف");
      qc.invalidateQueries({ queryKey: ["admin-announcements"] });
      qc.invalidateQueries({ queryKey: ["site-announcements-active"] });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">إعلانات الموقع</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          الإعلانات بتظهر كشريط أصفر فوق الصفحة الرئيسية وبتفضل تتبدل تلقائي.
        </p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-2 h-fit">
          <CardContent className="p-5 space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Send className="h-4 w-4" /> إعلان جديد
            </h2>
            <div className="space-y-2">
              <Label>نص الإعلان</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                maxLength={300}
                placeholder="وصلت أقوى كتب للقدرات والتحصيلي..."
              />
              <p className="text-[11px] text-muted-foreground">{message.length}/300</p>
            </div>
            <Button
              onClick={() => create.mutate()}
              disabled={!message.trim() || create.isPending}
              className="w-full"
            >
              {create.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              نشر الإعلان
            </Button>
          </CardContent>
        </Card>

        <div className="lg:col-span-3 space-y-3">
          <h2 className="font-semibold text-sm text-muted-foreground">كل الإعلانات</h2>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : !items?.length ? (
            <Card>
              <CardContent className="p-10 text-center text-muted-foreground">
                <Megaphone className="h-10 w-10 mx-auto mb-3 opacity-40" />
                مفيش إعلانات لسه
              </CardContent>
            </Card>
          ) : (
            items.map((a: any) => (
              <Card key={a.id} className={a.is_active ? "border-brand-gold/50" : ""}>
                <CardContent className="p-4 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{a.message}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: ar })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={a.is_active}
                        onCheckedChange={(v) => toggle.mutate({ id: a.id, is_active: v })}
                      />
                      <span className="text-xs text-muted-foreground">
                        {a.is_active ? "ظاهر" : "مخفي"}
                      </span>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => del.mutate(a.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
