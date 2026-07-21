import { createFileRoute, Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowRight, BookOpen, CheckCircle2, ClipboardList, FileText, Loader2, Lock, PlayCircle, Sparkles,
  GraduationCap, Layers, Video, Clock,
} from "lucide-react";

const extractYouTubeId = (url: string) => {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m?.[1] ?? null;
};

export const Route = createFileRoute("/_authenticated/courses/$courseId")({
  component: Page,
  head: () => ({ meta: [{ title: "تفاصيل الكورس | مستر حاتم سميكه" }] }),
});

type Course = { id: string; title: string; description: string | null; cover_url: string | null; grade: string | null; term: string | null; month: string | null; price: number; discount_percent: number; is_published: boolean; is_free: boolean };
type Unit = { id: string; title: string; order_index: number };
type Chapter = { id: string; title: string; unit_id: string; order_index: number };
type Lecture = { id: string; title: string; chapter_id: string; order_index: number; is_free: boolean; pdf_url: string | null; video_provider: string | null };
type Exam = { id: string; title: string; type: string; duration_minutes: number | null; end_at: string | null; lecture_id: string | null; order_index: number | null };
type Lesson = { id: string; title: string; description: string | null; video_type: string; video_url: string | null; grade: string };
type HwItem = { id: string; title: string; total_points: number; due_at: string | null; lecture_id: string | null };
type CourseContent = {
  course: Course | null;
  units: Unit[];
  chapters: Chapter[];
  lectures: Lecture[];
  enrolled: boolean;
  progressIds: Set<string>;
  blockedLectureIds: Set<string>;
  firstLectureId: string | null;
  exams: Exam[];
  lessons: Lesson[];
  homework: HwItem[];
};

