import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import {
  BookOpen, PlayCircle, GraduationCap, ClipboardList, CheckCircle2,
  Clock, FileText, BarChart3, Loader2, AlertCircle, Brain,
  Eye, Target, Sparkles, Library, ImageIcon,
} from "lucide-react";

type LectureItem = { id: string; title: string; course_id: string; course_title: string; completed: boolean; watched_seconds: number; last_watched_at: string };
type HomeworkItem = { id: string; title: string; course_id: string; course_title: string; due_at: string | null; total_points: number; status: string | null; score: number | null };
type ExamResultItem = {
  exam_id: string; exam_title: string;
  total_questions: number;
  score: number | null; max_score: number | null;
  percentage: number | null;
  answered_count: number; correct_count: number; wrong_count: number;
  submitted_at: string | null; status: string;
};

type HomeworkResultItem = {
  id: string; title: string;
  total_points: number;
  score: number | null; max_score: number | null;
  percentage: number | null;
  status: string;
  submitted_at: string | null; graded_at: string | null;
};

type CourseData = {
  id: string; title: string; description: string | null;
  cover_url: string | null; grade: string | null;
  term: string | null; month: string | null;
  price: number; discount_percent: number;
};

export function CoursesSection() {
  const { user, profile } = useAuth();
  const [filterMode, setFilterMode] = useState<"enrolled" | "suggested" | "all">("enrolled");
  const [loading, setLoading] = useState(true);

  const [allCourses, setAllCourses] = useState<CourseData[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<CourseData[]>([]);
  const [userGrade, setUserGrade] = useState<string | null>(null);
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      setLoading(true);

      const [enrollRes, profileRes] = await Promise.all([
        supabase
          .from("enrollments")
          .select("course_id, courses!inner(id, title, description, cover_url, grade, term, month, price, discount_percent)")
          .eq("student_id", user.id)
          .eq("status", "active"),
        supabase.from("profiles").select("grade").eq("id", user.id).maybeSingle(),
      ]);

      const enrolled = ((enrollRes.data ?? []) as any[]).map((e: any) => ({
        id: e.courses.id,
        title: e.courses.title ?? "",
        description: e.courses.description,
        cover_url: e.courses.cover_url,
        grade: e.courses.grade,
        term: e.courses.term,
        month: e.courses.month,
        price: e.courses.price,
        discount_percent: e.courses.discount_percent,
      }));
      setEnrolledCourses(enrolled);
      setEnrolledIds(new Set(enrolled.map((c: any) => c.id)));
      setUserGrade((profileRes.data as any)?.grade ?? null);
      setLoading(false);
    })();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase
        .from("courses").select("id,title,description,cover_url,grade,term,month,price,discount_percent")
        .eq("is_published", true).eq("is_center_only", false).order("order_index");
      setAllCourses((data ?? []) as CourseData[]);
    })();
  }, [user?.id]);

  const suggestedCount = useMemo(() =>
    allCourses.filter((c) => c.grade === userGrade).length,
    [allCourses, userGrade],
  );

  const stats = [
    { key: "enrolled" as const, label: "الكورسات المسجلة", value: enrolledIds.size, icon: BookOpen, color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
    { key: "suggested" as const, label: "كورسات مقترحة", value: suggestedCount, icon: Sparkles, color: "text-emerald-600", bgColor: "bg-emerald-100 dark:bg-emerald-900/30" },
    { key: "all" as const, label: "الكورسات المتاحة", value: allCourses.length, icon: Library, color: "text-primary", bgColor: "bg-primary/10" },
  ];

  if (loading) return <Card><CardContent className="p-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></CardContent></Card>;

  const filteredCourses = filterMode === "enrolled" ? enrolledCourses
    : filterMode === "suggested" ? allCourses.filter((c) => c.grade === userGrade)
    : allCourses;

  return (
    <section className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <motion.div key={s.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Card
              className={`cursor-pointer transition-all hover:shadow-md ${filterMode === s.key ? "ring-2 ring-primary shadow-md" : ""}`}
              onClick={() => setFilterMode(s.key)}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${s.bgColor} ${s.color}`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {filterMode === "enrolled" ? (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold">كورساتي</h2>
              <span className="text-xs text-muted-foreground">({enrolledCourses.length} كورس)</span>
            </div>
            <Button asChild variant="link" size="sm"><Link to="/courses">عرض الكل</Link></Button>
          </div>
          {enrolledCourses.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">لم تسجل في أي كورس بعد.</CardContent></Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {enrolledCourses.map((c, i) => (
                <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                    <Link to="/courses/$courseId" params={{ courseId: c.id }}>
                      <div className="aspect-video bg-muted relative">
                        {c.cover_url ? (
                          <img src={c.cover_url} alt={c.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full grid place-items-center text-muted-foreground"><ImageIcon className="h-8 w-8" /></div>
                        )}
                        <Badge className="absolute top-2 right-2 bg-green-600">مشترك</Badge>
                      </div>
                      <CardContent className="p-3 space-y-2">
                        <h3 className="font-semibold text-sm line-clamp-1">{c.title}</h3>
                        {c.description && <p className="text-xs text-muted-foreground line-clamp-2">{c.description}</p>}
                        <p className="text-xs text-muted-foreground">
                          {[c.grade, c.term, c.month].filter(Boolean).join(" · ") || "—"}
                        </p>
                        <div className="flex items-center justify-between pt-2 border-t">
                          <div className="text-sm font-bold text-primary">مشترك ✓</div>
                          <span className="inline-flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-accent">افتح</span>
                        </div>
                      </CardContent>
                    </Link>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex items-center gap-2">
            {filterMode === "suggested" ? <Sparkles className="h-5 w-5 text-emerald-600" /> : <Library className="h-5 w-5 text-primary" />}
            <h2 className="text-xl font-bold">{filterMode === "suggested" ? "كورسات مقترحة لك" : "كل الكورسات"}</h2>
          </div>
          {filteredCourses.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
              {filterMode === "suggested" ? "لا توجد كورسات مقترحة لصفك حالياً." : "لا توجد كورسات متاحة حالياً."}
            </CardContent></Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {(filteredCourses as CourseData[]).map((c, i) => {
                const enrolled = enrolledIds.has(c.id);
                return (
                  <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                      <div className="aspect-video bg-muted relative">
                        {c.cover_url ? (
                          <img src={c.cover_url} alt={c.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full grid place-items-center text-muted-foreground"><ImageIcon className="h-8 w-8" /></div>
                        )}
                        {enrolled && <Badge className="absolute top-2 right-2 bg-green-600">مشترك</Badge>}
                      </div>
                      <CardContent className="p-3 space-y-2">
                        <h3 className="font-semibold text-sm line-clamp-1">{c.title}</h3>
                        <p className="text-xs text-muted-foreground">
                          {[c.grade, c.term, c.month].filter(Boolean).join(" · ") || "—"}
                        </p>
                        <div className="flex items-center justify-between pt-2 border-t">
                          <div className="flex items-baseline gap-1.5">
                            {c.discount_percent > 0 ? (
                              <>
                                <span className="text-sm font-bold text-primary">{(c.price * (1 - c.discount_percent / 100)).toFixed(0)} ج</span>
                                <span className="text-xs text-muted-foreground line-through">{c.price} ج</span>
                              </>
                            ) : (
                              <span className="text-sm font-bold text-primary">{c.price} ج</span>
                            )}
                          </div>
                          {enrolled ? (
                            <Button asChild size="sm" variant="outline">
                              <Link to="/courses/$courseId" params={{ courseId: c.id }}>افتح</Link>
                            </Button>
                          ) : (
                            <Button asChild size="sm">
                              <Link to="/payments/new" search={{ courseId: c.id } as any}>اشترك</Link>
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </>
      )}
    </section>
  );
}

export function ViewingDetailsSection() {
  const { user } = useAuth();
  const [lectures, setLectures] = useState<LectureItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, completed: 0, totalMinutes: 0 });

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase
        .from("lecture_progress")
        .select("lecture_id, completed, watched_seconds, last_watched_at, lectures!inner(id, title, chapter_id, chapters!inner(unit_id, units!inner(course_id, courses!inner(id, title)))))")
        .eq("student_id", user.id)
        .order("last_watched_at", { ascending: false });
      const items = ((data ?? []) as any[])
        .filter((p: any) => p.lectures?.chapters?.units?.courses)
        .slice(0, 10)
        .map((p: any) => ({
          id: p.lecture_id, title: p.lectures?.title ?? "",
          course_id: p.lectures?.chapters?.units?.course_id ?? "",
          course_title: p.lectures?.chapters?.units?.courses?.title ?? "",
          completed: p.completed ?? false,
          watched_seconds: p.watched_seconds ?? 0,
          last_watched_at: p.last_watched_at,
        }));
      setLectures(items);
      const all = (data ?? []) as any[];
      setStats({
        total: all.length,
        completed: all.filter((p: any) => p.completed).length,
        totalMinutes: Math.round(all.reduce((s: number, p: any) => s + (p.watched_seconds ?? 0), 0) / 60),
      });
      setLoading(false);
    })();
  }, [user?.id]);

  if (loading) return <Card><CardContent className="p-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></CardContent></Card>;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Eye className="h-5 w-5 text-blue-500" />
        <h2 className="text-xl font-bold">تفاصيل المشاهدات</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-3 mb-4">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">إجمالي المحاضرات</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-green-600">{stats.completed}</p><p className="text-xs text-muted-foreground">مكتملة</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-blue-600">{stats.totalMinutes}</p><p className="text-xs text-muted-foreground">دقائق المشاهدة</p></CardContent></Card>
      </div>
      {lectures.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">لا توجد مشاهدات بعد</CardContent></Card>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {lectures.map((l, i) => (
            <motion.div key={l.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Link to="/courses/$courseId/lectures/$lectureId" params={{ courseId: l.course_id, lectureId: l.id }} className="block">
                <Card className="hover:shadow-elegant transition cursor-pointer">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg ${l.completed ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                      {l.completed ? <CheckCircle2 className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{l.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{l.course_title}</p>
                    </div>
                    <Badge variant={l.completed ? "secondary" : "outline"} className="text-xs">{l.completed ? "مكتمل" : "قيد المشاهدة"}</Badge>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}

function fetchAnswerStats(attemptIds: string[]) {
  return supabase
    .from("student_answers")
    .select("attempt_id, is_correct")
    .in("attempt_id", attemptIds);
}

function buildAnswerMap(answers: any[]): Map<string, { answered: number; correct: number; wrong: number }> {
  const map = new Map<string, { answered: number; correct: number; wrong: number }>();
  answers.forEach((a: any) => {
    const entry = map.get(a.attempt_id) ?? { answered: 0, correct: 0, wrong: 0 };
    if (a.is_correct === true) { entry.answered++; entry.correct++; }
    else if (a.is_correct === false) { entry.answered++; entry.wrong++; }
    else entry.answered++;
    map.set(a.attempt_id, entry);
  });
  return map;
}

export function ExamResultsSection() {
  const { user } = useAuth();
  const [results, setResults] = useState<ExamResultItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data: attempts } = await supabase
        .from("exam_attempts")
        .select("id, exam_id, score, max_score, status, submitted_at, exams!inner(id, title)")
        .eq("student_id", user.id)
        .eq("exams.is_published", true)
        .neq("exams.type", "quiz")
        .order("submitted_at", { ascending: false });

      if (!attempts?.length) { setLoading(false); return; }

      const examIds = [...new Set(attempts.map((a: any) => a.exam_id))];
      const attemptIds = attempts.map((a: any) => a.id);

      const { data: qCounts } = await supabase
        .from("questions")
        .select("exam_id")
        .in("exam_id", examIds);

      const qCountMap = new Map<string, number>();
      (qCounts ?? []).forEach((q: any) => qCountMap.set(q.exam_id, (qCountMap.get(q.exam_id) ?? 0) + 1));

      const { data: answers } = await fetchAnswerStats(attemptIds);
      const ansMap = buildAnswerMap(answers ?? []);

      setResults(attempts
        .filter((a: any) => a.status === "submitted" || a.status === "graded")
        .slice(0, 10)
        .map((a: any) => {
          const stats = ansMap.get(a.id) ?? { answered: 0, correct: 0, wrong: 0 };
          return {
            exam_id: a.exam_id,
            exam_title: a.exams?.title ?? "",
            total_questions: qCountMap.get(a.exam_id) ?? 0,
            score: a.score,
            max_score: a.max_score,
            percentage: a.score != null && a.max_score ? Math.round((a.score / a.max_score) * 100) : null,
            answered_count: stats.answered,
            correct_count: stats.correct,
            wrong_count: stats.wrong,
            submitted_at: a.submitted_at,
            status: a.status,
          };
        }));
      setLoading(false);
    })();
  }, [user?.id]);

  if (loading) return <Card><CardContent className="p-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></CardContent></Card>;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-purple-500" />
          <h2 className="text-xl font-bold">نتائج الامتحانات</h2>
        </div>
        <Button asChild variant="link" size="sm"><Link to="/exams">عرض الكل</Link></Button>
      </div>
      {results.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">لم تختبر أي امتحان بعد</CardContent></Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground text-xs font-semibold">
                <th className="p-3 text-center whitespace-nowrap">#</th>
                <th className="p-3 text-center whitespace-nowrap">اسم الامتحان</th>
                <th className="p-3 text-center whitespace-nowrap">عدد الأسئلة</th>
                <th className="p-3 text-center whitespace-nowrap">النتيجة</th>
                <th className="p-3 text-center whitespace-nowrap">الدرجة</th>
                <th className="p-3 text-center whitespace-nowrap">عدد المحلولة</th>
                <th className="p-3 text-center whitespace-nowrap">عدد الصحيحة</th>
                <th className="p-3 text-center whitespace-nowrap">عدد الخاطئة</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={r.exam_id} className="border-t hover:bg-muted/30 transition-colors">
                  <td className="p-3 text-center text-muted-foreground">{i + 1}</td>
                  <td className="p-3 text-center text-xs font-semibold">
                    <Link to="/exams/$examId/result" params={{ examId: r.exam_id }} className="hover:text-primary transition-colors">
                      {r.exam_title}
                    </Link>
                  </td>
                  <td className="p-3 text-center text-xs">{r.total_questions}</td>
                  <td className="p-3 text-center text-xs">
                    <Badge variant={r.percentage != null && r.percentage >= 50 ? "secondary" : "destructive"} className="text-xs">
                      {r.percentage != null ? `${r.percentage}%` : "—"}
                    </Badge>
                  </td>
                  <td className="p-3 text-center text-xs font-medium">{r.score ?? "?"}/{r.max_score ?? "?"}</td>
                  <td className="p-3 text-center text-xs">{r.answered_count}</td>
                  <td className="p-3 text-center text-xs text-green-600 font-medium">{r.correct_count}</td>
                  <td className="p-3 text-center text-xs text-red-600 font-medium">{r.wrong_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function AssessmentResultsSection() {
  const { user } = useAuth();
  const [results, setResults] = useState<ExamResultItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data: attempts } = await supabase
        .from("exam_attempts")
        .select("id, exam_id, score, max_score, status, submitted_at, exams!inner(id, title)")
        .eq("student_id", user.id)
        .eq("exams.is_published", true)
        .eq("exams.type", "quiz")
        .order("submitted_at", { ascending: false });

      if (!attempts?.length) { setLoading(false); return; }

      const examIds = [...new Set(attempts.map((a: any) => a.exam_id))];
      const attemptIds = attempts.map((a: any) => a.id);

      const { data: qCounts } = await supabase
        .from("questions")
        .select("exam_id")
        .in("exam_id", examIds);

      const qCountMap = new Map<string, number>();
      (qCounts ?? []).forEach((q: any) => qCountMap.set(q.exam_id, (qCountMap.get(q.exam_id) ?? 0) + 1));

      const { data: answers } = await fetchAnswerStats(attemptIds);
      const ansMap = buildAnswerMap(answers ?? []);

      setResults(attempts
        .filter((a: any) => a.status === "submitted" || a.status === "graded")
        .slice(0, 10)
        .map((a: any) => {
          const stats = ansMap.get(a.id) ?? { answered: 0, correct: 0, wrong: 0 };
          return {
            exam_id: a.exam_id,
            exam_title: a.exams?.title ?? "",
            total_questions: qCountMap.get(a.exam_id) ?? 0,
            score: a.score,
            max_score: a.max_score,
            percentage: a.score != null && a.max_score ? Math.round((a.score / a.max_score) * 100) : null,
            answered_count: stats.answered,
            correct_count: stats.correct,
            wrong_count: stats.wrong,
            submitted_at: a.submitted_at,
            status: a.status,
          };
        }));
      setLoading(false);
    })();
  }, [user?.id]);

  if (loading) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-cyan-500" />
          <h2 className="text-xl font-bold">نتائج اختبارات التقييم</h2>
        </div>
        <Button asChild variant="link" size="sm"><Link to="/exams">عرض الكل</Link></Button>
      </div>
      {results.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">لم تخض أي اختبار تقييم بعد</CardContent></Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground text-xs font-semibold">
                <th className="p-3 text-center whitespace-nowrap">#</th>
                <th className="p-3 text-center whitespace-nowrap">اسم الاختبار</th>
                <th className="p-3 text-center whitespace-nowrap">عدد الأسئلة</th>
                <th className="p-3 text-center whitespace-nowrap">النتيجة</th>
                <th className="p-3 text-center whitespace-nowrap">الدرجة</th>
                <th className="p-3 text-center whitespace-nowrap">عدد المحلولة</th>
                <th className="p-3 text-center whitespace-nowrap">عدد الصحيحة</th>
                <th className="p-3 text-center whitespace-nowrap">عدد الخاطئة</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={r.exam_id} className="border-t hover:bg-muted/30 transition-colors">
                  <td className="p-3 text-center text-muted-foreground">{i + 1}</td>
                  <td className="p-3 text-center text-xs font-semibold">
                    <Link to="/exams/$examId/result" params={{ examId: r.exam_id }} className="hover:text-primary transition-colors">
                      {r.exam_title}
                    </Link>
                  </td>
                  <td className="p-3 text-center text-xs">{r.total_questions}</td>
                  <td className="p-3 text-center text-xs">
                    <Badge variant={r.percentage != null && r.percentage >= 50 ? "secondary" : "destructive"} className="text-xs">
                      {r.percentage != null ? `${r.percentage}%` : "—"}
                    </Badge>
                  </td>
                  <td className="p-3 text-center text-xs font-medium">{r.score ?? "?"}/{r.max_score ?? "?"}</td>
                  <td className="p-3 text-center text-xs">{r.answered_count}</td>
                  <td className="p-3 text-center text-xs text-green-600 font-medium">{r.correct_count}</td>
                  <td className="p-3 text-center text-xs text-red-600 font-medium">{r.wrong_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function HomeworkResultsSection() {
  const { user } = useAuth();
  const [results, setResults] = useState<HomeworkResultItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data: subs } = await supabase
        .from("homework_submissions")
        .select("id, homework_id, status, score, submitted_at, graded_at, homework!inner(id, title, total_points)")
        .eq("student_id", user.id)
        .eq("homework.is_published", true);

      if (!subs?.length) { setLoading(false); return; }

      setResults(subs
        .filter((s: any) => s.status === "graded")
        .slice(0, 10)
        .map((s: any) => ({
          id: s.homework_id,
          title: s.homework?.title ?? "",
          total_points: s.homework?.total_points ?? 0,
          score: s.score,
          max_score: s.score != null ? s.homework?.total_points : null,
          percentage: s.score != null ? Math.round((s.score / (s.homework?.total_points ?? 1)) * 100) : null,
          status: s.status,
          submitted_at: s.submitted_at,
          graded_at: s.graded_at,
        })));
      setLoading(false);
    })();
  }, [user?.id]);

  if (loading) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <ClipboardList className="h-5 w-5 text-amber-500" />
        <h2 className="text-xl font-bold">نتائج الواجبات</h2>
      </div>
      {results.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">لا توجد واجبات مصححة بعد</CardContent></Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground text-xs font-semibold">
                <th className="p-3 text-center whitespace-nowrap">#</th>
                <th className="p-3 text-center whitespace-nowrap">اسم الواجب</th>
                <th className="p-3 text-center whitespace-nowrap">الدرجة</th>
                <th className="p-3 text-center whitespace-nowrap">النتيجة</th>
                <th className="p-3 text-center whitespace-nowrap">تاريخ التسليم</th>
                <th className="p-3 text-center whitespace-nowrap">تاريخ التصحيح</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={r.id} className="border-t hover:bg-muted/30 transition-colors">
                  <td className="p-3 text-center text-muted-foreground">{i + 1}</td>
                  <td className="p-3 text-center text-xs font-semibold">{r.title}</td>
                  <td className="p-3 text-center text-xs font-medium">{r.score ?? "?"}/{r.total_points}</td>
                  <td className="p-3 text-center text-xs">
                    <Badge variant={r.percentage != null && r.percentage >= 50 ? "secondary" : "destructive"} className="text-xs">
                      {r.percentage != null ? `${r.percentage}%` : "—"}
                    </Badge>
                  </td>
                  <td className="p-3 text-center text-xs">
                    {r.submitted_at ? new Date(r.submitted_at).toLocaleDateString("ar-EG") : "—"}
                  </td>
                  <td className="p-3 text-center text-xs">
                    {r.graded_at ? new Date(r.graded_at).toLocaleDateString("ar-EG") : "—"}
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
