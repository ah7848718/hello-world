import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Package,
  Loader2,
  ImageIcon,
  Sparkles,
  ArrowLeft,
  CalendarDays,
  GraduationCap,
  CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/grades/$gradeKey")({
  component: GradePage,
  beforeLoad: ({ params }) => {
    if (!["g1", "g2", "g3"].includes(params.gradeKey)) throw notFound();
  },
  head: ({ params }) => {
    const meta: Record<string, { title: string; desc: string }> = {
      g1: { title: "الصف الأول الثانوي — كورسات مستر حاتم سميكه", desc: "كورسات الصف الأول الثانوي مقسمة على الترم الأول والترم الثاني مع باقة الترم كامل." },
      g2: { title: "الصف الثاني الثانوي — كورسات مستر حاتم سميكه", desc: "كورسات الصف الثاني الثانوي شهر بشهر مع باقات الـ 3 شهور الموفّرة." },
      g3: { title: "الصف الثالث الثانوي — كورسات مستر حاتم سميكه", desc: "كورسات الصف الثالث الثانوي شهر بشهر ومراجعات مكثفة للثانوية العامة." },
    };
    const m = meta[params.gradeKey] ?? meta.g1;
    return { meta: [{ title: m.title }, { name: "description", content: m.desc }] };
  },
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
  order_index: number;
};

type Bundle = {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  grade: string | null;
  bundle_type: string;
  term: string | null;
  months: string[] | null;
  price: number;
  discount_percent: number;
  order_index: number;
};

function detectGradeBucket(grade: string | null): "g1" | "g2" | "g3" | "other" {
  if (!grade) return "other";
  const g = grade.replace(/\s+/g, "");
  if (g.includes("أولى") || g.includes("اولى") || g.includes("1")) return "g1";
  if (g.includes("تانية") || g.includes("ثانية") || g.includes("2")) return "g2";
  if (g.includes("تالتة") || g.includes("ثالثة") || g.includes("3")) return "g3";
  return "other";
}

const GRADE_INFO: Record<string, { tag: string; name: string; tint: string; ring: string; subtitle: string }> = {
  g1: {
    tag: "1ث",
    name: "الصف الأول الثانوي",
    tint: "from-sky-500/15 via-primary/5 to-transparent",
    ring: "ring-sky-500/30",
    subtitle: "أساسيات قوية في القواعد والكلمات لبداية متميزة",
  },
  g2: {
    tag: "2ث",
    name: "الصف الثاني الثانوي",
    tint: "from-violet-500/15 via-primary/5 to-transparent",
    ring: "ring-violet-500/30",
    subtitle: "بناء على ما تعلمته بأسلوب أعمق وتدريبات أقوى",
  },
  g3: {
    tag: "3ث",
    name: "الصف الثالث الثانوي",
    tint: "from-rose-500/15 via-primary/5 to-transparent",
    ring: "ring-rose-500/30",
    subtitle: "استعداد كامل للثانوية العامة ومراجعات مكثفة",
  },
};

const MONTH_ORDER = [
  "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر", "يناير",
  "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس",
];

