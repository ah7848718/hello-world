import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import {
  Shield, History, Smartphone, Monitor, Globe,
  Loader2, CheckCircle2, LogIn, LogOut,
} from "lucide-react";

type LoginEvent = {
  id: string;
  event_type: "login" | "logout";
  device_type: string | null;
  device_name: string | null;
  os: string | null;
  browser: string | null;
  user_agent: string | null;
  created_at: string;
};

function deviceTypeIcon(dt: string | null, ua: string | null) {
  const l = (ua || dt || "").toLowerCase();
  if (/mobile|android|iphone|ipad|phone/i.test(l)) return <Smartphone className="h-5 w-5" />;
  if (/tablet|ipad/i.test(l)) return <Monitor className="h-5 w-5" />;
  return <Monitor className="h-5 w-5" />;
}

export function SecuritySection() {
  const { user } = useAuth();
  const [events, setEvents] = useState<LoginEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase
        .from("login_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setEvents((data as any) ?? []);
      setLoading(false);
    })();
  }, [user?.id]);

  if (loading) return <Card><CardContent className="p-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></CardContent></Card>;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const todayLogins = events.filter((e) => e.event_type === "login" && e.created_at >= todayStart).length;
  const todayLogouts = events.filter((e) => e.event_type === "logout" && e.created_at >= todayStart).length;
  const currentSession = events.find((e) => e.event_type === "login");

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-red-500" />
        <h2 className="text-xl font-bold">الأمان وتسجيل الدخول</h2>
      </div>

      {/* Today's stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-200 text-blue-700">
              <LogIn className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-700">{todayLogins}</p>
              <p className="text-xs text-blue-600/70">عدد مرات الدخول اليوم</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-orange-200 text-orange-700">
              <LogOut className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-700">{todayLogouts}</p>
              <p className="text-xs text-orange-600/70">عدد مرات الخروج اليوم</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current active session */}
      {currentSession && (
        <Card className="border-2 border-emerald-200 bg-emerald-50/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-emerald-100 text-emerald-700">
              {deviceTypeIcon(currentSession.device_type, currentSession.user_agent)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-sm">
                  {currentSession.device_name || "جهاز حالي"}
                </p>
                <Badge variant="secondary" className="text-xs">
                  <CheckCircle2 className="h-3 w-3 ml-1" />نشط الآن
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {currentSession.os && `${currentSession.os} · `}
                {currentSession.browser && `${currentSession.browser} · `}
                {currentSession.device_type}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Login history table */}
      {events.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">لا توجد أحداث دخول مسجلة</CardContent></Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground text-xs font-semibold">
                <th className="p-3 text-center whitespace-nowrap">نوع الجهاز</th>
                <th className="p-3 text-center whitespace-nowrap">اسم الجهاز</th>
                <th className="p-3 text-center whitespace-nowrap">نظام التشغيل</th>
                <th className="p-3 text-center whitespace-nowrap">المتصفح</th>
                <th className="p-3 text-center whitespace-nowrap">آخر نشاط</th>
                <th className="p-3 text-center whitespace-nowrap">تاريخ تسجيل الدخول</th>
              </tr>
            </thead>
            <tbody>
              {events.filter((e) => e.event_type === "login").map((e, i) => (
                <tr key={e.id} className="border-t hover:bg-muted/30 transition-colors">
                  <td className="p-3 text-center">
                    <span className="inline-flex items-center gap-1.5">
                      {deviceTypeIcon(e.device_type, e.user_agent)}
                      <span>{e.device_type || "—"}</span>
                    </span>
                  </td>
                  <td className="p-3 text-center text-xs max-w-[120px] truncate" title={e.device_name || ""}>
                    {e.device_name || "—"}
                  </td>
                  <td className="p-3 text-center text-xs">{e.os || "—"}</td>
                  <td className="p-3 text-center text-xs">{e.browser || "—"}</td>
                  <td className="p-3 text-center text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(e.created_at).toLocaleString("ar-EG")}
                  </td>
                  <td className="p-3 text-center text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(e.created_at).toLocaleString("ar-EG")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function PersonalExamSection() {
  const { user } = useAuth();
  const [exams, setExams] = useState<{ id: string; title: string; status: string; score: number | null; max_score: number | null }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data: assignData } = await supabase
        .from("exam_assignments")
        .select("exam_id, exams!inner(id, title)")
        .eq("student_id", user.id)
        .order("assigned_at", { ascending: false });
      const assigned = (assignData ?? []) as any[];
      if (assigned.length > 0) {
        const ids = assigned.map((a: any) => a.exam_id);
        const { data: attData } = await supabase
          .from("exam_attempts")
          .select("exam_id, status, score, max_score")
          .eq("student_id", user.id)
          .in("exam_id", ids);
        const attMap = new Map((attData ?? []).map((a: any) => [a.exam_id, a]));
        setExams(assigned.map((a: any) => {
          const att = attMap.get(a.exam_id);
          return {
            id: a.exam_id, title: a.exams?.title ?? "",
            status: att?.status ?? "pending",
            score: att?.score ?? null, max_score: att?.max_score ?? null,
          };
        }));
      }
      setLoading(false);
    })();
  }, [user?.id]);

  if (loading) return <Card><CardContent className="p-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></CardContent></Card>;
  if (exams.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <History className="h-5 w-5 text-violet-500" />
        <h2 className="text-xl font-bold">امتحان خاص بيك</h2>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {exams.map((e, i) => (
          <motion.div key={e.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
            <Card>
              <CardContent className="p-3 flex items-center gap-3">
                <div className={`p-1.5 rounded-lg ${
                  e.status === "graded" ? "bg-green-100 text-green-700" :
                  e.status === "in_progress" ? "bg-blue-100 text-blue-700" : "bg-violet-100 text-violet-700"
                }`}>
                  <History className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{e.title}</p>
                </div>
                {e.status === "graded" || e.status === "submitted" ? (
                  <Badge className="bg-green-600 shrink-0 text-xs">{e.score ?? "?"}/{e.max_score ?? "?"}</Badge>
                ) : e.status === "in_progress" ? (
                  <Badge variant="secondary" className="shrink-0 text-xs">متابعة</Badge>
                ) : (
                  <Badge variant="outline" className="shrink-0 text-xs">جديد</Badge>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
