import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_BYPASS_IDS = ["4d317f50-9fed-4311-b98d-0d03b5b6b4f3"];
const ADMIN_EMAILS = ["admin@gmail.com"];

function isAdminByEmail(email: string | undefined) {
  return email ? ADMIN_EMAILS.includes(email) : false;
}

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw redirect({ to: "/login" });
    if (ADMIN_BYPASS_IDS.includes(userData.user.id)) return;
    if (isAdminByEmail(userData.user.email)) return;
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    if (!isAdmin) throw redirect({ to: "/dashboard" });
  },
  component: AdminLayout,
  head: () => ({ meta: [{ title: "لوحة الإدارة | HATEM SIMIKA" }] }),
});

function AdminLayout() {
  const { user, role, loading } = useAuth();
  const nav = useNavigate();
  const bypassed = user && (ADMIN_BYPASS_IDS.includes(user.id) || isAdminByEmail(user.email));

  useEffect(() => {
    if (!loading && role !== "admin" && !bypassed) nav({ to: "/dashboard" });
  }, [loading, role, nav, bypassed]);

  if (loading || (role !== "admin" && !bypassed)) {
    return (
      <div className="min-h-[70dvh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-dvh w-full bg-muted/30" dir="rtl">
        <AdminSidebar />
        <SidebarInset className="flex flex-1 flex-col">
          <AdminTopbar />
          <main className="flex-1 p-4 md:p-6 lg:p-8">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
