import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { uploadToCloudinary } from "@/lib/cloudinary-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowRight,
  BookOpen,
  Eye,
  EyeOff,
  FileText,
  GraduationCap,
  Link2,
  Loader2,
  Pencil,
  PlayCircle,
  Plus,
  Trash2,
  Upload,
  Video,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

const extractYouTubeId = (url: string) => {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : url;
};

type Unit = Database["public"]["Tables"]["units"]["Row"];
type Chapter = Database["public"]["Tables"]["chapters"]["Row"];
type Lecture = Database["public"]["Tables"]["lectures"]["Row"];
type Course = Database["public"]["Tables"]["courses"]["Row"];

export const Route = createFileRoute("/_authenticated/admin/courses/$courseId")({
  component: Page,
});

function Page() {
  const { courseId } = Route.useParams();
  const [course, setCourse] = useState<Course | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [attachOpen, setAttachOpen] = useState(false);
  const [availableExams, setAvailableExams] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const { data: c } = await supabase
        .from("courses")
        .select("*")
        .eq("id", courseId)
        .single();
      setCourse(c);
    } catch { setCourse(null); }
    try {
      const { data: u } = await supabase
        .from("units")
        .select("*")
        .eq("course_id", courseId)
        .order("order_index");
      setUnits(u ?? []);
      const unitIds = (u ?? []).map((x: any) => x.id);
      if (unitIds.length) {
        const { data: ch } = await supabase
          .from("chapters")
          .select("*")
          .in("unit_id", unitIds)
          .order("order_index");
        setChapters(ch ?? []);
        const chIds = (ch ?? []).map((x: any) => x.id);
        if (chIds.length) {
          const { data: lec } = await supabase
            .from("lectures")
            .select("*")
            .in("chapter_id", chIds)
            .order("order_index");
          setLectures(lec ?? []);
        } else setLectures([]);
      } else {
        setChapters([]);
        setLectures([]);
      }
      const { data: ex } = await supabase
        .from("exams")
        .select("*")
        .eq("course_id", courseId)
        .order("order_index", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      setExams(ex ?? []);
    } catch {
      setUnits([]);
      setChapters([]);
      setLectures([]);
      setExams([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [courseId]);

  const [addUnitOpen, setAddUnitOpen] = useState(false);
  const [newUnitTitle, setNewUnitTitle] = useState("");
  const [renameUnitFor, setRenameUnitFor] = useState<Unit | null>(null);
  const [renameUnitTitle, setRenameUnitTitle] = useState("");
  const [deleteUnitId, setDeleteUnitId] = useState<string | null>(null);
  const [addChapterForUnit, setAddChapterForUnit] = useState<string | null>(null);
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [renameChapterFor, setRenameChapterFor] = useState<Chapter | null>(null);
  const [renameChapterTitle, setRenameChapterTitle] = useState("");
  const [deleteChapterId, setDeleteChapterId] = useState<string | null>(null);
  const [deleteLectureId, setDeleteLectureId] = useState<string | null>(null);
  const [attachTargetChapter, setAttachTargetChapter] = useState<string | null>(null);

  const doAddUnit = async () => {
    if (!newUnitTitle.trim()) return;
    const { error } = await supabase
      .from("units")
      .insert({ course_id: courseId, title: newUnitTitle.trim(), order_index: units.length });
    if (error) { toast.error(error.message); return; }
    toast.success("تمت إضافة الوحدة"); setAddUnitOpen(false); setNewUnitTitle(""); load();
  };

  const doRenameUnit = async () => {
    if (!renameUnitFor || !renameUnitTitle.trim()) return;
    const { error } = await supabase.from("units").update({ title: renameUnitTitle.trim() }).eq("id", renameUnitFor.id);
    if (error) { toast.error(error.message); return; }
    toast.success("تم التعديل"); setRenameUnitFor(null); setRenameUnitTitle(""); load();
  };

  const doDeleteUnit = async () => {
    if (!deleteUnitId) return;
    const chs = chapters.filter((c) => c.unit_id === deleteUnitId).map((c) => c.id);
    const { error: lecErr } = chs.length ? await supabase.from("lectures").delete().in("chapter_id", chs) : { error: null };
    if (lecErr) { toast.error(lecErr.message); setDeleteUnitId(null); return; }
    const { error: chErr } = await supabase.from("chapters").delete().eq("unit_id", deleteUnitId);
    if (chErr) { toast.error(chErr.message); setDeleteUnitId(null); return; }
    const { error } = await supabase.from("units").delete().eq("id", deleteUnitId);
    if (error) { toast.error(error.message); setDeleteUnitId(null); return; }
    toast.success("تم الحذف"); setDeleteUnitId(null); load();
  };

  const doAddChapter = async () => {
    if (!addChapterForUnit || !newChapterTitle.trim()) return;
    const cnt = chapters.filter((c) => c.unit_id === addChapterForUnit).length;
    const { error } = await supabase
      .from("chapters")
      .insert({ unit_id: addChapterForUnit, title: newChapterTitle.trim(), order_index: cnt });
    if (error) { toast.error(error.message); return; }
    toast.success("تمت إضافة الفصل"); setAddChapterForUnit(null); setNewChapterTitle(""); load();
  };

  const doRenameChapter = async () => {
    if (!renameChapterFor || !renameChapterTitle.trim()) return;
    const { error } = await supabase.from("chapters").update({ title: renameChapterTitle.trim() }).eq("id", renameChapterFor.id);
    if (error) { toast.error(error.message); return; }
    toast.success("تم التعديل"); setRenameChapterFor(null); setRenameChapterTitle(""); load();
  };

  const doDeleteChapter = async () => {
    if (!deleteChapterId) return;
    const { error: lecErr } = await supabase.from("lectures").delete().eq("chapter_id", deleteChapterId);
    if (lecErr) { toast.error(lecErr.message); setDeleteChapterId(null); return; }
    const { error } = await supabase.from("chapters").delete().eq("id", deleteChapterId);
    if (error) { toast.error(error.message); setDeleteChapterId(null); return; }
    toast.success("تم الحذف"); setDeleteChapterId(null); load();
  };

  const doDeleteLecture = async () => {
    if (!deleteLectureId) return;
    const { error } = await supabase.from("lectures").delete().eq("id", deleteLectureId);
    if (error) { toast.error(error.message); setDeleteLectureId(null); return; }
    toast.success("تم الحذف"); setDeleteLectureId(null); load();
  };

  const loadAvailable = async () => {
    const { data } = await supabase
      .from("exams")
      .select("id, title, type")
      .is("course_id", null)
      .order("title");
    setAvailableExams(data ?? []);
  };

  const attachExam = async (examId: string) => {
    const firstLec = attachTargetChapter
      ? lectures.find((l) => l.chapter_id === attachTargetChapter)
      : null;
    const { error } = await supabase.from("exams").update({
      course_id: courseId,
      lecture_id: firstLec?.id ?? null,
      order_index: firstLec ? 0 : null,
    }).eq("id", examId);
    if (error) { toast.error(error.message); return; }
    toast.success("تم إضافة الامتحان إلى الكورس");
    setAttachOpen(false);
    setAttachTargetChapter(null);
    load();
  };

  const detachExam = async (examId: string) => {
    const { error } = await supabase.from("exams").update({ course_id: null, lecture_id: null, order_index: null }).eq("id", examId);
    if (error) { toast.error(error.message); return; }
    toast.success("تم إزالة الامتحان من الكورس");
    load();
  };

  const setExamPosition = async (examId: string, lectureId: string | null, orderIdx: number) => {
    const { error } = await supabase.from("exams").update({ lecture_id: lectureId || null, order_index: orderIdx }).eq("id", examId);
    if (error) { toast.error(error.message); return; }
    toast.success("تم تحديث مكان الامتحان");
    load();
  };

  const examsByLecture = useMemo(() => {
    const map = new Map<string, any[]>();
    exams.forEach((e: any) => {
      if (!e.lecture_id) return;
      const arr = map.get(e.lecture_id) ?? [];
      arr.push(e);
      map.set(e.lecture_id, arr);
    });
    return map;
  }, [exams]);

  const standaloneExams = useMemo(() =>
    exams.filter((e: any) => !e.lecture_id),
  [exams]);

  if (loading) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!course) return <div>الكورس غير موجود</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link
            to="/admin/courses"
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <ArrowRight className="h-4 w-4" />
            عودة للكورسات
          </Link>
          <h1 className="text-2xl md:text-3xl font-display font-bold mt-2">
            {course.title}
          </h1>
        </div>
      </div>

      <Tabs defaultValue="content">
        <TabsList>
          <TabsTrigger value="content">المحتوى</TabsTrigger>
          <TabsTrigger value="lessons">الحصص</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
              إدارة الوحدات والفصول والمحاضرات
            </p>
            <Dialog open={addUnitOpen} onOpenChange={(o) => { setAddUnitOpen(o); if (!o) setNewUnitTitle(""); }}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 ml-1" /> وحدة جديدة</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>وحدة جديدة</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>اسم الوحدة</Label><Input value={newUnitTitle} onChange={(e) => setNewUnitTitle(e.target.value)} /></div>
                </div>
                <DialogFooter>
                  <Button onClick={doAddUnit}>إضافة</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {units.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-12 text-center">
                <BookOpen className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">
                  لا توجد وحدات بعد. ابدأ بإضافة أول وحدة.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Accordion type="multiple" className="space-y-3">
              {units.map((u) => {
                const unitChapters = chapters.filter((c) => c.unit_id === u.id);
                return (
                  <AccordionItem
                    key={u.id}
                    value={u.id}
                    className="border bg-card rounded-xl px-4"
                  >
                    <div className="flex items-center gap-2 py-2">
                      <AccordionTrigger className="flex-1 hover:no-underline">
                        <div className="flex items-center gap-2 text-right">
                          <span className="font-semibold">{u.title}</span>
                          <Badge variant="secondary">
                            {unitChapters.length} فصل
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <Dialog open={renameUnitFor?.id === u.id} onOpenChange={(o) => { if (!o) setRenameUnitFor(null); }}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="ghost" onClick={() => { setRenameUnitFor(u); setRenameUnitTitle(u.title); }}><Pencil className="h-4 w-4" /></Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>تعديل اسم الوحدة</DialogTitle></DialogHeader>
                          <div><Label>الاسم</Label><Input value={renameUnitTitle} onChange={(e) => setRenameUnitTitle(e.target.value)} /></div>
                          <DialogFooter><Button onClick={doRenameUnit}>حفظ</Button></DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <AlertDialog open={deleteUnitId === u.id} onOpenChange={(o) => { if (!o) setDeleteUnitId(null); }}>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteUnitId(u.id)}><Trash2 className="h-4 w-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>حذف الوحدة؟</AlertDialogTitle><AlertDialogDescription>سيتم حذف الوحدة وكل فصولها ومحاضراتها. لا يمكن التراجع.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction onClick={doDeleteUnit}>حذف</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    <AccordionContent>
                      <div className="space-y-3 pt-2">
                        <Dialog open={addChapterForUnit === u.id} onOpenChange={(o) => { if (!o) setAddChapterForUnit(null); }}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" onClick={() => setAddChapterForUnit(u.id)}>
                              <Plus className="h-4 w-4 ml-1" /> فصل جديد
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader><DialogTitle>فصل جديد</DialogTitle></DialogHeader>
                            <div><Label>اسم الفصل</Label><Input value={newChapterTitle} onChange={(e) => setNewChapterTitle(e.target.value)} /></div>
                            <DialogFooter><Button onClick={doAddChapter}>إضافة</Button></DialogFooter>
                          </DialogContent>
                        </Dialog>
                        {unitChapters.map((ch) => {
                          const chLectures = lectures.filter(
                            (l) => l.chapter_id === ch.id,
                          );
                          return (
                            <Card key={ch.id} className="border-border/60">
                              <CardHeader className="flex flex-row items-center gap-2 py-3">
                                <CardTitle className="text-base flex-1">
                                  {ch.title}
                                </CardTitle>
                                <Badge variant="outline">
                                  {chLectures.length} محاضرة
                                </Badge>
                                <Dialog open={renameChapterFor?.id === ch.id} onOpenChange={(o) => { if (!o) setRenameChapterFor(null); }}>
                                  <DialogTrigger asChild>
                                    <Button size="sm" variant="ghost" onClick={() => { setRenameChapterFor(ch); setRenameChapterTitle(ch.title); }}><Pencil className="h-4 w-4" /></Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader><DialogTitle>تعديل اسم الفصل</DialogTitle></DialogHeader>
                                    <div><Label>الاسم</Label><Input value={renameChapterTitle} onChange={(e) => setRenameChapterTitle(e.target.value)} /></div>
                                    <DialogFooter><Button onClick={doRenameChapter}>حفظ</Button></DialogFooter>
                                  </DialogContent>
                                </Dialog>
                                <AlertDialog open={deleteChapterId === ch.id} onOpenChange={(o) => { if (!o) setDeleteChapterId(null); }}>
                                  <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteChapterId(ch.id)}><Trash2 className="h-4 w-4" /></Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>حذف الفصل؟</AlertDialogTitle><AlertDialogDescription>سيتم حذف الفصل وكل محاضراته.</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                      <AlertDialogAction onClick={doDeleteChapter}>حذف</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </CardHeader>
                              <CardContent className="space-y-2 pt-0">
                                {chLectures.map((l) => (
                                  <div key={l.id}>
                                    <div className="flex items-center gap-2 p-2 rounded-lg border bg-muted/30">
                                      <Video className="h-4 w-4 text-primary" />
                                      <span className="flex-1 text-sm font-medium">
                                        {l.title}
                                      </span>
                                      {l.is_free && (
                                        <Badge variant="secondary">مجاني</Badge>
                                      )}
                                      {l.pdf_url && (
                                        <FileText className="h-3 w-3 text-muted-foreground" />
                                      )}
                                      <LectureDialog
                                        chapterId={ch.id}
                                        editing={l}
                                        onSaved={load}
                                      />
                                      <AlertDialog open={deleteLectureId === l.id} onOpenChange={(o) => { if (!o) setDeleteLectureId(null); }}>
                                        <AlertDialogTrigger asChild>
                                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteLectureId(l.id)}><Trash2 className="h-4 w-4" /></Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader><AlertDialogTitle>حذف المحاضرة؟</AlertDialogTitle><AlertDialogDescription>لا يمكن التراجع عن الحذف.</AlertDialogDescription></AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                            <AlertDialogAction onClick={doDeleteLecture}>حذف</AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </div>
                                    {(examsByLecture.get(l.id) ?? []).map((exam) => (
                                      <div key={exam.id} className="flex items-center gap-2 p-2 pr-8 rounded-lg border border-dashed border-amber-300 bg-amber-50/30">
                                        <GraduationCap className="h-4 w-4 text-amber-600" />
                                        <span className="flex-1 text-sm font-medium">{exam.title}</span>
                                        <Badge variant="outline" className="text-xs">
                                          {exam.type === "quiz" ? "اختبار" : exam.type === "final" ? "نهائي" : exam.type}
                                        </Badge>
                                        <Select defaultValue={exam.lecture_id ?? "none"} onValueChange={(v) => setExamPosition(exam.id, v === "none" ? null : v, exam.order_index ?? 0)}>
                                          <SelectTrigger className="w-40 h-7 text-xs"><SelectValue /></SelectTrigger>
                                          <SelectContent>
                                            {lectures.map((lec) => (
                                              <SelectItem key={lec.id} value={lec.id}>{lec.title}</SelectItem>
                                            ))}
                                            <SelectItem value="none">بدون — نهاية الكورس</SelectItem>
                                          </SelectContent>
                                        </Select>
                                        <Input type="number" className="w-16 h-7 text-xs" defaultValue={exam.order_index ?? 0} onBlur={(e) => setExamPosition(exam.id, exam.lecture_id, parseInt(e.target.value) || 0)} />
                                        <Button size="sm" variant="ghost" asChild>
                                          <Link to="/admin/exams/$examId" params={{ examId: exam.id }}>تعديل</Link>
                                        </Button>
                                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => detachExam(exam.id)}>إزالة</Button>
                                      </div>
                                    ))}
                                  </div>
                                ))}
                                <div className="flex gap-2">
                                  <LectureDialog chapterId={ch.id} onSaved={load} />
                                  <Button size="sm" variant="outline" onClick={() => { loadAvailable(); setAttachTargetChapter(ch.id); setAttachOpen(true); }}>
                                    <Plus className="h-4 w-4 ml-1" /> إضافة امتحان
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}

          {standaloneExams.length > 0 && (
            <div className="space-y-3 pt-4 border-t">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-amber-600" />
                الامتحانات العامة
              </h3>
              {standaloneExams.map((exam: any) => (
                <div key={exam.id} className="flex items-center gap-2 p-2 rounded-lg border border-dashed border-amber-300 bg-amber-50/30">
                  <GraduationCap className="h-4 w-4 text-amber-600" />
                  <span className="flex-1 text-sm font-medium">{exam.title}</span>
                  <Badge variant="outline" className="text-xs">
                    {exam.type === "quiz" ? "اختبار" : exam.type === "final" ? "نهائي" : exam.type}
                  </Badge>
                  <Select defaultValue="none" onValueChange={(v) => setExamPosition(exam.id, v === "none" ? null : v, exam.order_index ?? 0)}>
                    <SelectTrigger className="w-40 h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {lectures.map((lec) => (
                        <SelectItem key={lec.id} value={lec.id}>{lec.title}</SelectItem>
                      ))}
                      <SelectItem value="none">بدون — نهاية الكورس</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input type="number" className="w-16 h-7 text-xs" defaultValue={exam.order_index ?? 0} onBlur={(e) => setExamPosition(exam.id, exam.lecture_id, parseInt(e.target.value) || 0)} />
                  <Button size="sm" variant="ghost" asChild>
                    <Link to="/admin/exams/$examId" params={{ examId: exam.id }}>تعديل</Link>
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => detachExam(exam.id)}>إزالة</Button>
                </div>
              ))}
            </div>
          )}

          <Dialog open={attachOpen} onOpenChange={(o) => { if (!o) { setAttachOpen(false); setAttachTargetChapter(null); } }}>
            <DialogContent>
              <DialogHeader><DialogTitle>إضافة امتحان إلى الكورس</DialogTitle></DialogHeader>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {availableExams.length === 0 ? (
                  <p className="text-muted-foreground text-sm">لا توجد امتحانات متاحة غير مرتبطة بكورس</p>
                ) : availableExams.map((ex: any) => (
                  <div key={ex.id} className="flex items-center justify-between p-2 rounded border">
                    <div>
                      <p className="text-sm font-medium">{ex.title}</p>
                      <Badge variant="outline" className="text-xs mt-1">
                        {ex.type === "quiz" ? "اختبار" : ex.type === "final" ? "نهائي" : ex.type}
                      </Badge>
                    </div>
                    <Button size="sm" onClick={() => attachExam(ex.id)}>إضافة</Button>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="lessons" className="mt-4">
          <LessonsTab courseId={courseId} course={course} />
        </TabsContent>

      </Tabs>
    </div>
  );
}

function LectureDialog({
  chapterId,
  editing,
  onSaved,
}: {
  chapterId: string;
  editing?: Lecture;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(editing?.title ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [provider, setProvider] = useState<string>(editing?.video_provider ?? "bunny");
  const [videoId, setVideoId] = useState(editing?.video_id ?? "");
  const [videoUrl, setVideoUrl] = useState(editing?.video_url ?? "");
  const [pdfUrl, setPdfUrl] = useState(editing?.pdf_url ?? "");
  const [isFree, setIsFree] = useState(editing?.is_free ?? false);
  const [unlock, setUnlock] = useState<number>(editing?.unlock_score_percent ?? 0);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const uploadPdf = async (file: File) => {
    setUploading(true);
    try { const r = await uploadToCloudinary(file, "lecture-pdfs"); setPdfUrl(r.secure_url); } catch (e: any) { toast.error(e?.message); }
    setUploading(false);
    if (pdfInputRef.current) pdfInputRef.current.value = "";
  };

  const save = async () => {
    if (!title.trim()) return toast.error("اكتب اسم المحاضرة");
    setSaving(true);
    const payload = {
      chapter_id: chapterId,
      title: title.trim(),
      description: description || null,
      video_provider: provider as "bunny" | "vdocipher" | "youtube",
      video_id: videoId || null,
      video_url: videoUrl || null,
      pdf_url: pdfUrl || null,
      is_free: isFree,
      unlock_score_percent: Number(unlock) || 0,
    };
    if (editing) {
      const { error } = await supabase
        .from("lectures")
        .update(payload)
        .eq("id", editing.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("تم الحفظ");
    } else {
      const { error } = await supabase.from("lectures").insert(payload);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("تمت إضافة المحاضرة");
    }
    setSaving(false);
    setOpen(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {editing ? (
          <Button size="sm" variant="ghost">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="w-full">
            <Plus className="h-4 w-4 ml-1" />
            محاضرة جديدة
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "تعديل محاضرة" : "محاضرة جديدة"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>عنوان المحاضرة *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>الوصف</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>مزود الفيديو</Label>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bunny">Bunny Stream</SelectItem>
                  <SelectItem value="vdocipher">VdoCipher</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{provider === "bunny" ? "رابط أو معرف باني" : "Video ID"}</Label>
              <Input
                value={videoId}
                onChange={(e) => setVideoId(e.target.value)}
                placeholder={provider === "bunny" ? "https://player.mediadelivery.net/play/... أو المعرف" : undefined}
                dir={provider === "bunny" ? "ltr" : undefined}
              />
            </div>
          </div>
          <div>
            <Label>أو رابط مباشر</Label>
            <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
          </div>
          <div>
            <Label>ملف PDF</Label>
            <Input
              ref={pdfInputRef}
              type="file"
              accept="application/pdf"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadPdf(f);
              }}
            />
            {uploading && (
              <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> جاري الرفع...
              </div>
            )}
            {pdfUrl && (
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-muted-foreground truncate flex-1">PDF: {pdfUrl}</p>
                <Button type="button" size="sm" variant="ghost" className="h-6 text-xs text-destructive" onClick={() => setPdfUrl("")}>
                  <Trash2 className="h-3 w-3 ml-1" /> إزالة
                </Button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch checked={isFree} onCheckedChange={setIsFree} />
              <Label>مجاني</Label>
            </div>
            <div className="flex-1">
              <Label>نسبة الفتح % (من المحاضرة السابقة)</Label>
              <Input
                type="number"
                value={unlock}
                onChange={(e) => setUnlock(Number(e.target.value))}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin ml-1" />}
            حفظ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type Lesson = {
  id: string;
  title: string;
  description: string | null;
  video_type: string;
  video_url: string | null;
  video_bunny_id: string | null;
  grade: string;
  is_published: boolean;
  order_index: number;
  course_id: string | null;
};

/* ───── Exams Tab ───── */

type LectureRef = { id: string; title: string; unit_title?: string; chapter_title?: string };

function ExamsTab({ courseId }: { courseId: string }) {
  const [exams, setExams] = useState<any[] | null>(null);
  const [lectures, setLectures] = useState<LectureRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [attachOpen, setAttachOpen] = useState(false);
  const [availableExams, setAvailableExams] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    const [exRes, lecRes] = await Promise.all([
      supabase
        .from("exams")
        .select("*")
        .eq("course_id", courseId)
        .order("order_index", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("lectures")
        .select("id, title, chapter_id, chapters!inner(title, unit_id, units!inner(title, order_index))")
        .eq("chapters.units.course_id", courseId)
        .order("order_index"),
    ]);
    setExams(exRes.data ?? []);
    setLectures(
      (lecRes.data ?? []).map((l: any) => ({
        id: l.id,
        title: l.title,
        chapter_title: l.chapters?.title,
        unit_title: l.chapters?.units?.title,
      }))
    );
    setLoading(false);
  };

  useEffect(() => { load(); }, [courseId]);

  const loadAvailable = async () => {
    const { data } = await supabase
      .from("exams")
      .select("id, title, type")
      .is("course_id", null)
      .order("title");
    setAvailableExams(data ?? []);
  };

  const attachExam = async (examId: string) => {
    const { error } = await supabase.from("exams").update({ course_id: courseId }).eq("id", examId);
    if (error) { toast.error(error.message); return; }
    toast.success("تم إضافة الامتحان إلى الكورس");
    setAttachOpen(false);
    load();
  };

  const detachExam = async (examId: string) => {
    const { error } = await supabase.from("exams").update({ course_id: null, lecture_id: null, order_index: null }).eq("id", examId);
    if (error) { toast.error(error.message); return; }
    toast.success("تم إزالة الامتحان من الكورس");
    load();
  };

  const setExamLecture = async (examId: string, lectureId: string | null, orderIdx: number) => {
    const { error } = await supabase.from("exams").update({ lecture_id: lectureId || null, order_index: orderIdx }).eq("id", examId);
    if (error) { toast.error(error.message); return; }
    toast.success("تم تحديث مكان الامتحان");
    load();
  };

  const groupLabel = (l: LectureRef) => {
    const parts: string[] = [];
    if (l.unit_title) parts.push(l.unit_title);
    if (l.chapter_title) parts.push(l.chapter_title);
    parts.push(l.title);
    return parts.join(" > ");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">الامتحانات المرتبطة بهذا الكورس</p>
        <Dialog open={attachOpen} onOpenChange={(o) => { setAttachOpen(o); if (o) loadAvailable(); }}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 ml-1" /> إضافة امتحان</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>إضافة امتحان موجود</DialogTitle></DialogHeader>
            <div className="space-y-3">
              {availableExams.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">لا توجد امتحانات متاحة للإضافة.</p>
              ) : (
                availableExams.map((e) => (
                  <div key={e.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{e.title}</p>
                      <Badge variant="outline" className="text-xs">{e.type === "quiz" ? "كويز" : e.type === "assignment" ? "واجب" : "شامل"}</Badge>
                    </div>
                    <Button size="sm" onClick={() => attachExam(e.id)}>إضافة</Button>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : exams?.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <GraduationCap className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">لا توجد امتحانات مرتبطة بهذا الكورس.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {exams?.map((e, idx) => (
            <Card key={e.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-primary shrink-0" />
                      <h3 className="font-bold text-sm">{e.title}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {e.type === "quiz" ? "كويز" : e.type === "assignment" ? "واجب" : "شامل"}
                      </Badge>
                      {!e.is_published && <Badge variant="outline" className="text-xs">غير منشور</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {e.duration_minutes ? `${e.duration_minutes} د` : "بدون مدة"}
                      {e.end_at ? ` · ينتهي ${new Date(e.end_at).toLocaleDateString("ar-EG")}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link to="/admin/exams/$examId" params={{ examId: e.id }}>
                        <Pencil className="h-3.5 w-3.5 ml-1" /> تعديل
                      </Link>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>إزالة الامتحان من الكورس؟</AlertDialogTitle>
                        <AlertDialogDescription>الامتحان مش هيتحذف، هيتشال من الكورس بس.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>إلغاء</AlertDialogCancel>
                          <AlertDialogAction onClick={() => detachExam(e.id)} className="bg-destructive hover:bg-destructive/90">إزالة</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                {/* Lecture selector for positioning */}
                <div className="flex items-center gap-3 pt-2 border-t">
                  <Label className="text-xs shrink-0">يظهر بعد:</Label>
                  <Select
                    value={e.lecture_id ?? "none"}
                    onValueChange={(val) => setExamLecture(e.id, val === "none" ? null : val, idx + 1)}
                  >
                    <SelectTrigger className="h-8 text-xs w-full max-w-xs">
                      <SelectValue placeholder="اختر المحاضرة ..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون — نهاية الكورس</SelectItem>
                      {lectures.map((l) => (
                        <SelectItem key={l.id} value={l.id}>{groupLabel(l)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-1 mr-auto">
                    <Label className="text-xs shrink-0">الترتيب:</Label>
                    <Input
                      type="number"
                      min={1}
                      className="h-8 w-16 text-xs"
                      value={e.order_index ?? idx + 1}
                      onChange={(ev) => {
                        const v = parseInt(ev.target.value, 10);
                        if (!isNaN(v)) setExamLecture(e.id, e.lecture_id, v);
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───── Lessons Tab ───── */

function LessonsTab({ courseId, course }: { courseId: string; course: Course }) {
  const [lessons, setLessons] = useState<Lesson[] | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Lesson | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("lessons")
      .select("*")
      .eq("course_id", courseId)
      .order("order_index")
      .order("created_at", { ascending: false });
    setLessons((data ?? []) as Lesson[]);
  };

  useEffect(() => { load(); }, [courseId]);

  const onDelete = async (id: string) => {
    const { error } = await supabase.from("lessons").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("تم حذف الحصة");
    load();
  };

  const togglePublish = async (l: Lesson) => {
    const { error } = await supabase.from("lessons").update({ is_published: !l.is_published }).eq("id", l.id);
    if (error) return toast.error(error.message);
    load();
  };

  const [assignOpen, setAssignOpen] = useState(false);
  const [unassigned, setUnassigned] = useState<Lesson[] | null>(null);

  const loadUnassigned = async () => {
    const { data } = await supabase
      .from("lessons")
      .select("*")
      .is("course_id", null)
      .order("title");
    setUnassigned(data ?? []);
  };

  const assignLesson = async (lessonId: string) => {
    const { error } = await supabase.from("lessons").update({ course_id: courseId }).eq("id", lessonId);
    if (error) return toast.error(error.message);
    toast.success("تم إضافة الحصة إلى الكورس");
    setAssignOpen(false);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" onClick={() => { loadUnassigned(); }}>
              <Plus className="h-4 w-4 ml-1" /> إضافة حصة موجودة
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة حصة موجودة</DialogTitle>
              <DialogDescription>
                اختر حصة من الحصص غير المرتبطة بأي كورس
              </DialogDescription>
            </DialogHeader>
            {unassigned === null ? (
              <div className="grid place-items-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : unassigned.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">لا توجد حصص غير مرتبطة</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {unassigned.map((l) => (
                  <div key={l.id} className="flex items-center justify-between border rounded-lg p-3">
                    <div>
                      <p className="font-medium">{l.title}</p>
                      <p className="text-xs text-muted-foreground">{l.grade}</p>
                    </div>
                    <Button size="sm" onClick={() => assignLesson(l.id)}>إضافة</Button>
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(null)}><Plus className="h-4 w-4 ml-1" /> حصة جديدة</Button>
          </DialogTrigger>
          <CourseLessonDialog
            key={editing?.id ?? "new"}
            courseId={courseId}
            course={course}
            editing={editing}
            onSaved={() => { setDialogOpen(false); setEditing(null); load(); }}
          />
        </Dialog>
      </div>

      {lessons === null ? (
        <div className="grid place-items-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : lessons.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <PlayCircle className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">لا توجد حصص في هذا الكورس. أضف أول حصة الآن.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lessons.map((l) => (
            <Card key={l.id} className="overflow-hidden border-border/60">
              <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary-glow/20 relative grid place-items-center">
                {l.video_type === "bunny" ? (
                  <Link2 className="h-12 w-12 text-primary/40" />
                ) : l.video_type === "youtube" && l.video_url ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${extractYouTubeId(l.video_url)}`}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : l.video_url ? (
                  <video controls src={l.video_url?.startsWith("http") ? l.video_url : supabase.storage.from("lesson-media").getPublicUrl(l.video_url).data.publicUrl} className="w-full h-full object-cover" />
                ) : (
                  <Video className="h-12 w-12 text-primary/40" />
                )}
                <div className="absolute top-2 right-2 flex gap-1">
                  <Badge variant={l.is_published ? "default" : "secondary"}>
                    {l.is_published ? "منشور" : "مسودة"}
                  </Badge>
                </div>
              </div>
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold line-clamp-1">{l.title}</h3>
                <div className="flex items-center gap-1 pt-2 border-t">
                  <Button size="sm" variant="ghost" onClick={() => togglePublish(l)}>
                    {l.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(l); setDialogOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>حذف الحصة؟</AlertDialogTitle><AlertDialogDescription>لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDelete(l.id)}>حذف</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CourseLessonDialog({
  courseId, course, editing, onSaved,
}: {
  courseId: string;
  course: Course;
  editing: Lesson | null;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(editing?.title ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [videoType, setVideoType] = useState(editing?.video_type ?? "upload");
  const [videoUrl, setVideoUrl] = useState(editing?.video_url ?? "");
  const [videoBunnyId, setVideoBunnyId] = useState(editing?.video_bunny_id ?? "");
  const [isPublished, setIsPublished] = useState(editing?.is_published ?? false);
  const [saving, setSaving] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  const handleVideoUpload = async (file: File) => {
    if (file.size > 200 * 1024 * 1024) { toast.error("الحجم أكبر من 200MB"); return; }
    setUploadingVideo(true);
    try { const r = await uploadToCloudinary(file, "lesson-media"); setVideoUrl(r.secure_url); toast.success("تم رفع الفيديو"); } catch (e: any) { toast.error(e?.message); }
    setUploadingVideo(false);
  };

  const save = async () => {
    if (!title.trim()) return toast.error("اكتب اسم الحصة");
    if (videoType === "upload" && !videoUrl) return toast.error("ارفع فيديو من الجهاز");
    if (videoType === "bunny" && !videoBunnyId.trim()) return toast.error("اكتب رابط باني");
    if (videoType === "youtube" && !videoUrl.trim()) return toast.error("اكتب رابط يوتيوب");
    setSaving(true);
    const payload: Record<string, any> = {
      title: title.trim(),
      description: description || null,
      video_type: videoType,
      video_url: videoType === "upload" || videoType === "youtube" ? (videoUrl || null) : null,
      video_bunny_id: videoType === "bunny" ? (videoBunnyId.trim() || null) : null,
      grade: course.grade ?? "أولى ثانوي",
      is_published: isPublished,
      course_id: courseId,
    };

    if (editing) {
      delete payload.course_id;
      const { error } = await supabase.from("lessons").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase.from("lessons").insert(payload);
      if (error) { toast.error(error.message); setSaving(false); return; }
    }

    toast.success(editing ? "اتحفظت" : "تم إنشاء الحصة");
    setSaving(false);
    onSaved();
  };

  const uploadVideoUrl = videoUrl && videoType === "upload"
    ? (videoUrl.startsWith("http") ? videoUrl : supabase.storage.from("lesson-media").getPublicUrl(videoUrl).data.publicUrl)
    : null;

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{editing ? "تعديل الحصة" : "حصة جديدة"}</DialogTitle>
        <DialogDescription>أضف حصة فيديو لهذا الكورس.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label>اسم الحصة *</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label>الوصف</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>الصف</Label>
            <Input value={course.grade ?? "أولى ثانوي"} disabled />
          </div>
          <div>
            <Label>نوع الفيديو</Label>
            <Select value={videoType} onValueChange={setVideoType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="upload"><div className="flex items-center gap-2"><Upload className="h-4 w-4" /> رفع من الجهاز</div></SelectItem>
                <SelectItem value="bunny"><div className="flex items-center gap-2"><Link2 className="h-4 w-4" /> رابط باني</div></SelectItem>
                <SelectItem value="youtube"><div className="flex items-center gap-2"><Video className="h-4 w-4" /> يوتيوب</div></SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {videoType === "upload" ? (
          <div>
            <Label>رفع فيديو *</Label>
            <div className="flex items-center gap-3 mt-1">
              {uploadVideoUrl && (
                <video controls src={uploadVideoUrl} className="h-20 w-32 object-cover rounded border" />
              )}
              <Input type="file" accept="video/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleVideoUpload(f); }} />
              {uploadingVideo && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
          </div>
        ) : videoType === "youtube" ? (
          <div>
            <Label>رابط يوتيوب *</Label>
            <Input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              dir="ltr"
            />
            {videoUrl && (
              <div className="mt-2 aspect-video rounded overflow-hidden border">
                <iframe
                  src={`https://www.youtube.com/embed/${extractYouTubeId(videoUrl)}`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
          </div>
        ) : (
          <div>
            <Label>رابط باني *</Label>
            <Input value={videoBunnyId} onChange={(e) => setVideoBunnyId(e.target.value)} placeholder="https://player.mediadelivery.net/play/... أو المعرف" dir="ltr" />
          </div>
        )}

        <div className="flex items-center gap-2">
          <Switch checked={isPublished} onCheckedChange={setIsPublished} />
          <Label>منشور</Label>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={save} disabled={saving || uploadingVideo}>
          {(saving || uploadingVideo) && <Loader2 className="h-4 w-4 animate-spin ml-1" />} حفظ
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
