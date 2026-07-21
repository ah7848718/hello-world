import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { VideoPlayer } from "@/components/VideoPlayer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import {
  ArrowRight, ArrowLeft, CheckCircle2, ClipboardList, FileText, GraduationCap, Loader2, Lock, PlayCircle,
  BookOpen, ListVideo, ChevronDown,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/courses/$courseId/lectures/$lectureId")({
  component: Page,
  head: () => ({ meta: [{ title: "محاضرة | مستر حاتم سميكه" }] }),
});

type Lecture = {
  id: string; title: string; description: string | null; chapter_id: string; order_index: number;
  is_free: boolean; pdf_url: string | null;
  video_provider: "youtube" | "bunny" | "vdocipher" | null; video_id: string | null; video_url: string | null;
};

type SiblingLecture = { id: string; title: string; order_index: number; chapter_id: string };

type HomeworkItem = { id: string; title: string; due_at: string | null; total_points: number };

type ExamItem = { id: string; title: string; duration_minutes: number | null; type: string };

type SidebarUnit = {
  unit: { id: string; title: string };
  chapters: {
    chapter: { id: string; title: string };
    lectures: { id: string; title: string; is_free: boolean; isCurrent: boolean }[];
  }[];
};

function Page() {
  const { courseId, lectureId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [siblings, setSiblings] = useState<SiblingLecture[]>([]);
  const [homeworks, setHomeworks] = useState<HomeworkItem[]>([]);
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [completed, setCompleted] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [watermark, setWatermark] = useState<string>("");
  const [prerequisiteBlocked, setPrerequisiteBlocked] = useState(false);
  const [prerequisiteHwTitle, setPrerequisiteHwTitle] = useState("");
  const [prevLectureTitle, setPrevLectureTitle] = useState("");
  const [outline, setOutline] = useState<SidebarUnit[]>([]);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      // Fetch lecture
      const { data: l } = await supabase
        .from("lectures")
        .select("id,title,description,chapter_id,order_index,is_free,pdf_url,video_provider,video_id,video_url")
        .eq("id", lectureId)
        .maybeSingle();
      setLecture(l as any);

      // Enrollment
      if (user) {
        const { data: en } = await supabase
          .from("enrollments")
          .select("id")
          .eq("course_id", courseId)
          .eq("student_id", user.id)
          .eq("status", "active")
          .maybeSingle();
        setEnrolled(!!en);

        // Watermark: student name + phone
        const { data: prof } = await supabase
          .from("profiles")
          .select("full_name,phone")
          .eq("id", user.id)
          .maybeSingle();
        if (prof) {
          const phone = (prof as any).phone ?? "";
          const name = (prof as any).full_name ?? "";
          setWatermark([name, phone].filter(Boolean).join(" · "));
        }
      }

      // Course outline: units → chapters → lectures
      const { data: us } = await supabase
        .from("units")
        .select("id,title,order_index")
        .eq("course_id", courseId)
        .order("order_index");
      const unitIds = (us ?? []).map((u: any) => u.id);

      const { data: chs } = unitIds.length
        ? await supabase
            .from("chapters")
            .select("id,title,unit_id,order_index")
            .in("unit_id", unitIds)
            .order("order_index")
        : { data: [] };
      const chIds = (chs ?? []).map((c: any) => c.id);

      const { data: allLectures } = chIds.length
        ? await supabase
            .from("lectures")
            .select("id,title,chapter_id,order_index,is_free")
            .in("chapter_id", chIds)
            .order("order_index")
        : { data: [] };

      // Sort linearly for prev/next
      const unitOrder = new Map((us ?? []).map((u: any, i) => [u.id, i]));
      const chOrder = new Map((chs ?? []).map((c: any, i) => [c.id, { unitId: c.unit_id, idx: i }]));
      const sorted = ((allLectures ?? []) as any[]).slice().sort((a, b) => {
        const ca = chOrder.get(a.chapter_id); const cb = chOrder.get(b.chapter_id);
        const ua = unitOrder.get(ca?.unitId) ?? 0; const ub = unitOrder.get(cb?.unitId) ?? 0;
        if (ua !== ub) return ua - ub;
        if ((ca?.idx ?? 0) !== (cb?.idx ?? 0)) return (ca?.idx ?? 0) - (cb?.idx ?? 0);
        return (a.order_index ?? 0) - (b.order_index ?? 0);
      });
      setSiblings(sorted);

      // Build hierarchical outline for sidebar
      const chByUnit = new Map<string, any[]>();
      for (const ch of chs ?? []) {
        const list = chByUnit.get(ch.unit_id) ?? [];
        list.push(ch);
        chByUnit.set(ch.unit_id, list);
      }
      const lecByCh = new Map<string, any[]>();
      for (const lec of allLectures ?? []) {
        const list = lecByCh.get(lec.chapter_id) ?? [];
        list.push(lec);
        lecByCh.set(lec.chapter_id, list);
      }
      const built: SidebarUnit[] = [];
      for (const u of us ?? []) {
        const chapters = chByUnit.get(u.id) ?? [];
        const outlineChapters = chapters.map((ch: any) => ({
          chapter: { id: ch.id, title: ch.title },
          lectures: (lecByCh.get(ch.id) ?? []).map((lec: any) => ({
            id: lec.id,
            title: lec.title,
            is_free: lec.is_free,
            isCurrent: lec.id === lectureId,
          })),
        }));
        built.push({ unit: { id: u.id, title: u.title }, chapters: outlineChapters });
      }
      setOutline(built);

      // Homework and exams linked to this lecture
      const [{ data: hw }, { data: ex }] = await Promise.all([
        supabase.from("homework").select("id,title,due_at,total_points").eq("lecture_id", lectureId).eq("is_published", true),
        supabase.from("exams").select("id,title,duration_minutes,type").eq("lecture_id", lectureId).eq("is_published", true),
      ]);
      setHomeworks((hw ?? []) as any);
      setExams((ex ?? []) as any);

      // Progress
      if (user) {
        const { data: prog } = await supabase
          .from("lecture_progress")
          .select("completed")
          .eq("student_id", user.id)
          .eq("lecture_id", lectureId)
          .maybeSingle();
        setCompleted(!!prog?.completed);
      }

      // Prerequisite homework check: must complete previous lecture's homework
      setPrerequisiteBlocked(false);
      const curIdx = (sorted ?? []).findIndex((s: any) => s.id === lectureId);
      if (curIdx > 0 && user && enrolled) {
        const prevLec = sorted[curIdx - 1] as SiblingLecture;
        const { data: prevHwList } = await supabase
          .from("homework")
          .select("id,title")
          .eq("lecture_id", prevLec.id)
          .eq("is_published", true);
        if (prevHwList && prevHwList.length > 0) {
          const hwIds = prevHwList.map((h: any) => h.id);
          const { data: subs } = await supabase
            .from("homework_submissions")
            .select("homework_id")
            .eq("student_id", user.id)
            .in("homework_id", hwIds)
            .in("status", ["submitted", "graded"]);
          const completedIds = new Set((subs ?? []).map((s: any) => s.homework_id));
          const allDone = hwIds.every((id: string) => completedIds.has(id));
          if (!allDone) {
            setPrerequisiteBlocked(true);
            setPrerequisiteHwTitle(prevHwList.map((h: any) => h.title).join(" + "));
            setPrevLectureTitle(prevLec.title);
          }
        }
      }

      setLoading(false);
    })();
  }, [courseId, lectureId, user?.id]);

  const { prev, next } = useMemo(() => {
    const idx = siblings.findIndex((s) => s.id === lectureId);
    return {
      prev: idx > 0 ? siblings[idx - 1] : null,
      next: idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null,
    };
  }, [siblings, lectureId]);

  const toggleComplete = async () => {
    if (!user) return;
    const newVal = !completed;
    setCompleted(newVal);
    const { error } = await supabase.from("lecture_progress").upsert(
      { student_id: user.id, lecture_id: lectureId, completed: newVal, last_watched_at: new Date().toISOString() },
      { onConflict: "student_id,lecture_id" } as any
    );
    if (error) {
      toast.error("تعذّر حفظ التقدم");
      setCompleted(!newVal);
    } else {
      toast.success(newVal ? "تم تعليم المحاضرة كمكتملة" : "تم إلغاء الإكمال");
    }
  };

  if (loading) {
    return <div className="grid place-items-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (!lecture) {
    return <div className="container max-w-3xl mx-auto px-4 py-12 text-center">المحاضرة غير موجودة</div>;
  }
  if (!enrolled && !lecture.is_free) {
    return (
      <div className="container max-w-3xl mx-auto px-4 py-12">
        <Card><CardContent className="p-8 text-center space-y-3">
          <p>هذه المحاضرة غير متاحة. يجب الاشتراك في الكورس أولاً.</p>
          <Button asChild><Link to="/payments/new" search={{ courseId } as any}>اشترك الآن</Link></Button>
        </CardContent></Card>
      </div>
    );
  }

  const currentIdx = siblings.findIndex((s) => s.id === lectureId);

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)]">
      {/* Mobile toggle */}
      <div className="lg:hidden flex items-center justify-between px-4 py-2 border-b bg-background sticky top-0 z-10">
        <button
          onClick={() => setMobileSidebarOpen((v) => !v)}
          className="flex items-center gap-2 text-sm font-medium"
        >
          <ListVideo className="h-4 w-4" />
          قائمة المحاضرات
          <ChevronDown className={`h-4 w-4 transition-transform ${mobileSidebarOpen ? "" : "-rotate-90"}`} />
        </button>
        <span className="text-xs text-muted-foreground">
          {currentIdx + 1} / {siblings.length}
        </span>
      </div>

      {/* Mobile sidebar drawer */}
      {mobileSidebarOpen && (
        <div className="lg:hidden border-b max-h-[45vh] overflow-y-auto bg-background">
          <div className="p-2 space-y-1">
            {outline.map((unit) => (
              <SidebarUnitBlock
                key={unit.unit.id}
                unit={unit}
                courseId={courseId}
                currentLectureId={lectureId}
              />
            ))}
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 min-w-0 px-4 pb-8 space-y-4 pt-4">
        <Link
          to="/courses/$courseId"
          params={{ courseId }}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground w-fit"
        >
          <ArrowRight className="h-4 w-4" /> العودة للكورس
        </Link>

        <div>
          <h1 className="text-xl md:text-2xl font-display font-bold">{lecture.title}</h1>
          {lecture.description && <p className="text-muted-foreground mt-1 text-sm">{lecture.description}</p>}
        </div>

        {/* Video / Prerequisite lock */}
        {prerequisiteBlocked ? (
          <Card>
            <CardContent className="p-8 text-center space-y-4">
              <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
              <div className="space-y-1">
                <p className="font-bold text-lg">هذه المحاضرة مقفلة</p>
                <p className="text-sm text-muted-foreground">
                  يجب حل واجب المحاضرة السابقة أولاً
                </p>
              </div>
              <div className="bg-muted rounded-lg p-3 space-y-1 text-sm">
                <p className="font-medium">{prevLectureTitle}</p>
                <p className="text-muted-foreground">الواجب: {prerequisiteHwTitle}</p>
              </div>
              {prev && (
                <Button asChild variant="outline">
                  <Link to="/courses/$courseId/lectures/$lectureId" params={{ courseId, lectureId: prev.id }}>
                    <ArrowRight className="h-4 w-4 ml-1" /> الذهاب للمحاضرة السابقة
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            <VideoPlayer
              provider={lecture.video_provider}
              videoId={lecture.video_id}
              videoUrl={lecture.video_url}
              title={lecture.title}
              watermark={watermark || null}
            />
            <p className="text-xs text-muted-foreground -mt-2">
              محتوى محمي · تظهر بياناتك على الفيديو لحماية الحقوق
            </p>
          </>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button onClick={toggleComplete} variant={completed ? "outline" : "default"}>
            <CheckCircle2 className="h-4 w-4 ml-1" />
            {completed ? "تم الإكمال ✓" : "تعليم كمكتملة"}
          </Button>
          <div className="flex items-center gap-2">
            {prev && (
              <Button asChild variant="outline" size="sm">
                <Link to="/courses/$courseId/lectures/$lectureId" params={{ courseId, lectureId: prev.id }}>
                  <ArrowRight className="h-4 w-4 ml-1" /> السابقة
                </Link>
              </Button>
            )}
            {next && (
              <Button asChild size="sm">
                <Link to="/courses/$courseId/lectures/$lectureId" params={{ courseId, lectureId: next.id }}>
                  التالية <ArrowLeft className="h-4 w-4 mr-1" />
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Unified Learning Path List */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            محتويات المحاضرة
          </h2>

          <Card>
            <CardContent className="p-0 divide-y">
              {/* Video item */}
              <Row
                icon={<PlayCircle className="h-5 w-5 text-primary" />}
                title="الفيديو الرئيسي"
                subtitle={lecture.video_provider ? `مصدر: ${lecture.video_provider}` : "—"}
                right={completed ? <Badge className="bg-green-600">مكتمل</Badge> : <Badge variant="outline">قيد المشاهدة</Badge>}
              />

              {/* PDF */}
              {lecture.pdf_url && (
                <a href={lecture.pdf_url} target="_blank" rel="noreferrer" className="block hover:bg-accent transition-colors">
                  <Row
                    icon={<FileText className="h-5 w-5 text-blue-500" />}
                    title="ملف المحاضرة (PDF)"
                    subtitle="فتح في تبويب جديد"
                    right={<Button size="sm" variant="outline">تحميل</Button>}
                  />
                </a>
              )}

              {/* Homeworks */}
              {homeworks.map((h) => (
                <button
                  key={h.id}
                  onClick={() => { try { navigate({ to: "/homework/$homeworkId", params: { homeworkId: h.id } }); } catch { console.error("navigation failed"); } }}
                  className="w-full text-right hover:bg-accent transition-colors"
                >
                  <Row
                    icon={<ClipboardList className="h-5 w-5 text-amber-500" />}
                    title={h.title}
                    subtitle={`واجب · ${h.total_points} نقطة${h.due_at ? ` · حتى ${new Date(h.due_at).toLocaleDateString("ar-EG")}` : ""}`}
                    right={<Button size="sm">حل</Button>}
                  />
                </button>
              ))}

              {/* Exams */}
              {exams.map((e) => (
                <button
                  key={e.id}
                  onClick={() => { try { navigate({ to: "/exams/$examId", params: { examId: e.id } }); } catch { console.error("navigation failed"); } }}
                  className="w-full text-right hover:bg-accent transition-colors"
                >
                  <Row
                    icon={<GraduationCap className="h-5 w-5 text-purple-500" />}
                    title={e.title}
                    subtitle={`امتحان${e.duration_minutes ? ` · ${e.duration_minutes} دقيقة` : ""}`}
                    right={<Button size="sm">ابدأ</Button>}
                  />
                </button>
              ))}

              {!lecture.pdf_url && homeworks.length === 0 && exams.length === 0 && (
                <div className="p-6 text-center text-sm text-muted-foreground">لا توجد ملفات أو واجبات أو امتحانات مرتبطة</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-80 shrink-0 border-s">
        <div className="sticky top-0 h-screen flex flex-col bg-background">
          <div className="p-3 border-b">
            <h2 className="font-bold text-sm flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              محتوى الكورس
            </h2>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {outline.map((unit) => (
                <SidebarUnitBlock
                  key={unit.unit.id}
                  unit={unit}
                  courseId={courseId}
                  currentLectureId={lectureId}
                />
              ))}
            </div>
          </ScrollArea>
        </div>
      </aside>
    </div>
  );
}

function SidebarUnitBlock({
  unit,
  courseId,
  currentLectureId,
}: {
  unit: SidebarUnit;
  courseId: string;
  currentLectureId: string;
}) {
  const hasCurrent = unit.chapters.some((ch) =>
    ch.lectures.some((l) => l.isCurrent)
  );
  const [open, setOpen] = useState(hasCurrent);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent transition-colors">
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "" : "-rotate-90"}`}
        />
        <span className="truncate">{unit.unit.title}</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mr-2 border-r pr-2 space-y-1 pb-1">
          {unit.chapters.map((ch) => (
            <div key={ch.chapter.id}>
              <p className="text-xs text-muted-foreground px-3 py-1 font-medium truncate">
                {ch.chapter.title}
              </p>
              {ch.lectures.map((lec) => (
                <Link
                  key={lec.id}
                  to="/courses/$courseId/lectures/$lectureId"
                  params={{ courseId, lectureId: lec.id }}
                  className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                    lec.isCurrent
                      ? "bg-primary/10 text-primary font-bold"
                      : "hover:bg-accent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <PlayCircle
                    className={`h-3.5 w-3.5 shrink-0 ${lec.isCurrent ? "text-primary" : ""}`}
                  />
                  <span className="truncate">{lec.title}</span>
                </Link>
              ))}
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function Row({ icon, title, subtitle, right }: { icon: React.ReactNode; title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 p-4">
      <div className="shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{title}</div>
        {subtitle && <div className="text-xs text-muted-foreground truncate">{subtitle}</div>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}
