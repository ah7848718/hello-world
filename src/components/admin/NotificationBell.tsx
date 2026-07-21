import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

interface Notif {
  id: string; title: string; body: string | null;
  type: string; link: string | null; created_at: string;
}

export function NotificationBell() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["notifications-feed", user?.id],
    queryFn: async () => {
      const [{ data: notifs }, { data: reads }] = await Promise.all([
        supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(15),
        supabase.from("notification_reads").select("notification_id").eq("user_id", user!.id),
      ]);
      const readIds = new Set((reads ?? []).map((r: any) => r.notification_id));
      return {
        items: (notifs ?? []) as Notif[],
        unread: (notifs ?? []).filter((n: any) => !readIds.has(n.id)).length,
        readIds,
      };
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const markAll = useMutation({
    mutationFn: async () => {
      if (!data?.items.length || !user) return;
      const toMark = data.items.filter((n) => !data.readIds.has(n.id))
        .map((n) => ({ notification_id: n.id, user_id: user.id }));
      if (!toMark.length) return;
      await supabase.from("notification_reads").upsert(toMark, { onConflict: "notification_id,user_id" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications-feed"] }),
  });

  return (
    <DropdownMenu onOpenChange={(o) => o && data?.unread && markAll.mutate()}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-9 rounded-lg relative">
          <Bell className="h-4 w-4" />
          {data?.unread ? (
            <span className="absolute top-1.5 right-1.5 h-4 min-w-4 px-1 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground grid place-items-center">
              {data.unread > 9 ? "9+" : data.unread}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">الإشعارات</h3>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {!data?.items.length ? (
            <p className="text-center text-sm text-muted-foreground py-8">لا توجد إشعارات</p>
          ) : (
            data.items.map((n) => (
              <a
                key={n.id}
                href={n.link ?? "#"}
                className={`block px-4 py-3 border-b last:border-0 hover:bg-accent transition ${
                  data.readIds.has(n.id) ? "" : "bg-primary/5"
                }`}
              >
                <p className="font-medium text-sm">{n.title}</p>
                {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                <p className="text-[10px] text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ar })}
                </p>
              </a>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
