import { useImpersonation } from "@/hooks/useImpersonation";
import { useNavigate } from "@tanstack/react-router";
import { LogOut, ShieldAlert, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function ImpersonationBanner() {
  const { impersonating, exitImpersonation } = useImpersonation();
  const nav = useNavigate();
  const [exiting, setExiting] = useState(false);

  if (!impersonating) return null;

  const onExit = async () => {
    setExiting(true);
    try {
      await exitImpersonation();
      toast.success("رجعت لحساب الأدمن");
      nav({ to: "/admin" });
    } catch {
      toast.error("حصلت مشكلة في الخروج. سجل دخول تاني.");
      nav({ to: "/login" });
    } finally {
      setExiting(false);
    }
  };

  return (
    <div className="sticky top-0 z-[60] w-full bg-gradient-to-r from-purple-600 via-purple-700 to-fuchsia-700 text-white shadow-lg">
      <div className="container mx-auto px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm font-medium">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span>
            أنت داخل بحساب الطالب:{" "}
            <strong>{impersonating.studentName}</strong>
            <span className="opacity-75 ms-2 hidden sm:inline">({impersonating.studentEmail})</span>
          </span>
        </div>
        <button
          onClick={onExit}
          disabled={exiting}
          className="inline-flex items-center gap-1.5 rounded-full bg-white/15 hover:bg-white/25 px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60"
        >
          {exiting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
          ارجع لحساب الأدمن
        </button>
      </div>
    </div>
  );
}
