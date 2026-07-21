import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Users, BookOpen, CreditCard, FileQuestion, PlayCircle, GraduationCap, ArrowUpRight } from "lucide-react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect } from "react";
import {
  Area, AreaChart, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
  head: () => ({ meta: [{ title: "الرئيسية | لوحة الإدارة" }] }),
});

function Counter({ value }: { value: number }) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v: number) => Math.round(v).toLocaleString("ar-EG"));
  useEffect(() => {
    const ctl = animate(mv, value, { duration: 1.2, ease: "easeOut" });
    return ctl.stop;
  }, [value, mv]);
  return <motion.span>{rounded}</motion.span>;
}

function KpiCard({ title, value, icon: Icon, accent, delay = 0 }: {
  title: string; value: number; icon: any; accent: string; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card className="overflow-hidden border-border/60 shadow-soft hover:shadow-card transition">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{title}</p>
              <p className="mt-2 text-3xl font-display font-bold tracking-tight">
                <Counter value={value} />
              </p>
            </div>
            <div className={`grid h-11 w-11 place-items-center rounded-xl ${accent}`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [students, approved, courses, exams, lectures, payments] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("courses").select("id", { count: "exact", head: true }),
        supabase.from("exams").select("id", { count: "exact", head: true }),
        supabase.from("lectures").select("id", { count: "exact", head: true }),
        supabase.from("payments").select("amount").eq("status", "approved"),
      ]);
      const revenue = (payments.data ?? []).reduce((s: number, r: any) => s + Number(r.amount ?? 0), 0);
      return {
        students: students.count ?? 0,
        approved: approved.count ?? 0,
        courses: courses.count ?? 0,
        exams: exams.count ?? 0,
        lectures: lectures.count ?? 0,
        revenue,
      };
    },
  });

  const { data: lastReg } = useQuery({
    queryKey: ["admin-last-registrations"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, school, status, created_at")
        .order("created_at", { ascending: false })
        .limit(6);
      return data ?? [];
    },
  });

  const { data: lastPay } = useQuery({
    queryKey: ["admin-last-payments"],
    queryFn: async () => {
      const { data } = await supabase
        .from("payments")
        .select("id, amount, status, method, created_at")
        .order("created_at", { ascending: false })
        .limit(6);
      return data ?? [];
    },
  });

  const { data: chartData } = useQuery({
    queryKey: ["admin-chart-data"],
    queryFn: async () => {
      const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString();
      const [paymentsRes, profilesRes] = await Promise.all([
        supabase.from("payments").select("amount, created_at").eq("status", "approved").gte("created_at", fourteenDaysAgo).order("created_at"),
        supabase.from("profiles").select("created_at").gte("created_at", fourteenDaysAgo).order("created_at"),
      ]);
      const days: { [key: string]: { revenue: number; signups: number } } = {};
      for (let i = 0; i < 14; i++) {
        const d = new Date(Date.now() - i * 86400000);
        const key = d.toISOString().slice(0, 10);
        days[key] = { revenue: 0, signups: 0 };
      }
      for (const p of paymentsRes.data ?? []) {
        const key = new Date(p.created_at).toISOString().slice(0, 10);
        if (days[key]) days[key].revenue += Number(p.amount) || 0;
      }
      for (const p of profilesRes.data ?? []) {
        const key = new Date(p.created_at).toISOString().slice(0, 10);
        if (days[key]) days[key].signups += 1;
      }
      return Object.entries(days)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([day, vals]) => ({ day: new Date(day).getDate().toString(), ...vals }));
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">مرحباً بك في لوحة التحكم</h1>
        <p className="text-muted-foreground mt-1 text-sm">نظرة عامة على نشاط المنصة.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard title="إجمالي الطلاب" value={stats?.students ?? 0} icon={Users} accent="bg-gradient-to-br from-blue-500 to-blue-700" delay={0.0} />
        <KpiCard title="مشتركون نشطون" value={stats?.approved ?? 0} icon={GraduationCap} accent="bg-gradient-to-br from-emerald-500 to-emerald-700" delay={0.05} />
        <KpiCard title="الكورسات" value={stats?.courses ?? 0} icon={BookOpen} accent="bg-gradient-to-br from-violet-500 to-violet-700" delay={0.1} />
        <KpiCard title="المحاضرات" value={stats?.lectures ?? 0} icon={PlayCircle} accent="bg-gradient-to-br from-orange-500 to-orange-700" delay={0.15} />
        <KpiCard title="الامتحانات" value={stats?.exams ?? 0} icon={FileQuestion} accent="bg-gradient-to-br from-pink-500 to-pink-700" delay={0.2} />
        <KpiCard title="الأرباح (ج.م)" value={stats?.revenue ?? 0} icon={CreditCard} accent="bg-gradient-to-br from-rose-500 to-rose-700" delay={0.25} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-border/60 shadow-soft">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">الأرباح آخر 14 يوم</h3>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData ?? []}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(220 70% 55%)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(220 70% 55%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(220 70% 55%)" strokeWidth={2} fill="url(#rev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-soft">
          <CardContent className="p-5">
            <h3 className="font-semibold mb-4">التسجيلات اليومية</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData ?? []}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="signups" fill="hsl(160 70% 45%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/60 shadow-soft">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">آخر التسجيلات</h3>
              <Link to="/admin/students" className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
                الكل <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="divide-y">
              {(lastReg ?? []).map((r: any) => (
                <div key={r.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium">{r.full_name}</p>
                    <p className="text-xs text-muted-foreground">{r.school}</p>
                  </div>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full ${
                    r.status === "approved" ? "bg-emerald-100 text-emerald-700"
                    : r.status === "rejected" ? "bg-rose-100 text-rose-700"
                    : "bg-amber-100 text-amber-700"}`}>
                    {r.status === "approved" ? "مقبول" : r.status === "rejected" ? "مرفوض" : "قيد المراجعة"}
                  </span>
                </div>
              ))}
              {!(lastReg ?? []).length && <p className="text-center text-sm text-muted-foreground py-6">لا توجد تسجيلات بعد.</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-soft">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">آخر المدفوعات</h3>
              <Link to="/admin/payments" className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
                الكل <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="divide-y">
              {(lastPay ?? []).map((p: any) => (
                <div key={p.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium">{Number(p.amount).toLocaleString("ar-EG")} ج.م</p>
                    <p className="text-xs text-muted-foreground">{p.method === "vcash" ? "Vodafone Cash" : "InstaPay"}</p>
                  </div>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full ${
                    p.status === "approved" ? "bg-emerald-100 text-emerald-700"
                    : p.status === "rejected" ? "bg-rose-100 text-rose-700"
                    : "bg-amber-100 text-amber-700"}`}>
                    {p.status === "approved" ? "موافق" : p.status === "rejected" ? "مرفوض" : "قيد المراجعة"}
                  </span>
                </div>
              ))}
              {!(lastPay ?? []).length && <p className="text-center text-sm text-muted-foreground py-6">لا توجد مدفوعات بعد.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
