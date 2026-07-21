import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSingleSession } from "@/hooks/useSingleSession";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const ADMIN_EMAILS = ["admin@gmail.com"];

function isAdmin(user: any, role: string | null) {
  return role === "admin" || (user?.email && ADMIN_EMAILS.includes(user.email));
}

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    // SSR: skip auth check (no session available); client gate handles it
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/login" });
    }
  },
  component: AuthGate,
});

function AuthGate() {
  const { loading, user, profile, role } = useAuth();
  const nav = useNavigate();
  useSingleSession();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      nav({ to: "/login" });
      return;
    }
    // Admins bypass status check
    if (isAdmin(user, role)) return;
    // Students must be approved
    if (!profile || profile.status !== "approved") {
      nav({ to: "/pending" });
    }
  }, [loading, user, profile, role, nav]);

  if (loading || !user || (!isAdmin(user, role) && profile?.status !== "approved")) {
    return (
      <div className="min-h-[60dvh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <Outlet />;
}
