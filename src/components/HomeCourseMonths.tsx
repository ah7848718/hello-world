import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/providers";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, CheckCircle2, ImageIcon, Loader2, Sparkles } from "lucide-react";

const MONTH_ORDER = [
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
];

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
};

type GradeKey = "g1" | "g2" | "g3";

type Group = { key: string; label: string; courses: Course[] };

function detectGradeBucket(grade: string | null): GradeKey | "other" {
  if (!grade) return "other";
  const normalized = grade.replace(/\s+/g, "").toLowerCase();
  if (normalized.includes("1") || normalized.includes("أولى") || normalized.includes("اولى")) return "g1";
  if (normalized.includes("2") || normalized.includes("ثانية") || normalized.includes("تانية")) return "g2";
  if (normalized.includes("3") || normalized.includes("ثالثة") || normalized.includes("تالتة")) return "g3";
  return "other";
}

function sortMonths(months: string[]) {
  return [...months].sort((a, b) => {
    const ai = MONTH_ORDER.indexOf(a);
    const bi = MONTH_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b, "ar");
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

const grades: { key: GradeKey; label: string }[] = [
  { key: "g1", label: "الصف الأول الثانوي" },
  { key: "g2", label: "الصف الثاني الثانوي" },
  { key: "g3", label: "الصف الثالث الثانوي" },
];

const GRADE_INFO: Record<GradeKey, { tag: string; subtitle: string; feature: string; extra: string }> = {
  g1: {
    tag: "1ث",
    subtitle: "أساسيات قوية في القواعد والكلمات لبداية متميزة.",
    feature: "مقسم ترمياً للوصول السهل",
    extra: "باقة الترم كامل متاحة",
  },
  g2: {
    tag: "2ث",
    subtitle: "بناء على ما تعلمته بأسلوب أعمق وتدريبات أقوى.",
    feature: "مقسم شهرياً للوصول السهل",
    extra: "باقة الـ 3 شهور بسعر موفّر",
  },
  g3: {
    tag: "3ث",
    subtitle: "استعداد كامل للثانوية العامة ومراجعات مكثفة.",
    feature: "مقسم شهرياً للوصول السهل",
    extra: "باقة الـ 3 شهور بسعر موفّر",
  },
};

export function HomeCourseMonths() {
  const { lang } = useApp();
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [bundles, setBundles] = useState<Bundle[] | null>(null);
  const [activeGrade, setActiveGrade] = useState<GradeKey>("g1");
  const [selectedMonthByGrade, setSelectedMonthByGrade] = useState<Record<GradeKey, string>>({ g1: "", g2: "", g3: "" });
  const [viewByGrade, setViewByGrade] = useState<Record<GradeKey, "month" | "bundle">>({ g1: "month", g2: "month", g3: "month" });
  const [selectedBundleIdByGrade, setSelectedBundleIdByGrade] = useState<Record<GradeKey, string | null>>({ g1: null, g2: null, g3: null });

  useEffect(() => {
    (async () => {
      const [{ data: cs }, { data: bs }] = await Promise.all([
        supabase
          .from("courses")
          .select("id,title,description,cover_url,grade,term,month,price,discount_percent")
          .eq("is_published", true)
          .eq("is_center_only", false)
          .order("order_index"),
        supabase
          .from("bundles")
          .select("id,title,description,cover_url,grade,bundle_type,term,months,price,discount_percent")
          .eq("is_published", true)
          .order("order_index"),
      ]);
      setCourses((cs ?? []) as Course[]);
      setBundles((bs ?? []) as Bundle[]);
    })();
  }, []);

  const selectedGradeLabel = grades.find((grade) => grade.key === activeGrade)?.label ?? "";

  const filteredCourses = useMemo(
    () => (courses ?? []).filter((course) => detectGradeBucket(course.grade) === activeGrade),
    [courses, activeGrade],
  );

  const filteredBundles = useMemo(
    () => (bundles ?? []).filter((bundle) => detectGradeBucket(bundle.grade) === activeGrade),
    [bundles, activeGrade],
  );

  const monthlyBundles = useMemo(
    () => filteredBundles.filter((bundle) => bundle.bundle_type === "monthly_pack"),
    [filteredBundles],
  );

  const selectedBundle = useMemo(
    () => monthlyBundles.find((bundle) => bundle.id === selectedBundleIdByGrade[activeGrade]) ?? monthlyBundles[0] ?? null,
    [monthlyBundles, selectedBundleIdByGrade, activeGrade],
  );

  const termGroups = useMemo(() => {
    const groups = new Map<string, Course[]>();

    filteredCourses.forEach((course) => {
      const key = course.term ?? "";
      const current = groups.get(key);
      if (current) {
        current.push(course);
      } else {
        groups.set(key, [course]);
      }
    });

    return Array.from(groups.entries()).map(([key, courses]) => ({
      key: key || "none",
      label: key || (lang === "ar" ? "بدون ترم" : "No term"),
      courses,
    }));
  }, [filteredCourses, lang]);

  const monthGroups = useMemo(() => {
    const groups = new Map<string, Course[]>();

    filteredCourses.forEach((course) => {
      const key = course.month ?? "";
      const current = groups.get(key);
      if (current) {
        current.push(course);
      } else {
        groups.set(key, [course]);
      }
    });

    const sortedMonths = sortMonths(Array.from(groups.keys()));
    return sortedMonths.map((month) => ({
      key: month || "none",
      label: month || (lang === "ar" ? "بدون شهر" : "No month"),
      courses: groups.get(month) ?? [],
    }));
  }, [filteredCourses, lang]);

  useEffect(() => {
    if (monthGroups.length > 0) {
      setSelectedMonthByGrade((prev) => ({
        ...prev,
        [activeGrade]: prev[activeGrade] && monthGroups.some((group) => group.key === prev[activeGrade]) ? prev[activeGrade] : monthGroups[0].key,
      }));
    }
    setSelectedBundleIdByGrade((prev) => ({
      ...prev,
      [activeGrade]: prev[activeGrade] && monthlyBundles.some((bundle) => bundle.id === prev[activeGrade]) ? prev[activeGrade] : monthlyBundles[0]?.id ?? null,
    }));
  }, [monthGroups, monthlyBundles, activeGrade]);

  return (
    <section className="py-20 lg:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl">
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-foreground">
            {lang === "ar"
              ? "اختر الصف"
              : "Select a grade"}
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            {lang === "ar"
              ? "اختر الصف لتشاهد كل الباقات والكورسات المتاحة. الصف الأول يوضح الترمات، الصفوف الثاني والثالث توضح الشهور."
              : "Choose your grade to view available packages. Grade 1 shows terms, grades 2 and 3 show months."}
          </p>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          {grades.map((grade) => (
            <button
              key={grade.key}
              type="button"
              onClick={() => setActiveGrade(grade.key)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                activeGrade === grade.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:border-primary hover:text-foreground"
              }`}
            >
              {grade.label}
            </button>
          ))}
        </div>

        <div className="mt-10">
          <div className="rounded-3xl border border-border bg-card p-6">
            <div className="inline-flex items-center gap-3 rounded-full border border-border bg-secondary/10 px-4 py-2 text-sm text-foreground mb-6">
              <CalendarDays className="h-4 w-4" />
              {lang === "ar" ? "باقات الصفوف" : "Grade packages"}
            </div>

            <div className="rounded-[2.5rem] border border-border bg-gradient-to-b from-primary/5 to-transparent p-6 mb-6 shadow-card">
              <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <p className="text-sm text-muted-foreground">{lang === "ar" ? "الصف المحدد" : "Selected grade"}</p>
                  <h3 className="mt-3 text-4xl font-extrabold text-foreground">{selectedGradeLabel}</h3>
                  <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">{GRADE_INFO[activeGrade].subtitle}</p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => setViewByGrade((p) => ({ ...p, [activeGrade]: "month" }))}
                      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition cursor-pointer ${
                        viewByGrade[activeGrade] === "month"
                          ? "border-primary/20 bg-primary/10 text-primary"
                          : "border-border bg-white/90 text-foreground hover:border-primary/40 hover:bg-primary/5"
                      }`}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {GRADE_INFO[activeGrade].feature}
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewByGrade((p) => ({ ...p, [activeGrade]: "bundle" }))}
                      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition cursor-pointer ${
                        viewByGrade[activeGrade] === "bundle"
                          ? "border-primary/20 bg-primary/10 text-primary"
                          : "border-border bg-white/90 text-foreground hover:border-primary/40 hover:bg-primary/5"
                      }`}
                    >
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      {GRADE_INFO[activeGrade].extra}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-center rounded-[2.5rem] border border-primary/20 bg-white px-8 py-5 text-3xl font-black text-primary shadow-lg shadow-primary/10">
                  {GRADE_INFO[activeGrade].tag}
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-6">
              {courses === null ? (
                <div className="grid place-items-center rounded-3xl border border-border bg-background py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : activeGrade === "g1" ? (
                viewByGrade[activeGrade] === "month" ? (
                  <div className="grid gap-6 md:grid-cols-2">
                    {termGroups.map((group) => (
                      <div key={group.key} className="rounded-3xl border border-border bg-background p-5">
                        <h4 className="text-lg font-semibold text-foreground mb-3">{group.label}</h4>
                        {group.courses.length === 0 ? (
                          <p className="text-sm text-muted-foreground">{lang === "ar" ? "لا توجد كورسات هنا بعد" : "No courses yet"}</p>
                        ) : (
                          <ul className="space-y-4">
                            {group.courses.map((course) => (
                              <li key={course.id} className="rounded-2xl border border-border bg-card p-4">
                                <Link to="/courses/$courseId" params={{ courseId: course.id }} className="block">
                                  <div className="flex items-start justify-between gap-4">
                                    <div>
                                      <h5 className="font-semibold text-foreground line-clamp-1">{course.title}</h5>
                                      <p className="text-xs text-muted-foreground mt-2">{course.description ?? (lang === "ar" ? "بدون وصف" : "No description")}</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-sm font-semibold text-foreground">{(course.price * (1 - course.discount_percent / 100)).toFixed(0)} ج</p>
                                      {course.discount_percent > 0 && <p className="text-xs text-muted-foreground line-through">{course.price} ج</p>}
                                    </div>
                                  </div>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                ) : filteredBundles.length === 0 ? (
                  <div className="rounded-3xl border border-border bg-background p-12 text-center text-foreground">
                    {lang === "ar" ? "لا توجد باقات الترم لهذا الصف بعد." : "No term bundles found for this grade yet."}
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {filteredBundles.map((bundle) => (
                      <div
                        key={bundle.id}
                        role="button"
                        onClick={() => setSelectedBundleIdByGrade((p) => ({ ...p, [activeGrade]: bundle.id }))}
                        className={`group cursor-pointer overflow-hidden rounded-[2rem] border p-0 shadow-sm transition duration-200 ease-out ${
                          selectedBundleIdByGrade[activeGrade] === bundle.id
                            ? "border-primary bg-primary/10 shadow-[0_30px_60px_-40px_rgba(124,24,54,0.9)]"
                            : "border-border bg-white/95 hover:border-primary/60 hover:bg-primary/5 hover:-translate-y-0.5"
                        }`}
                      >
                        <div className="relative h-44 overflow-hidden bg-muted">
                          <div className="absolute inset-0 grid place-items-center text-muted-foreground">
                            <ImageIcon className="h-12 w-12" />
                          </div>
                        </div>
                        <div className="space-y-4 p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h4 className="text-xl font-semibold text-foreground">{bundle.title}</h4>
                              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{bundle.description ?? (lang === "ar" ? "باقة الترم كامل" : "Full term bundle")}</p>
                            </div>
                            <Badge variant="secondary">{bundle.discount_percent > 0 ? `-${bundle.discount_percent}%` : lang === "ar" ? "باقة" : "Bundle"}</Badge>
                          </div>
                          <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                            <span>{bundle.term}</span>
                            <span>{(bundle.price * (1 - bundle.discount_percent / 100)).toFixed(0)} ج</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div className="space-y-8">
                  {courses === null ? (
                    <div className="grid place-items-center rounded-3xl border border-border bg-background py-20">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : monthGroups.length === 0 ? (
                    <div className="rounded-3xl border border-border bg-background p-12 text-center text-foreground">
                      {lang === "ar"
                        ? "لا توجد كورسات لهذا الصف بعد."
                        : "No courses found for this grade yet."}
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">{lang === "ar" ? "استعرض الباقات" : "Browse packages"}</p>
                          <h4 className="text-xl font-semibold text-foreground">{lang === "ar" ? "خيارات الباقات" : "Package options"}</h4>
                        </div>
                        <div className="inline-flex rounded-full border border-border bg-white p-1 shadow-sm">
                          <button
                            type="button"
                            onClick={() => setViewByGrade((p) => ({ ...p, [activeGrade]: "month" }))}
                            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                              viewByGrade[activeGrade] === "month"
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-foreground hover:bg-primary/10"
                            }`}
                          >
                            {lang === "ar" ? "باقات الشهور المنفصلة" : "Separate month packages"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setViewByGrade((p) => ({ ...p, [activeGrade]: "bundle" }))}
                            className={`relative rounded-full px-4 py-2 text-sm font-semibold transition ${
                              viewByGrade[activeGrade] === "bundle"
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-foreground hover:bg-primary/10"
                            }`}
                          >
                            <span className="inline-flex items-center gap-2">
                              {lang === "ar" ? "باقة الـ 3 شهور" : "3-month bundle"}
                              {viewByGrade[activeGrade] !== "bundle" && (
                                <span className="rounded-full bg-[rgba(124,24,54,0.12)] px-2 py-0.5 text-[11px] font-bold text-[#7c1836]">{lang === "ar" ? "وفر" : "Save"}</span>
                              )}
                            </span>
                          </button>
                        </div>
                      </div>

                      {viewByGrade[activeGrade] === "month" ? (
                        <>
                          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {monthGroups.map((group) => {
                              const minPrice = group.courses.length
                                ? Math.min(...group.courses.map((course) => course.price * (1 - course.discount_percent / 100)))
                                : 0;
                              return (
                                <div
                                  key={group.key}
                                  role="button"
                                  onClick={() => setSelectedMonthByGrade((p) => ({ ...p, [activeGrade]: group.key }))}
                                  className={`group cursor-pointer overflow-hidden rounded-[2rem] border p-0 shadow-sm transition duration-200 ease-out ${
                                    selectedMonthByGrade[activeGrade] === group.key
                                      ? "border-primary bg-primary/10 shadow-[0_30px_60px_-40px_rgba(124,24,54,0.9)]"
                                      : "border-border bg-white/95 hover:border-primary/60 hover:bg-primary/5 hover:-translate-y-0.5"
                                  }`}
                                >
                                  <div className="relative h-48 overflow-hidden bg-muted">
                                    <div className="absolute inset-0 grid place-items-center text-muted-foreground">
                                      <ImageIcon className="h-12 w-12" />
                                    </div>
                                  </div>
                                  <div className="space-y-4 p-5">
                                    <div className="flex items-start justify-between gap-4">
                                      <div>
                                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{lang === "ar" ? "شهر" : "Month"}</p>
                                        <h4 className="text-xl font-semibold text-foreground">{group.label} — {activeGrade === "g2" ? (lang === "ar" ? "ثانية ثانوي" : "Grade 2") : (lang === "ar" ? "ثالثة ثانوي" : "Grade 3")}</h4>
                                      </div>
                                      <div className="rounded-full bg-secondary/10 px-3 py-2 text-xs font-semibold text-foreground">
                                        {group.courses.length} {lang === "ar" ? "كورسات" : "courses"}
                                      </div>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{lang === "ar" ? `مقدمة المنهج وأهم القواعد لشهر ${group.label}.` : `Overview for ${group.label}.`}</p>
                                    <div className="flex items-center justify-between gap-4">
                                      <div className="text-lg font-bold text-primary">{minPrice.toFixed(0)} ج</div>
                                      <div className="rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition group-hover:border-primary/80 group-hover:bg-primary/5">
                                        {lang === "ar" ? "عرض" : "View"}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {selectedMonthByGrade[activeGrade] && (
                            <div className="rounded-3xl border border-primary/20 bg-primary/5 p-6">
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                                <div>
                                  <p className="text-xs text-muted-foreground">{lang === "ar" ? "تفاصيل الشهر" : "Month details"}</p>
                                  <h3 className="text-2xl font-semibold text-foreground">{selectedMonthByGrade[activeGrade]}</h3>
                                </div>
                                <p className="text-sm text-muted-foreground">{lang === "ar" ? "اضغط على الكورس للانتقال لصفحة تفاصيله" : "Tap a course to open its detail page"}</p>
                              </div>
                              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                {monthGroups.find((group) => group.key === selectedMonthByGrade[activeGrade])?.courses.map((course) => {
                                  const finalPrice = course.price * (1 - course.discount_percent / 100);
                                  return (
                                    <Card key={course.id} className="overflow-hidden border border-border bg-white">
                                      <Link to="/courses/$courseId" params={{ courseId: course.id }} className="block">
                                        <div className="overflow-hidden bg-muted">
                                          {course.cover_url ? (
                                            <img src={course.cover_url} alt={course.title} className="aspect-[16/10] w-full object-cover" />
                                          ) : (
                                            <div className="aspect-[16/10] grid place-items-center text-muted-foreground">
                                              <ImageIcon className="h-10 w-10" />
                                            </div>
                                          )}
                                        </div>
                                        <CardContent className="p-4 space-y-3">
                                          <div>
                                            <h4 className="font-semibold text-foreground line-clamp-2">{course.title}</h4>
                                            <p className="text-xs text-muted-foreground">{course.description ?? (lang === "ar" ? "بدون وصف" : "No description")}</p>
                                          </div>
                                          <div className="flex items-center justify-between gap-2">
                                            <span className="text-lg font-bold text-primary">{finalPrice.toFixed(0)} ج</span>
                                            {course.discount_percent > 0 && <span className="text-xs text-muted-foreground line-through">{course.price} ج</span>}
                                          </div>
                                        </CardContent>
                                      </Link>
                                    </Card>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          {monthlyBundles.length === 0 ? (
                            <div className="rounded-3xl border border-border bg-background p-12 text-center text-foreground">
                              {lang === "ar"
                                ? "لا توجد باقات الـ 3 شهور لهذا الصف بعد."
                                : "No 3-month bundles found for this grade yet."}
                            </div>
                          ) : (
                            <>
                              <div className="grid gap-4 sm:grid-cols-2">
                                {monthlyBundles.map((bundle) => (
                                  <div
                                    key={bundle.id}
                                    role="button"
                                    onClick={() => setSelectedBundleIdByGrade((p) => ({ ...p, [activeGrade]: bundle.id }))}
                                    className={`group cursor-pointer overflow-hidden rounded-[2rem] border p-0 shadow-sm transition duration-200 ease-out ${
                                      selectedBundleIdByGrade[activeGrade] === bundle.id
                                        ? "border-primary bg-primary/10 shadow-[0_30px_60px_-40px_rgba(124,24,54,0.9)]"
                                        : "border-border bg-white/95 hover:border-primary/60 hover:bg-primary/5 hover:-translate-y-0.5"
                                    }`}
                                  >
                                    <div className="relative h-44 overflow-hidden bg-muted">
                                      <div className="absolute inset-0 grid place-items-center text-muted-foreground">
                                        <ImageIcon className="h-12 w-12" />
                                      </div>
                                    </div>
                                    <div className="space-y-4 p-5">
                                      <div className="flex items-start justify-between gap-3">
                                        <div>
                                          <h4 className="text-xl font-semibold text-foreground">{bundle.title}</h4>
                                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{bundle.description ?? (lang === "ar" ? "باقة مكوّنة من 3 شهور" : "3-month offer bundle")}</p>
                                        </div>
                                        <Badge variant="secondary">{bundle.discount_percent > 0 ? `-${bundle.discount_percent}%` : lang === "ar" ? "باقة" : "Bundle"}</Badge>
                                      </div>
                                      <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                                        <span>{bundle.months?.join(" · ") ?? bundle.term}</span>
                                        <span>{(bundle.price * (1 - bundle.discount_percent / 100)).toFixed(0)} ج</span>
                                      </div>
                                      <div className="flex items-center justify-between gap-3">
                                        <span className="text-sm font-semibold text-foreground">{lang === "ar" ? "اشتراك واحد يفتح الكورسات" : "Single subscription opens included courses"}</span>
                                        <div className="rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition group-hover:border-primary/80 group-hover:bg-primary/5">
                                          {lang === "ar" ? "عرض" : "View"}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {selectedBundleIdByGrade[activeGrade] && selectedBundle && (
                                <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
                                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                                    <div>
                                      <p className="text-xs text-muted-foreground">{lang === "ar" ? "تفاصيل الباقة" : "Bundle details"}</p>
                                      <h3 className="text-2xl font-semibold text-foreground">{selectedBundle.title}</h3>
                                    </div>
                                    <div className="rounded-2xl bg-white/90 px-4 py-3 text-sm font-medium text-foreground">
                                      {selectedBundle.price.toFixed(0)} ج
                                      {selectedBundle.discount_percent > 0 && (
                                        <span className="ms-3 text-[11px] text-muted-foreground line-through">{(selectedBundle.price / (1 - selectedBundle.discount_percent / 100)).toFixed(0)} ج</span>
                                      )}
                                    </div>
                                  </div>
                                  {selectedBundle.description && (
                                    <p className="mt-4 text-sm text-muted-foreground">{selectedBundle.description}</p>
                                  )}
                                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                    {(selectedBundle.months ?? []).map((month) => (
                                      <div key={month} className="rounded-2xl border border-border bg-white p-4">
                                        <p className="text-sm font-semibold text-foreground">{month}</p>
                                        <p className="text-xs text-muted-foreground">{lang === "ar" ? "شهر" : "Month"}</p>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="mt-6">
                                    <p className="text-sm font-semibold text-foreground">{lang === "ar" ? "الكورسات المشمولة" : "Included courses"}</p>
                                    <div className="mt-3 space-y-3">
                                      {filteredCourses
                                        .filter((course) => selectedBundle.months?.includes(course.month ?? ""))
                                        .map((course) => (
                                          <div key={course.id} className="rounded-2xl border border-border bg-white p-4">
                                            <div className="flex items-center justify-between gap-3">
                                              <span className="text-sm text-foreground">{course.title}</span>
                                              <span className="text-xs text-muted-foreground">{(course.price * (1 - course.discount_percent / 100)).toFixed(0)} ج</span>
                                            </div>
                                          </div>
                                        ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
