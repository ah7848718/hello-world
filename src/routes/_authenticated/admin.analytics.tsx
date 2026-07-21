import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, TrendingUp, Users, DollarSign, BookOpen, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Legend } from "recharts";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  component: Page,
  head: () => ({ meta: [{ title: "التحليلات | لوحة الإدارة" }] }),
});

type Range = "7d" | "30d" | "90d";

function Page() {
  const [range, setRange] = useState<Range>("30d");
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const since = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - days); return d.toISOString();
  }, [days]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-analytics", range],
    queryFn: async () => {
      const [payments, enrollments, students, courses] = await Promise.all([
        supabase.from("payments").select("amount, status, created_at, course_id").gte("created_at", since).limit(5000),
        supabase.from("enrollments").select("created_at, course_id").gte("created_at", since).limit(5000),
        supabase.from("profiles").select("id, status, created_at").gte("created_at", since).limit(5000),
        supabase.from("courses").select("id, title"),
      ]);
      return {
        payments: payments.data ?? [],
        enrollments: enrollments.data ?? [],
        students: students.data ?? [],
        courses: courses.data ?? [],
      };
    },
  });

  const stats = useMemo(() => {
    if (!data) return null;
    const approvedPayments = data.payments.filter((p: any) => p.status === "approved");
    const revenue = approvedPayments.reduce((s: number, p: any) => s + Number(p.amount ?? 0), 0);
    const pending = data.payments.filter((p: any) => p.status === "pending").length;

    // Daily revenue chart
    const dailyMap: Record<string, { date: string; revenue: number; enrollments: number; signups: number }> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dailyMap[key] = { date: key.slice(5), revenue: 0, enrollments: 0, signups: 0 };
    }
    approvedPayments.forEach((p: any) => {
      const k = String(p.created_at).slice(0, 10);
      if (dailyMap[k]) dailyMap[k].revenue += Number(p.amount ?? 0);
    });
    data.enrollments.forEach((e: any) => {
      const k = String(e.created_at).slice(0, 10);
      if (dailyMap[k]) dailyMap[k].enrollments += 1;
    });
    data.students.forEach((s: any) => {
      const k = String(s.created_at).slice(0, 10);
      if (dailyMap[k]) dailyMap[k].signups += 1;
    });

    // Top courses
    const courseMap = new Map(data.courses.map((c: any) => [c.id, c.title]));
    const perCourse: Record<string, { name: string; revenue: number; enrollments: number }> = {};
    approvedPayments.forEach((p: any) => {
      const id = p.course_id; if (!id) return;
      const name = (courseMap.get(id) as string) ?? "—";
      if (!perCourse[id]) perCourse[id] = { name, revenue: 0, enrollments: 0 };
      perCourse[id].revenue += Number(p.amount ?? 0);
    });
    data.enrollments.forEach((e: any) => {
      const id = e.course_id; if (!id) return;
      const name = (courseMap.get(id) as string) ?? "—";
      if (!perCourse[id]) perCourse[id] = { name, revenue: 0, enrollments: 0 };
      perCourse[id].enrollments += 1;
    });
    const topCourses = Object.values(perCourse).sort((a, b) => b.revenue - a.revenue).slice(0, 8);

    return {
      revenue, pending,
      enrollments: data.enrollments.length,
      signups: data.students.length,
      daily: Object.values(dailyMap),
      topCourses,
    };
  }, [data, days]);

  const exportCsv = () => {
    if (!stats) return;
    const rows = [["date", "revenue", "enrollments", "signups"], ...stats.daily.map((d) => [d.date, d.revenue, d.enrollments, d.signups])];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = `analytics-${range}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">التحليلات</h1>
          <p className="text-muted-foreground mt-1 text-sm">نظرة شاملة على أداء المنصة.</p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={range} onValueChange={(v) => setRange(v as Range)}>
            <TabsList>
              <TabsTrigger value="7d">7 أيام</TabsTrigger>
              <TabsTrigger value="30d">30 يوم</TabsTrigger>
              <TabsTrigger value="90d">90 يوم</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4 me-2" />تصدير</Button>
        </div>
      </div>

      {isLoading || !stats ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={<DollarSign className="h-5 w-5" />} label="الإيرادات" value={`${stats.revenue.toLocaleString()} ج`} />
            <StatCard icon={<Users className="h-5 w-5" />} label="تسجيلات جديدة" value={stats.signups} />
            <StatCard icon={<BookOpen className="h-5 w-5" />} label="اشتراكات الكورسات" value={stats.enrollments} />
            <StatCard icon={<TrendingUp className="h-5 w-5" />} label="مدفوعات معلّقة" value={stats.pending} />
          </div>

          <Card>
            <CardContent className="p-5">
              <h2 className="font-semibold mb-4">الإيرادات اليومية</h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.daily}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="date" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip />
                    <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="hsl(var(--primary)/0.2)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-5">
                <h2 className="font-semibold mb-4">التسجيلات والاشتراكات</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.daily}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="date" fontSize={11} />
                      <YAxis fontSize={11} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="signups" name="تسجيلات" fill="hsl(var(--primary))" />
                      <Bar dataKey="enrollments" name="اشتراكات" fill="hsl(var(--accent))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <h2 className="font-semibold mb-4">أعلى الكورسات أداءً</h2>
                <div className="space-y-2">
                  {stats.topCourses.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">لا توجد بيانات</p>
                  ) : stats.topCourses.map((c, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.enrollments} اشتراك</p>
                      </div>
                      <Badge>{c.revenue.toLocaleString()} ج</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="h-11 w-11 grid place-items-center rounded-xl bg-primary/10 text-primary">{icon}</div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-display font-bold text-xl truncate">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-primary/10 text-primary whitespace-nowrap">{children}</span>;
}
