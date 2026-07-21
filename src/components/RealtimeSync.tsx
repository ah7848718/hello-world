import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { setupRealtimeSync } from "@/lib/realtime";

export function RealtimeSync() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    cleanupRef.current?.();

    if (!user?.id || !role) return;

    cleanupRef.current = setupRealtimeSync(supabase, queryClient, user.id, role);

    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [user?.id, role, queryClient]);

  return null;
}
