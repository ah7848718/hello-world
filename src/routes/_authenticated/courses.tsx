import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Loader2, ImageIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/courses")({
  component: Page,
  head: () => ({ meta: [{ title: "الكورسات | مستر حاتم سميكه" }] }),
});

type Course = {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  grade: string | null;
  term: string | null;
  month: string | null;
  price: number;
  discount_percent: number;
  is_free: boolean;
};

function detectGradeBucket(grade: string | null): "g1" | "g2" | "g3" | "other" {
  if (!grade) return "other";
  const g = grade.replace(/\s+/g, "");
  if (g.includes("أولى") || g.includes("اولى") || g.includes("1")) return "g1";
  if (g.includes("تانية") || g.includes("ثانية") || g.includes("2")) return "g2";
  if (g.includes("تالتة") || g.includes("ثالثة") || g.includes("3")) return "g3";
  return "other";
}

function Page() {
  const { profile, user } = useAuth();
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [termFilter, setTermFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const navigate = useNavigate();
  const { data: courses = [] } = useQuery({
    queryKey: ["student-courses", "published"],
    queryFn: async () => {
      const { data } = await supabase
        .from("courses").select("id,title,description,cover_url,grade,term,month,price,discount_percent,is_free")
        .eq("is_published", true).eq("is_center_only", false).order("order_index");
      return (data ?? []) as Course[];
    },
  });

  const { data: enrolledIds = new Set<string>() } = useQuery({
    queryKey: ["student-enrollments", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("enrollments").select("course_id").eq("student_id", user!.id).eq("status", "active");
      return new Set((data ?? []).map((e: any) => e.course_id));
    },
    enabled: !!user?.id,
  });

  const grades = useMemo(() => {
    const set = new Set<string>();
    courses.forEach((c) => c.grade && set.add(c.grade));
    return Array.from(set);
  }, [courses]);

  useEffect(() => {
    const pg = (profile as any)?.grade;
    if (pg) setGradeFilter(pg);
  }, [(profile as any)?.grade]);

  const matches = useRouterState({ select: (s) => s.matches });
  if (matches.some((m) => m.routeId === "/_authenticated/courses/$courseId")) {
    return <Outlet />;
  }

  const filteredCourses = courses.filter((c) => {
    if (gradeFilter !== "all" && c.grade !== gradeFilter) return false;
    if (termFilter !== "all" && c.term !== termFilter) return false;
    if (monthFilter !== "all" && c.month !== monthFilter) return false;
    return true;
  });

  const bucket = detectGradeBucket(gradeFilter === "all" ? null : gradeFilter);
  const showTerms = bucket === "g1" || gradeFilter === "all";
  const showMonths = bucket === "g2" || bucket === "g3";

  if (!courses.length) {
    return <div className="grid place-items-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="container max-w-7xl mx-auto px-4 pb-8 space-y-8">
      <div>
        <h1 className="text-3xl md:text-4xl font-display font-bold">الكورسات</h1>
        <p className="text-muted-foreground mt-2">اختر الكورس المناسب لك.</p>
      </div>

      {grades.length > 0 && (
        <Tabs value={gradeFilter} onValueChange={(v) => { setGradeFilter(v); setTermFilter("all"); setMonthFilter("all"); }}>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="all">الكل</TabsTrigger>
            {grades.map((g) => <TabsTrigger key={g} value={g}>{g}</TabsTrigger>)}
          </TabsList>
        </Tabs>
      )}

      {showTerms && (
        <Tabs value={termFilter} onValueChange={setTermFilter}>
          <TabsList>
            <TabsTrigger value="all">كل التيرمات</TabsTrigger>
            <TabsTrigger value="ترم أول">ترم أول</TabsTrigger>
            <TabsTrigger value="ترم ثاني">ترم ثاني</TabsTrigger>
          </TabsList>
        </Tabs>
      )}
      {showMonths && (
        <Tabs value={monthFilter} onValueChange={setMonthFilter}>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="all">كل الشهور</TabsTrigger>
            {Array.from(new Set(filteredCourses.map((c) => c.month).filter(Boolean) as string[])).map((m) => (
              <TabsTrigger key={m} value={m}>{m}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">الكورسات</h2>
        </div>
        {filteredCourses.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center text-muted-foreground">لا توجد كورسات مطابقة</CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredCourses.map((c, i) => {
              const enrolled = enrolledIds.has(c.id);
              return (
                <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow group relative">
                    <div
                      onClick={() => navigate({ to: "/courses/$courseId", params: { courseId: c.id } })}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate({ to: "/courses/$courseId", params: { courseId: c.id } }); } }}
                      className="absolute inset-0 z-10 rounded-xl cursor-pointer"
                      role="link"
                      tabIndex={0}
                    />
                    <div className="aspect-video bg-muted relative overflow-hidden">
                      {c.cover_url ? (
                        <img src={c.cover_url} alt={c.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="w-full h-full grid place-items-center text-muted-foreground"><ImageIcon className="h-10 w-10" /></div>
                      )}
                      {enrolled && <Badge className="absolute top-2 right-2 bg-green-600">مشترك</Badge>}
                      {c.is_free && !enrolled && <Badge className="absolute top-2 left-2 bg-emerald-500">مجاني</Badge>}
                    </div>
                    <CardContent className="p-4 space-y-2">
                      <h3 className="font-semibold line-clamp-1">{c.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        {[c.grade, c.term, c.month].filter(Boolean).join(" · ") || "—"}
                      </p>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-baseline gap-2">
                          {c.is_free ? (
                            <span className="text-sm font-bold text-green-600">مجاني</span>
                          ) : c.discount_percent > 0 ? (
                            <>
                              <span className="text-sm font-bold text-primary">{(c.price * (1 - c.discount_percent / 100)).toFixed(0)} ج</span>
                              <span className="text-xs text-muted-foreground line-through">{c.price} ج</span>
                              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">-{c.discount_percent}%</Badge>
                            </>
                          ) : (
                            <span className="text-sm font-bold text-primary">{c.price} ج</span>
                          )}
                        </div>
                        <div className="relative z-20">
                          {enrolled ? (
                            <Button asChild size="sm" variant="outline">
                              <Link to="/courses/$courseId" params={{ courseId: c.id }}>افتح</Link>
                            </Button>
                          ) : c.is_free ? (
                            <Button asChild size="sm">
                              <Link to="/courses/$courseId" params={{ courseId: c.id }}>اشترك مجاناً</Link>
                            </Button>
                          ) : (
                            <Button asChild size="sm">
                              <Link to="/payments/new" search={{ courseId: c.id } as any}>اشترك</Link>
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