function GradePage() {
  const { gradeKey } = Route.useParams();
  const info = GRADE_INFO[gradeKey];
  const { user, profile } = useAuth();
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
  const isApproved = (profile as any)?.status === "approved";

  useEffect(() => {
    (async () => {
      const [{ data: cs }, { data: bs }] = await Promise.all([
        supabase
          .from("courses")
          .select("id,title,description,cover_url,grade,term,month,price,discount_percent,order_index")
          .eq("is_published", true)
          .eq("is_center_only", false)
          .order("order_index"),
        supabase
          .from("bundles")
          .select("*")
          .eq("is_published", true)
          .order("order_index"),
      ]);
      setCourses(((cs ?? []) as Course[]).filter((c) => detectGradeBucket(c.grade) === gradeKey));
      setBundles(((bs ?? []) as Bundle[]).filter((b) => detectGradeBucket(b.grade) === gradeKey));
      if (user) {
        const { data: en } = await supabase
          .from("enrollments")
          .select("course_id")
          .eq("status", "active");
        setEnrolledIds(new Set((en ?? []).map((e: any) => e.course_id)));
      }
    })();
  }, [gradeKey, user?.id]);

  const isG1 = gradeKey === "g1";

  // Group courses — always show the structure even if empty
  const groups = useMemo(() => {
    const list = courses ?? [];
    if (isG1) {
      const t1 = list.filter((c) => (c.term ?? "").includes("أول") || (c.term ?? "").includes("اول"));
      const t2 = list.filter((c) => (c.term ?? "").includes("ثاني") || (c.term ?? "").includes("تاني"));
      return [
        { key: "t1", label: "الترم الأول", icon: BookOpen, courses: t1 },
        { key: "t2", label: "الترم الثاني", icon: BookOpen, courses: t2 },
      ];
    }
    // For g2/g3: show all 9 study months, populate from data
    const studyMonths = ["سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر", "يناير", "فبراير", "مارس", "أبريل", "مايو"];
    const byMonth = new Map<string, Course[]>();
    for (const m of studyMonths) byMonth.set(m, []);
    for (const c of list) {
      const m = c.month ?? "";
      if (byMonth.has(m)) byMonth.get(m)!.push(c);
      else {
        if (!byMonth.has(m || "بدون شهر")) byMonth.set(m || "بدون شهر", []);
        byMonth.get(m || "بدون شهر")!.push(c);
      }
    }
    return Array.from(byMonth.entries())
      .sort((a, b) => {
        const ai = MONTH_ORDER.indexOf(a[0]);
        const bi = MONTH_ORDER.indexOf(b[0]);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      })
      .map(([m, cs]) => ({ key: m, label: m, icon: CalendarDays, courses: cs }));
  }, [courses, isG1]);

  if (!info) return null;
  if (courses === null) {
    return (
      <div className="min-h-[50vh] grid place-items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Hero */}
      <section className={`relative overflow-hidden border-b border-border bg-gradient-to-b ${info.tint}`}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 -end-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-24 -start-16 h-72 w-72 rounded-full bg-brand-gold/10 blur-3xl" />
        </div>
        <div className="relative container mx-auto px-4 py-16 lg:py-24">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" /> رجوع للرئيسية
          </Link>
          <div className="flex items-start gap-5">
            <div className={`shrink-0 grid place-items-center h-20 w-20 rounded-3xl bg-card ring-1 ${info.ring} shadow-card`}>
              <span className="font-display font-black text-3xl text-primary">{info.tag}</span>
            </div>
            <div>
              <h1 className="font-display text-4xl md:text-5xl font-extrabold text-foreground">
                {info.name}
              </h1>
              <p className="mt-3 text-muted-foreground max-w-xl">{info.subtitle}</p>
              <div className="mt-5 flex flex-wrap items-center gap-4 text-sm">
                <span className="inline-flex items-center gap-2 text-foreground/80">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  {isG1 ? "مقسّم على الترم الأول و الترم الثاني" : "مقسّم شهريًا للوصول السهل"}
                </span>
                <span className="inline-flex items-center gap-2 text-foreground/80">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  {isG1 ? "باقة الترم الكامل بسعر موفّر" : "باقة الـ 3 شهور بسعر موفّر"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs Section */}
      <GradeTabs
        gradeKey={gradeKey}
        info={info}
        groups={groups}
        bundles={bundles}
        enrolledIds={enrolledIds}
        user={user}
        isApproved={isApproved}
      />
    </div>
  );
}

// ------------------ Tabs Component ------------------

type Group = { key: string; label: string; icon: any; courses: Course[] };

function GradeTabs({
  gradeKey,
  info,
  groups,
  bundles,
  enrolledIds,
  user,
  isApproved,
}: {
  gradeKey: string;
  info: typeof GRADE_INFO[string];
  groups: Group[];
  bundles: Bundle[];
  enrolledIds: Set<string>;
  user: any;
  isApproved: boolean;
}) {
  const isMonthlyGrade = gradeKey === "g2" || gradeKey === "g3";
  const tabs: { key: string; label: string; icon: any; kind: "courses" | "bundles" | "monthly"; group?: Group }[] = isMonthlyGrade
    ? [
        { key: "__monthly", label: "باقات الشهور المنفصلة", icon: CalendarDays, kind: "monthly" as const },
        { key: "__bundles", label: "باقة الـ 3 شهور", icon: Sparkles, kind: "bundles" as const },
      ]
    : [
        ...groups.map((g) => ({ key: g.key, label: g.label, icon: g.icon, kind: "courses" as const, group: g })),
        {
          key: "__bundles",
          label: gradeKey === "g1" ? "الباقة الكاملة" : "باقة الـ 3 شهور",
          icon: Sparkles,
          kind: "bundles" as const,
        },
      ];

  const [active, setActive] = useState<string>(tabs[0]?.key ?? "");
  useEffect(() => {
    if (tabs.length && !tabs.find((t) => t.key === active)) setActive(tabs[0].key);
  }, [tabs.map((t) => t.key).join("|")]);

  const activeTab = tabs.find((t) => t.key === active) ?? tabs[0];

  return (
    <section className="container mx-auto px-4 pb-12">
      {/* Tab pills */}
      <div className="sticky top-[64px] z-20 -mx-4 px-4 pb-4 mb-8 bg-gradient-to-b from-background via-background to-background/0">
        <div className="flex gap-2 overflow-x-auto no-scrollbar p-1.5 rounded-2xl bg-card/70 backdrop-blur border border-border shadow-card">
          {tabs.map((t) => {
            const isActive = t.key === active;
            const isBundles = t.kind === "bundles";
            return (
              <button
                key={t.key}
                onClick={() => setActive(t.key)}
                className={`relative shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? isBundles
                      ? "bg-gradient-to-l from-[var(--brand-red)] to-[var(--royal)] text-white shadow-lg shadow-[color-mix(in_oklab,var(--brand-red)_35%,transparent)]"
                      : "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
                {isBundles && !isActive && (
                  <span className="ms-1 inline-flex h-5 px-1.5 items-center rounded-full bg-[color-mix(in_oklab,var(--brand-red)_15%,transparent)] text-[var(--brand-red)] text-[10px] font-bold">
                    وفّر
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab.kind === "bundles" ? (
        <BundlesShowcase
          bundles={bundles}
          gradeKey={gradeKey}
          user={user}
          isApproved={isApproved}
        />
      ) : activeTab.kind === "monthly" ? (
        <MonthlyPackages
          groups={groups}
          enrolledIds={enrolledIds}
          user={user}
          isApproved={isApproved}
          info={info}
        />
      ) : (
        <CoursesGrid
          group={activeTab.group!}
          info={info}
          enrolledIds={enrolledIds}
          user={user}
          isApproved={isApproved}
        />
      )}
    </section>
  );
}

function MonthlyPackages({
  groups,
  enrolledIds,
  user,
  isApproved,
  info,
}: {
  groups: Group[];
  enrolledIds: Set<string>;
  user: any;
  isApproved: boolean;
  info: typeof GRADE_INFO[string];
}) {
  const [activeMonth, setActiveMonth] = useState<string>(groups[0]?.key ?? "");

  useEffect(() => {
    if (!groups.some((g) => g.key === activeMonth)) {
      setActiveMonth(groups[0]?.key ?? "");
    }
  }, [groups.map((g) => g.key).join("|"), activeMonth]);

  const activeGroup = groups.find((g) => g.key === activeMonth);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-8"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {groups.map((group) => (
          <button
            key={group.key}
            type="button"
            onClick={() => setActiveMonth(group.key)}
            className={`rounded-3xl border p-5 text-start transition-all ${
              group.key === activeMonth
                ? "border-primary bg-primary/10 shadow-lg shadow-primary/10"
                : "border-border bg-card hover:border-primary/50 hover:bg-primary/5"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="h-11 w-11 rounded-2xl bg-primary/10 text-primary grid place-items-center">
                <group.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold text-lg">{group.label}</p>
                <p className="text-sm text-muted-foreground">{group.courses.length} كورس</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">اضغط لعرض تفاصيل الكورسات لهذا الشهر.</p>
          </button>
        ))}
      </div>

      {activeGroup ? (
        <div className="space-y-4">
          <div className="rounded-3xl border border-primary/20 bg-primary/5 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs text-muted-foreground">الشهر المحدد</p>
                <h2 className="font-display text-2xl font-bold">{activeGroup.label}</h2>
              </div>
              <div className="rounded-2xl bg-white/90 px-4 py-3 shadow-sm text-sm text-foreground">
                {activeGroup.courses.length} كورس متاح
              </div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              هذه الصفحة تعرض الشهور المنفصلة لكل صف، وعند الضغط على أي شهر تظهر لك تفاصيل الكورسات الموجودة فيه وأسعار كل واحد.
            </p>
          </div>

          <CoursesGrid
            group={activeGroup}
            info={info}
            enrolledIds={enrolledIds}
            user={user}
            isApproved={isApproved}
          />
        </div>
      ) : (
        <Card className="border-dashed bg-muted/20">
          <CardContent className="p-12 text-center space-y-3">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 grid place-items-center text-primary">
              <CalendarDays className="h-7 w-7" />
            </div>
            <p className="font-semibold text-foreground">لا توجد أنشطة لهذا الشهر</p>
            <p className="text-sm text-muted-foreground">
              لم يتم إضافة كورسات لهذا الشهر بعد. تابع الإدارة لتحديث باقات الشهور من لوحة الداشبورد.
            </p>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}

function CoursesGrid({
  group,
  info,
  enrolledIds,
  user,
  isApproved,
}: {
  group: Group;
  info: typeof GRADE_INFO[string];
  enrolledIds: Set<string>;
  user: any;
  isApproved: boolean;
}) {
  const navigate = useNavigate();
  return (
    <motion.div
      key={group.key}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-3">
        <span className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center">
          <group.icon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-display text-2xl font-bold">{group.label}</h2>
          <p className="text-xs text-muted-foreground">{group.courses.length} كورس</p>
        </div>
        <div className="flex-1 h-px bg-gradient-to-l from-transparent via-border to-transparent" />
      </div>
      {group.courses.length === 0 ? (
        <Card className="border-dashed bg-muted/20">
          <CardContent className="p-12 text-center space-y-3">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 grid place-items-center text-primary">
              <group.icon className="h-7 w-7" />
            </div>
            <p className="font-semibold text-foreground">قريبًا — كورسات {group.label}</p>
            <p className="text-sm text-muted-foreground">
              لسه مفيش كورسات منشورة في {group.label}. تابعنا وهنضيفها أول بأول.
            </p>
          </CardContent>
        </Card>
      ) : (
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

        {group.courses.map((c, i) => {
          const enrolled = enrolledIds.has(c.id);
          const final = c.discount_percent > 0 ? c.price * (1 - c.discount_percent / 100) : c.price;
          return (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card className="overflow-hidden group hover:shadow-elegant hover:-translate-y-1 transition-all border-border/70 relative">
                <div
                  onClick={() => navigate({ to: "/courses/$courseId", params: { courseId: c.id } })}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate({ to: "/courses/$courseId", params: { courseId: c.id } }); } }}
                  className="absolute inset-0 z-10 rounded-xl cursor-pointer"
                  role="link"
                  tabIndex={0}
                />
                <div className="aspect-video relative overflow-hidden bg-muted">
                  {c.cover_url ? (
                    <img src={c.cover_url} alt={c.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-muted-foreground">
                      <ImageIcon className="h-10 w-10" />
                    </div>
                  )}
                  {enrolled && <Badge className="absolute top-2 end-2 bg-green-600 hover:bg-green-600">مشترك</Badge>}
                  {c.discount_percent > 0 && !enrolled && (
                    <Badge variant="destructive" className="absolute top-2 start-2">-{c.discount_percent}%</Badge>
                  )}
                </div>
                <CardContent className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold line-clamp-1">{c.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {[c.term, c.month].filter(Boolean).join(" · ") || info.name}
                    </p>
                  </div>
                  {c.description && <p className="text-xs text-muted-foreground line-clamp-2">{c.description}</p>}
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-lg font-bold text-primary">{final.toFixed(0)}</span>
                      <span className="text-[10px] text-muted-foreground">ج.م</span>
                      {c.discount_percent > 0 && (
                        <span className="text-[11px] text-muted-foreground line-through ms-1">{c.price}</span>
                      )}
                    </div>
                    <div className="relative z-20">
                      {enrolled ? (
                        <Button asChild size="sm" variant="outline" className="rounded-full">
                          <Link to="/courses/$courseId" params={{ courseId: c.id }}>افتح</Link>
                        </Button>
                      ) : (
                        <Button asChild size="sm" className="rounded-full">
                          {user && isApproved ? (
                            <Link to="/payments/new" search={{ courseId: c.id } as any}>اشترك</Link>
                          ) : (
                            <Link to="/register">سجّل واشترك</Link>
                          )}
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
    </motion.div>
  );
}

function BundlesShowcase({
  bundles,
  gradeKey,
  user,
  isApproved,
}: {
  bundles: Bundle[];
  gradeKey: string;
  user: any;
  isApproved: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-8"
    >
      {/* Header banner — brand identity (navy + royal + red touch) */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary via-[var(--royal)] to-primary text-white p-6 md:p-10">
        {/* Decorative brand glows */}
        <div className="absolute -top-16 -end-16 h-56 w-56 rounded-full bg-[var(--brand-red)]/30 blur-3xl" />
        <div className="absolute -bottom-20 -start-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        {/* Subtle pattern */}
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="relative flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl bg-white/15 backdrop-blur border border-white/25 grid place-items-center shadow-lg">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--brand-red)] text-white text-[11px] font-bold mb-3 shadow-md">
              <Sparkles className="h-3 w-3" />
              عرض حصري من أكاديمية حاتم سميكة
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-extrabold text-white">
              {gradeKey === "g1" ? "اشترك في الترم كامل" : "اشترك في الباقة الموفّرة"}
            </h2>
            <p className="text-white/85 mt-2 max-w-2xl text-sm md:text-base leading-relaxed">
              {gradeKey === "g1"
                ? "وفّر أكتر لما تشترك في الترم بأكمله بدل كل كورس لوحده، واحصل على متابعة كاملة طول الترم."
                : "وفّر أكتر لما تشترك في باقة الـ 3 شهور بدل ما تشترك في كل شهر لوحده."}
            </p>
          </div>
        </div>
      </div>

      {/* Bundles cards - large creative */}
      {bundles.length === 0 ? (
        <Card className="border-dashed border-primary/30 bg-gradient-to-br from-primary/5 via-card to-[var(--royal)]/5">
          <CardContent className="p-12 text-center space-y-3">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-[var(--royal)] text-white grid place-items-center shadow-lg shadow-primary/30">
              <Package className="h-8 w-8" />
            </div>
            <p className="font-display font-bold text-lg">الباقات الموفّرة قريبًا</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {gradeKey === "g1"
                ? "هنطرح باقة الترم الكامل بسعر موفّر جدًا. تابعنا أو سجّل دلوقتي عشان توصلك أول ما تنزل."
                : "هنطرح باقة الـ 3 شهور بسعر موفّر. تابعنا أو سجّل دلوقتي عشان توصلك أول ما تنزل."}
            </p>
          </CardContent>
        </Card>
      ) : (
      <div className="grid gap-6 md:grid-cols-2">
        {bundles.map((b, i) => {
          const final = b.discount_percent > 0 ? b.price * (1 - b.discount_percent / 100) : b.price;
          const saved = b.price - final;
          const items = b.bundle_type === "term" ? [b.term ?? "ترم كامل"] : (b.months ?? []);
          return (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
            >
              <Card className="relative overflow-hidden border-2 border-primary/15 hover:border-primary/40 bg-card hover:shadow-elegant hover:-translate-y-1 transition-all h-full">
                {/* Ribbon */}
                {b.discount_percent > 0 && (
                  <div className="absolute top-0 end-0 z-10">
                    <div className="bg-[var(--brand-red)] text-white font-bold text-xs px-4 py-1.5 rounded-bl-2xl shadow-lg">
                      وفّر {b.discount_percent}%
                    </div>
                  </div>
                )}

                {/* Cover — brand gradient with subtle pattern */}
                <div className="aspect-[16/7] relative overflow-hidden bg-gradient-to-br from-primary via-[var(--royal)] to-primary">
                  {b.cover_url ? (
                    <img src={b.cover_url} alt={b.title} className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <div
                        className="absolute inset-0 opacity-[0.12]"
                        style={{
                          backgroundImage:
                            "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
                          backgroundSize: "20px 20px",
                        }}
                      />
                      <div className="absolute -bottom-10 -end-10 h-40 w-40 rounded-full bg-[var(--brand-red)]/35 blur-2xl" />
                      <div className="absolute -top-12 -start-8 h-36 w-36 rounded-full bg-white/15 blur-2xl" />
                      <div className="absolute inset-0 grid place-items-center">
                        <div className="h-20 w-20 rounded-2xl bg-white/15 backdrop-blur border border-white/25 grid place-items-center text-white shadow-lg">
                          <Package className="h-10 w-10" />
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <CardContent className="p-6 space-y-5">
                  <div>
                    <Badge variant="outline" className="border-primary/40 text-primary mb-2 bg-primary/5">
                      {b.bundle_type === "term" ? "باقة ترم" : `باقة ${items.length} شهور`}
                    </Badge>
                    <h3 className="font-display font-extrabold text-xl md:text-2xl">{b.title}</h3>
                    {b.description && (
                      <p className="text-sm text-muted-foreground mt-2">{b.description}</p>
                    )}
                  </div>

                  {/* Included chips */}
                  {items.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">شامل:</p>
                      <div className="flex flex-wrap gap-2">
                        {items.map((it) => (
                          <span
                            key={it}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/8 border border-primary/20 text-xs font-medium text-foreground"
                          >
                            <CheckCircle2 className="h-3 w-3 text-[var(--royal)]" />
                            {it}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Price block */}
                  <div className="rounded-2xl bg-gradient-to-br from-primary/5 via-card to-[var(--royal)]/5 border border-primary/15 p-4 flex items-end justify-between gap-3">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl md:text-4xl font-extrabold text-primary">{final.toFixed(0)}</span>
                        <span className="text-sm text-muted-foreground font-medium">ج.م</span>
                      </div>
                      {b.discount_percent > 0 && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm text-muted-foreground line-through">{b.price} ج</span>
                          <span className="text-xs font-bold text-[var(--brand-red)]">
                            وفّرت {saved.toFixed(0)} ج
                          </span>
                        </div>
                      )}
                    </div>
                    <Button asChild size="lg" className="rounded-full bg-gradient-to-l from-[var(--brand-red)] to-[var(--royal)] hover:opacity-95 text-white shadow-lg shadow-[color-mix(in_oklab,var(--brand-red)_30%,transparent)]">
                      {user && isApproved ? (
                        <Link to="/payments/new" search={{ bundleId: b.id } as any}>
                          اشترك الآن
                        </Link>
                      ) : (
                        <Link to="/register">سجّل واشترك</Link>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
      )}
    </motion.div>
  );
}