function Page() {
  const { courseId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [enrolling, setEnrolling] = useState(false);
  const isChildRoute = useRouterState({
    select: (s) => s.matches.some((m) =>
      m.routeId === "/_authenticated/courses/$courseId/lectures/$lectureId" ||
      m.routeId === "/_authenticated/courses/$courseId/lessons/$lessonId"
    ),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["course-content", courseId, user?.id],
    queryFn: async (): Promise<CourseContent> => {
      const { data: c } = await supabase.from("courses").select("id,title,description,cover_url,grade,term,month,price,discount_percent,is_published,is_free").eq("id", courseId).maybeSingle();
      const course = c as Course | null;

      const [{ data: us }, { data: en }] = await Promise.all([
        supabase.from("units").select("id,title,order_index").eq("course_id", courseId).order("order_index"),
        user ? supabase.from("enrollments").select("id").eq("course_id", courseId).eq("student_id", user.id).eq("status", "active").maybeSingle() : Promise.resolve({ data: null }),
      ]);
      const units = (us ?? []) as Unit[];
      const enrolled = !!en;

      const unitIds = units.map((u) => u.id);
      const { data: chs } = unitIds.length
        ? await supabase.from("chapters").select("id,title,unit_id,order_index").in("unit_id", unitIds).order("order_index")
        : { data: [] };
      const chapters = (chs ?? []) as Chapter[];

      const chIds = chapters.map((c) => c.id);
      const { data: ls } = chIds.length
        ? await supabase.from("lectures").select("id,title,chapter_id,order_index,is_free,pdf_url,video_provider").in("chapter_id", chIds).order("order_index")
        : { data: [] };
      const lectures = (ls ?? []) as Lecture[];

      let progressIds = new Set<string>();
      if (user && lectures.length) {
        const { data: prog } = await supabase
          .from("lecture_progress")
          .select("lecture_id,completed")
          .eq("student_id", user.id)
          .in("lecture_id", lectures.map((l) => l.id));
        progressIds = new Set((prog ?? []).filter((p: any) => p.completed).map((p: any) => p.lecture_id));
      }

      let blockedLectureIds = new Set<string>();
      if (user && enrolled && lectures.length && chapters.length && units.length) {
        const unitOrder = new Map(units.map((u, i) => [u.id, i]));
        const chOrder = new Map(chapters.map((c, i) => [c.id, { unitId: c.unit_id, idx: i }]));
        const sortedLecs = lectures.slice().sort((a, b) => {
          const ca = chOrder.get(a.chapter_id); const cb = chOrder.get(b.chapter_id);
          const ua = unitOrder.get(ca?.unitId ?? "") ?? 0; const ub = unitOrder.get(cb?.unitId ?? "") ?? 0;
          if (ua !== ub) return ua - ub;
          if ((ca?.idx ?? 0) !== (cb?.idx ?? 0)) return (ca?.idx ?? 0) - (cb?.idx ?? 0);
          return (a.order_index ?? 0) - (b.order_index ?? 0);
        });
        const lecIds = sortedLecs.map((l) => l.id);
        const { data: allHw } = await supabase
          .from("homework")
          .select("id,lecture_id")
          .in("lecture_id", lecIds)
          .eq("is_published", true);
        if (allHw && allHw.length > 0) {
          const hwIds = allHw.map((h) => h.id);
          const { data: subs } = await supabase
            .from("homework_submissions")
            .select("homework_id")
            .eq("student_id", user.id)
            .in("homework_id", hwIds)
            .in("status", ["submitted", "graded"]);
          const completedHwIds = new Set((subs ?? []).map((s) => s.homework_id));
          const blocked = new Set<string>();
          for (let i = 1; i < sortedLecs.length; i++) {
            const prevLec = sortedLecs[i - 1];
            const prevHws = allHw.filter((h) => h.lecture_id === prevLec.id);
            if (prevHws.length > 0 && !prevHws.every((h) => completedHwIds.has(h.id))) {
              blocked.add(sortedLecs[i].id);
            }
          }
          blockedLectureIds = blocked;
        }
      }

      const { data: ex } = await supabase
        .from("exams")
        .select("id,title,type,duration_minutes,end_at,lecture_id,order_index")
        .eq("course_id", courseId)
        .eq("is_published", true)
        .order("order_index", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      const exams = (ex ?? []) as Exam[];

      const { data: hwItems } = await supabase
        .from("homework")
        .select("id,title,total_points,due_at,lecture_id")
        .eq("course_id", courseId)
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      const homework = (hwItems ?? []) as HwItem[];

      const { data: lsLessons } = await supabase
        .from("lessons")
        .select("id,title,description,video_type,video_url,grade")
        .eq("course_id", courseId)
        .eq("is_published", true)
        .order("order_index");
      const lessons = (lsLessons ?? []) as Lesson[];

      const firstLectureId = (() => {
        if (!lectures.length || !chapters.length || !units.length) return null;
        const unitOrder = new Map(units.map((u, i) => [u.id, i]));
        const chOrder = new Map(chapters.map((c, i) => [c.id, { unitId: c.unit_id, idx: i }]));
        const sorted = [...lectures].sort((a, b) => {
          const ca = chOrder.get(a.chapter_id); const cb = chOrder.get(b.chapter_id);
          const ua = unitOrder.get(ca?.unitId ?? "") ?? 0; const ub = unitOrder.get(cb?.unitId ?? "") ?? 0;
          if (ua !== ub) return ua - ub;
          if ((ca?.idx ?? 0) !== (cb?.idx ?? 0)) return (ca?.idx ?? 0) - (cb?.idx ?? 0);
          return (a.order_index ?? 0) - (b.order_index ?? 0);
        });
        return sorted[0]?.id ?? null;
      })();

      return { course, units, chapters, lectures, enrolled, progressIds, blockedLectureIds, firstLectureId, exams, lessons, homework };
    },
    enabled: !!courseId,
  });

  const lecturesByChapter = useMemo(() => {
    const map = new Map<string, Lecture[]>();
    (data?.lectures ?? []).forEach((l) => {
      const arr = map.get(l.chapter_id) ?? [];
      arr.push(l);
      map.set(l.chapter_id, arr);
    });
    return map;
  }, [data?.lectures]);

  const chaptersByUnit = useMemo(() => {
    const map = new Map<string, Chapter[]>();
    (data?.chapters ?? []).forEach((c) => {
      const arr = map.get(c.unit_id) ?? [];
      arr.push(c);
      map.set(c.unit_id, arr);
    });
    return map;
  }, [data?.chapters]);

  const examsByLecture = useMemo(() => {
    const map = new Map<string, Exam[]>();
    (data?.exams ?? []).forEach((e) => {
      if (!e.lecture_id) return;
      const arr = map.get(e.lecture_id) ?? [];
      arr.push(e);
      map.set(e.lecture_id, arr);
    });
    return map;
  }, [data?.exams]);

  const standaloneExams = useMemo(() =>
    (data?.exams ?? []).filter((e) => !e.lecture_id),
  [data?.exams]);

  const standaloneHomeworks = useMemo(() =>
    (data?.homework ?? []).filter((h) => !h.lecture_id),
  [data?.homework]);

  const totalLectures = data?.lectures.length ?? 0;
  const completedCount = data?.progressIds.size ?? 0;
  const progressPct = totalLectures > 0 ? Math.round((completedCount / totalLectures) * 100) : 0;

  if (isChildRoute) {
    return <Outlet />;
  }

  if (isLoading) {
    return <div className="grid place-items-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (!data?.course) {
    return <div className="container max-w-3xl mx-auto px-4 py-12 text-center">الكورس غير موجود</div>;
  }

  const { course, units, chapters, lectures, enrolled, progressIds, blockedLectureIds, firstLectureId, exams, lessons } = data;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-background">
        <div className="container max-w-5xl mx-auto px-4 py-10 md:py-16">
          <Link to="/courses" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowRight className="h-4 w-4" /> العودة للكورسات
          </Link>
          <div className="flex flex-col md:flex-row gap-8 items-start">
            {course.cover_url && (
              <div className="w-full md:w-64 aspect-video md:aspect-[4/3] rounded-2xl overflow-hidden shadow-xl shrink-0 bg-gradient-to-br from-primary/20 to-primary-glow/20">
                <img src={course.cover_url} alt={course.title} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1 min-w-0 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {course.grade && <Badge variant="secondary" className="rounded-full">{course.grade}</Badge>}
                {course.term && <Badge variant="outline" className="rounded-full">{course.term}</Badge>}
                {course.month && <Badge variant="outline" className="rounded-full">{course.month}</Badge>}
                {enrolled && <Badge className="bg-green-600 rounded-full">مشترك</Badge>}
              </div>
              <h1 className="text-3xl md:text-4xl font-display font-bold leading-tight">{course.title}</h1>
              {course.description && (
                <p className="text-muted-foreground text-base leading-relaxed max-w-2xl">{course.description}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container max-w-5xl mx-auto px-4 -mt-6 relative z-10">
        {/* Action Card */}
        <Card className="shadow-lg border-0 mb-8">
          <CardContent className="p-6 md:p-8">
            {enrolled ? (
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">تقدمك في الكورس</span>
                    <span className="font-semibold">{completedCount}/{totalLectures} درس ({progressPct}%)</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-l from-primary to-primary/60 rounded-full transition-all duration-700"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
                {firstLectureId && (
                  <Link
                    to="/courses/$courseId/lectures/$lectureId"
                    params={{ courseId, lectureId: firstLectureId }}
                    className="inline-flex items-center justify-center gap-2 h-11 px-8 rounded-md bg-primary text-primary-foreground font-medium text-base shadow hover:bg-primary/90 transition-colors shrink-0 w-full md:w-auto"
                  >
                    <PlayCircle className="h-5 w-5" /> دخول إلى الكورس
                  </Link>
                )}
              </div>
            ) : course.is_free ? (
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <span className="text-3xl font-bold text-green-600">مجاني</span>
                </div>
                <Button size="lg" className="gap-2 w-full md:w-auto" disabled={enrolling} onClick={async () => {
                  setEnrolling(true);
                  try {
                    const { data: { session } } = await supabase.auth.getSession();
                    const res = await fetch("/api/rpc", {
                      method: "POST",
                      headers: { "Content-Type": "application/json", ...(session?.access_token ? { Authorization: "Bearer " + session.access_token } : {}) },
                      body: JSON.stringify({ fn: "enrollFreeCourse", data: { courseId: course.id } }),
                    });
                    const result = await res.json();
                    if (result.error) { toast.error(result.error); return; }
                    toast.success("تم التسجيل في الكورس بنجاح");
                    window.location.reload();
                  } catch { toast.error("حدث خطأ أثناء التسجيل"); }
                  finally { setEnrolling(false); }
                }}>
                  {enrolling ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                  اشترك مجاناً
                </Button>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-baseline gap-3">
                  {course.discount_percent > 0 ? (
                    <>
                      <span className="text-3xl font-bold text-primary">{(course.price * (1 - course.discount_percent / 100)).toFixed(0)} ج</span>
                      <span className="text-lg text-muted-foreground line-through">{course.price} ج</span>
                      <Badge variant="destructive" className="rounded-full">وفر {course.discount_percent}%</Badge>
                    </>
                  ) : (
                    <span className="text-3xl font-bold text-primary">{course.price} ج</span>
                  )}
                </div>
                <Button asChild size="lg" className="gap-2 w-full md:w-auto">
                  <Link to="/payments/new" search={{ courseId: course.id } as any}>اشترك الآن</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { icon: Layers, label: "الوحدات", value: units.length, color: "text-blue-500" },
            { icon: Video, label: "الدروس", value: lectures.length, color: "text-primary" },
            { icon: GraduationCap, label: "المستوى", value: course.grade ?? "—", color: "text-purple-500" },
            { icon: PlayCircle, label: "الحصص", value: lessons.length, color: "text-orange-500" },
          ].map((s, i) => (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="p-5 text-center space-y-1">
                <s.icon className={`h-5 w-5 mx-auto ${s.color}`} />
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Course Content */}
        <div className="space-y-4 mb-12">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-1 rounded-full bg-primary" />
            <h2 className="text-2xl font-bold">محتوى الكورس</h2>
          </div>
          {units.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="p-12 text-center">
                <BookOpen className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground">لم تُضف وحدات بعد</p>
              </CardContent>
            </Card>
          ) : (
            <Accordion type="multiple" defaultValue={units.map((u) => u.id)} className="space-y-3">
              {units.map((u) => (
                <AccordionItem key={u.id} value={u.id} className="border rounded-xl bg-card shadow-sm overflow-hidden">
                  <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30">
                    <span className="font-semibold text-base">{u.title}</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="px-5 pb-4 space-y-4">
                      {(chaptersByUnit.get(u.id) ?? []).map((ch) => (
                        <div key={ch.id}>
                          <div className="text-sm font-medium text-muted-foreground mb-2">{ch.title}</div>
                          <div className="space-y-1.5">
                            {(lecturesByChapter.get(ch.id) ?? []).map((l) => {
                              const isBlocked = blockedLectureIds.has(l.id);
                              const canOpen = (enrolled || l.is_free) && !isBlocked;
                              const done = progressIds.has(l.id);
                              const Wrapper: any = canOpen ? Link : "div";
                              const wrapperProps = canOpen
                                ? { to: "/courses/$courseId/lectures/$lectureId", params: { courseId, lectureId: l.id } }
                                : {};
                              const relatedExams = examsByLecture.get(l.id) ?? [];
                              return (
                                <div key={l.id} className="space-y-1.5">
                                  <Wrapper
                                    {...wrapperProps}
                                    className={`flex items-center justify-between gap-3 p-3 rounded-xl border bg-background/80 transition-all ${canOpen ? "hover:bg-accent hover:shadow-sm cursor-pointer" : "opacity-60"}`}
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      {done ? (
                                        <div className="p-1 rounded-full bg-green-100 text-green-700">
                                          <CheckCircle2 className="h-4 w-4" />
                                        </div>
                                      ) : canOpen ? (
                                        <div className="p-1 rounded-full bg-primary/10 text-primary">
                                          <PlayCircle className="h-4 w-4" />
                                        </div>
                                      ) : (
                                        <div className="p-1 rounded-full text-muted-foreground">
                                          <Lock className="h-4 w-4" />
                                        </div>
                                      )}
                                      <span className="text-sm font-medium truncate">{l.title}</span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      {isBlocked && (
                                        <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">يتطلب واجب</Badge>
                                      )}
                                      {l.is_free && <Badge variant="outline" className="text-xs">مجاني</Badge>}
                                      {l.pdf_url && <FileText className="h-3.5 w-3.5 text-muted-foreground" />}
                                    </div>
                                  </Wrapper>
                                  {/* Exams after this lecture */}
                                  {enrolled && relatedExams.length > 0 && relatedExams.map((e) => (
                                    <Link
                                      key={e.id}
                                      to="/exams/$examId"
                                      params={{ examId: e.id }}
                                      className="flex items-center justify-between gap-3 p-3 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 transition-all"
                                    >
                                      <div className="flex items-center gap-3 min-w-0">
                                        <div className="p-1 rounded-full bg-primary/10 text-primary">
                                          <FileText className="h-4 w-4" />
                                        </div>
                                        <span className="text-sm font-medium truncate">{e.title}</span>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        <Badge variant="secondary" className="text-xs">
                                          {e.type === "quiz" ? "كويز" : e.type === "assignment" ? "واجب" : "شامل"}
                                        </Badge>
                                        <ArrowRight className="h-4 w-4 text-primary" />
                                      </div>
                                    </Link>
                                  ))}
                                </div>
                              );
                            })}
                            {(lecturesByChapter.get(ch.id) ?? []).length === 0 && (
                              <div className="text-xs text-muted-foreground px-2">لا توجد محاضرات</div>
                            )}
                          </div>
                        </div>
                      ))}
                      {(chaptersByUnit.get(u.id) ?? []).length === 0 && (
                        <div className="text-sm text-muted-foreground text-center py-4">لا توجد فصول</div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>

        {/* Standalone Exams (without lecture_id) */}
        {enrolled && standaloneExams.length > 0 && (
          <div className="space-y-4 mb-12">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-1 rounded-full bg-primary" />
              <h2 className="text-2xl font-bold">الامتحانات العامة</h2>
            </div>
            <div className="grid gap-3">
              {standaloneExams.map((e) => (
                <Card key={e.id} className="border shadow-sm">
                  <CardContent className="p-5 flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="p-2 rounded-xl bg-primary/10">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm truncate">{e.title}</h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="secondary" className="text-xs">
                            {e.type === "quiz" ? "كويز" : e.type === "assignment" ? "واجب" : "شامل"}
                          </Badge>
                          {e.duration_minutes && <span>{e.duration_minutes} دقيقة</span>}
                          {e.end_at && <span>ينتهي {new Date(e.end_at).toLocaleDateString("ar-EG")}</span>}
                        </div>
                      </div>
                    </div>
                    <Button asChild size="sm" className="shrink-0">
                      <Link to="/exams/$examId" params={{ examId: e.id }}>
                        <ArrowRight className="h-4 w-4 mr-1" /> دخول
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* General Homework (without lecture_id) */}
        {enrolled && standaloneHomeworks.length > 0 && (
          <div className="space-y-4 mb-12">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-1 rounded-full bg-amber-500" />
              <h2 className="text-2xl font-bold">الواجبات العامة</h2>
            </div>
            <div className="grid gap-3">
              {standaloneHomeworks.map((h) => (
                <Card key={h.id} className="border shadow-sm">
                  <CardContent className="p-5 flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="p-2 rounded-xl bg-amber-500/10">
                        <ClipboardList className="h-5 w-5 text-amber-500" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm truncate">{h.title}</h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{h.total_points} نقطة</span>
                          {h.due_at && <span>تسليم {new Date(h.due_at).toLocaleDateString("ar-EG")}</span>}
                        </div>
                      </div>
                    </div>
                    <Button asChild size="sm" className="shrink-0">
                      <Link to="/homework/$homeworkId" params={{ homeworkId: h.id }}>
                        <ArrowRight className="h-4 w-4 mr-1" /> حل
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Lessons Section */}
        {enrolled && lessons.length > 0 && (
          <div className="space-y-4 mb-12">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-1 rounded-full bg-orange-500" />
              <h2 className="text-2xl font-bold">الحصص</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {lessons.map((l) => (
                <Link
                  key={l.id}
                  to="/courses/$courseId/lessons/$lessonId"
                  params={{ courseId, lessonId: l.id }}
                  className="block"
                >
                  <Card className="overflow-hidden border-border/60 hover:shadow-md hover:border-orange-300 transition-all cursor-pointer">
                    <div className="aspect-video bg-gradient-to-br from-orange-500/20 to-orange-500/5 relative grid place-items-center">
                      <PlayCircle className="h-14 w-14 text-orange-500/60" />
                      <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors" />
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold line-clamp-1">{l.title}</h3>
                      {l.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{l.description}</p>}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
