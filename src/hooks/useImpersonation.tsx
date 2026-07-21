import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

const BACKUP_KEY = "admin_session_backup";
const IMPERSONATING_KEY = "impersonating_as";

interface ImpersonationInfo {
  studentId: string;
  studentName: string;
  studentEmail: string;
}

interface Ctx {
  impersonating: ImpersonationInfo | null;
  startImpersonation: (info: ImpersonationInfo & { tokenHash: string }) => Promise<void>;
  exitImpersonation: () => Promise<void>;
}

const ImpersonationCtx = createContext<Ctx | null>(null);

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [impersonating, setImpersonating] = useState<ImpersonationInfo | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = sessionStorage.getItem(IMPERSONATING_KEY);
    if (raw) {
      try {
        setImpersonating(JSON.parse(raw));
      } catch {
        sessionStorage.removeItem(IMPERSONATING_KEY);
      }
    }
  }, []);

  const startImpersonation: Ctx["startImpersonation"] = async (info) => {
    // Backup current admin session
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      sessionStorage.setItem(
        BACKUP_KEY,
        JSON.stringify({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        }),
      );
    }

    // Sign in as student via the magiclink token
    const { error } = await supabase.auth.verifyOtp({
      token_hash: info.tokenHash,
      type: "magiclink",
    });
    if (error) {
      sessionStorage.removeItem(BACKUP_KEY);
      throw error;
    }

    const payload: ImpersonationInfo = {
      studentId: info.studentId,
      studentName: info.studentName,
      studentEmail: info.studentEmail,
    };
    sessionStorage.setItem(IMPERSONATING_KEY, JSON.stringify(payload));
    setImpersonating(payload);
  };

  const exitImpersonation: Ctx["exitImpersonation"] = async () => {
    const raw = sessionStorage.getItem(BACKUP_KEY);
    sessionStorage.removeItem(BACKUP_KEY);
    sessionStorage.removeItem(IMPERSONATING_KEY);
    setImpersonating(null);
    if (!raw) {
      await supabase.auth.signOut();
      return;
    }
    try {
      const tokens = JSON.parse(raw);
      await supabase.auth.setSession({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
      });
    } catch {
      await supabase.auth.signOut();
    }
  };

  return (
    <ImpersonationCtx.Provider value={{ impersonating, startImpersonation, exitImpersonation }}>
      {children}
    </ImpersonationCtx.Provider>
  );
}

export function useImpersonation() {
  const v = useContext(ImpersonationCtx);
  if (!v) throw new Error("useImpersonation must be used within ImpersonationProvider");
  return v;
}
