import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const STORAGE_KEY = "sm_session_id";

function detectDeviceLabel(): string {
  if (typeof navigator === "undefined") return "Unknown";
  const ua = navigator.userAgent;
  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
  const browser = /Chrome/.test(ua) ? "Chrome" : /Firefox/.test(ua) ? "Firefox" : /Safari/.test(ua) ? "Safari" : "Browser";
  const os = /Windows/.test(ua) ? "Windows" : /Mac/.test(ua) ? "Mac" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Linux/.test(ua) ? "Linux" : "OS";
  return `${browser} · ${os}${isMobile ? " · Mobile" : ""}`;
}

function ensureLocalSessionId(): string {
  if (typeof window === "undefined") return "";
  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing) return existing;
  const id = (crypto as any)?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  localStorage.setItem(STORAGE_KEY, id);
  return id;
}

export function useSingleSession() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const claimedRef = useRef(false);

  useEffect(() => {
    if (!user) {
      claimedRef.current = false;
      return;
    }
    // Admins are exempt from single-session enforcement so they can manage from multiple devices
    if (role === "admin") return;

    const localSessionId = ensureLocalSessionId();
    const deviceLabel = detectDeviceLabel();
    const userAgent = typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null;

    let active = true;

    // Claim the active session (overwrites any previous device)
    (async () => {
      const { error } = await supabase.from("active_sessions").upsert(
        {
          user_id: user.id,
          session_id: localSessionId,
          device_label: deviceLabel,
          user_agent: userAgent,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "user_id" } as any
      );
      if (!error) claimedRef.current = true;
    })();

    // Listen for new device claims
    const channel = supabase
      .channel(`active_sessions:${user.id}`)
      .on(
        "postgres_changes" as any,
        { event: "UPDATE", schema: "public", table: "active_sessions", filter: `user_id=eq.${user.id}` },
        (payload: any) => {
          if (!active) return;
          const remote = payload?.new?.session_id;
          if (claimedRef.current && remote && remote !== localSessionId) {
            toast.error("تم تسجيل الخروج: حسابك مفتوح من جهاز آخر", { duration: 6000 });
            localStorage.removeItem(STORAGE_KEY);
            supabase.auth.signOut().finally(() => navigate({ to: "/login" }));
          }
        }
      )
      .subscribe();

    // Heartbeat
    const interval = window.setInterval(async () => {
      if (!active) return;
      await supabase
        .from("active_sessions")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("session_id", localSessionId);
    }, 60_000);

    return () => {
      active = false;
      supabase.removeChannel(channel);
      window.clearInterval(interval);
    };
  }, [user?.id, role, navigate]);
}
