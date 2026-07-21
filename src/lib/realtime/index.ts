import type { QueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminSubscriptions, getStudentSubscriptions, type RealtimeTableConfig } from "./config";
import { realtimeEventBus } from "./eventBus";

const CHANNEL_NAME = "realtime-sync";

export function setupRealtimeSync(
  supabase: SupabaseClient,
  queryClient: QueryClient,
  userId: string,
  role: "admin" | "student" | null,
): () => void {
  if (!userId || !role) return () => {};

  const configs: RealtimeTableConfig[] =
    role === "admin"
      ? getAdminSubscriptions(userId)
      : getStudentSubscriptions(userId);

  const channel = supabase.channel(CHANNEL_NAME);

  for (const cfg of configs) {
    for (const event of cfg.events) {
      channel.on(
        "postgres_changes" as any,
        {
          event,
          schema: "public",
          table: cfg.table,
          ...(cfg.filter ? { filter: cfg.filter } : {}),
        },
        (payload: any) => {
          cfg.invalidate(queryClient, payload, userId);
          if ((cfg as any).emit) {
            realtimeEventBus.emit((cfg as any).emit);
          }
        },
      );
    }
  }

  channel.subscribe((status: string) => {
    if (status === "SUBSCRIBED") {
      console.debug(`[Realtime] Synced ${configs.length} table subscriptions for ${role}`);
    }
    if (status === "CHANNEL_ERROR") {
      console.warn(`[Realtime] Channel error for ${role}, will auto-reconnect`);
    }
  });

  return () => {
    supabase.removeChannel(channel);
  };
}
