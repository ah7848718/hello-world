import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";

function parseDeviceType(ua: string): string {
  const l = ua.toLowerCase();
  if (/mobile|android|iphone|ipad|ipod/i.test(l)) return "هاتف";
  if (/tablet|ipad/i.test(l)) return "تابلت";
  return "كمبيوتر";
}

function parseOS(ua: string): string {
  const l = ua.toLowerCase();
  if (l.includes("windows")) return "Windows";
  if (l.includes("mac os") || l.includes("macintosh")) return "macOS";
  if (l.includes("android")) return "Android";
  if (l.includes("iphone") || l.includes("ipad")) return "iOS";
  if (l.includes("linux")) return "Linux";
  return "غير معروف";
}

function parseBrowser(ua: string): string {
  const l = ua.toLowerCase();
  if (l.includes("edge") || l.includes("edg/")) return "Edge";
  if (l.includes("chrome")) return "Chrome";
  if (l.includes("firefox")) return "Firefox";
  if (l.includes("safari")) return "Safari";
  if (l.includes("opera") || l.includes("opr")) return "Opera";
  return "متصفح آخر";
}

export type AccountStatus = "pending" | "approved" | "rejected";
export type AppRole = "admin" | "student";

interface ProfileLite {
  id: string;
  full_name: string;
  status: AccountStatus;
  rejection_reason: string | null;
}

interface AuthCtx {
  user: User | null;
  session: Session | null;
  profile: ProfileLite | null;
  role: AppRole | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileLite | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const qc = useQueryClient();

  const loadProfile = async (uid: string) => {
    const [{ data: p }, { data: r }, { data: userData }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, status, rejection_reason")
        .eq("id", uid)
        .maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
      supabase.auth.getUser(),
    ]);
    setProfile(p as ProfileLite | null);
    const roles = (r ?? []).map((x: any) => x.role as AppRole);
    const userEmail = userData?.user?.email ?? "";
    const knownAdmins = ["admin@gmail.com"];
    setRole(
      roles.includes("admin") || knownAdmins.includes(userEmail)
        ? "admin"
        : roles.includes("student")
          ? "student"
          : null,
    );
  };

  const refresh = async () => {
    if (user) await loadProfile(user.id);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event: any, s: any) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setTimeout(() => loadProfile(s.user.id), 0);
        if (event === "SIGNED_IN" && typeof navigator !== "undefined") {
          try {
            const ua = navigator.userAgent;
            supabase.from("login_history").insert({
              user_id: s.user.id,
              event_type: "login",
              user_agent: ua,
              device_type: parseDeviceType(ua),
              device_name: navigator.platform || undefined,
              os: parseOS(ua),
              browser: parseBrowser(ua),
            });
          } catch {}
        }
      } else {
        setProfile(null);
        setRole(null);
      }
      router.invalidate();
      qc.invalidateQueries();
    });

    supabase.auth.getSession().then(async ({ data: { session: s } }: any) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) await loadProfile(s.user.id);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = async () => {
    if (user?.id && typeof navigator !== "undefined") {
      try {
        const ua = navigator.userAgent;
        await supabase.from("login_history").insert({
          user_id: user.id,
          event_type: "logout",
          user_agent: ua,
          device_type: parseDeviceType(ua),
          device_name: navigator.platform || undefined,
          os: parseOS(ua),
          browser: parseBrowser(ua),
        });
      } catch {}
    }
    await supabase.auth.signOut();
    setProfile(null);
    setRole(null);
  };

  return (
    <Ctx.Provider value={{ user, session, profile, role, loading, refresh, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}
